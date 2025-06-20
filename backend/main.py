from fastapi import FastAPI, Body, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from deepdiff import DeepDiff
import datetime
import json

from .database import template_collection, submission_collection
from .models import TemplateModel, SubmissionModel

app = FastAPI(title="Form Template & Submission API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---
def serialize_mongo(obj):
    """Recursively convert MongoDB BSON objects to JSON serializable formats."""
    if isinstance(obj, list):
        return [serialize_mongo(i) for i in obj]
    if isinstance(obj, dict):
        return {str(k): serialize_mongo(v) for k, v in obj.items()}
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    if hasattr(obj, '__str__'):
        return str(obj)
    return obj

# --- Template Endpoints ---
@app.post("/templates/", response_description="Add new template", response_model=TemplateModel)
async def create_template(template: TemplateModel = Body(...)):
    if await template_collection.find_one({"name": template.name}):
        raise HTTPException(status_code=409, detail=f"Template with name {template.name} already exists.")
    
    encoded_template = jsonable_encoder(template)
    new_template = await template_collection.insert_one(encoded_template)
    created_template = await template_collection.find_one({"_id": new_template.inserted_id})
    return TemplateModel.model_validate(created_template)

@app.get("/templates/", response_description="List all templates", response_model=List[str])
async def list_templates():
    templates = await template_collection.find().to_list(1000)
    return [template["name"] for template in templates]

@app.get("/templates/{name}", response_description="Get a single template", response_model=TemplateModel)
async def get_template(name: str):
    if (template := await template_collection.find_one({"name": name})) is not None:
        return TemplateModel.model_validate(template)
    raise HTTPException(status_code=404, detail=f"Template {name} not found")

@app.put("/templates/{name}", response_description="Update a template")
async def edit_template(name: str, template: TemplateModel = Body(...)):
    update_data = template.model_dump(by_alias=True, exclude={"id", "name"})
    update_data["updated_at"] = datetime.datetime.utcnow()

    update_result = await template_collection.update_one(
        {"name": name}, {"$set": update_data}
    )

    if update_result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Template {name} not found")
        
    updated_template = await template_collection.find_one({"name": name})
    return JSONResponse(status_code=status.HTTP_200_OK, content=TemplateModel.model_validate(updated_template).model_dump(by_alias=True))

@app.delete("/templates/{name}", response_description="Delete a template")
async def delete_template(name: str):
    delete_result = await template_collection.delete_one({"name": name})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Template {name} not found")
    # Also delete submissions for this template
    await submission_collection.delete_many({"template_name": name})
    return JSONResponse(status_code=status.HTTP_200_OK, content={"message": f"Template '{name}' and its submissions deleted."})

@app.post("/templates/{name}/duplicate", response_description="Duplicate a template")
async def duplicate_template(name: str):
    original_template = await template_collection.find_one({"name": name})
    if not original_template:
        raise HTTPException(status_code=404, detail="Template not found.")
    
    i = 1
    while True:
        new_name = f"{name}_copy{i}"
        if not await template_collection.find_one({"name": new_name}):
            break
        i += 1
        
    new_template_data = original_template
    del new_template_data["_id"]
    new_template_data["name"] = new_name
    new_template_data["created_at"] = datetime.datetime.utcnow()
    new_template_data["updated_at"] = datetime.datetime.utcnow()

    await template_collection.insert_one(new_template_data)
    return {"message": f"Template duplicated as '{new_name}'.", "name": new_name}

# --- Submission Endpoints ---
@app.post("/submissions/{template_name}", response_description="Add new submission")
async def submit_form(template_name: str, request: Request):
    if not await template_collection.find_one({"name": template_name}):
        raise HTTPException(status_code=404, detail="Template not found.")
        
    submission_data = await request.json()
    
    # Get the next version number
    last_submission = await submission_collection.find_one({"template_name": template_name}, sort=[("version", -1)])
    next_version = last_submission["version"] + 1 if last_submission else 1
    
    new_submission = {
        "template_name": template_name,
        "version": next_version,
        "data": submission_data,
        "created_at": datetime.datetime.utcnow()
    }

    await submission_collection.insert_one(jsonable_encoder(new_submission))
    return {"message": f"Submission saved as version {next_version}.", "version": next_version}

@app.get("/submissions/{template_name}", response_description="List all submissions for a template")
async def list_submissions(template_name: str):
    submissions = await submission_collection.find({"template_name": template_name}).sort("version", 1).to_list(1000)
    return [{"version": sub["version"]} for sub in submissions]

@app.get("/submissions/{template_name}/{version}", response_description="Get a specific submission")
async def get_submission(template_name: str, version: int):
    submission = await submission_collection.find_one({"template_name": template_name, "version": version})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    return serialize_mongo(submission)

@app.get("/submissions/{template_name}/diff/{v1}/{v2}", response_description="Get a diff between two submissions")
async def diff_submissions(template_name: str, v1: int, v2: int):
    sub1 = await submission_collection.find_one({"template_name": template_name, "version": v1})
    sub2 = await submission_collection.find_one({"template_name": template_name, "version": v2})

    if not sub1 or not sub2:
        raise HTTPException(status_code=404, detail="One or both submissions not found.")

    diff_obj = DeepDiff(sub1.get("data", {}), sub2.get("data", {}), view='tree')
    # Convert to JSON string and back to dict to ensure it's JSON serializable
    serializable_diff = json.loads(diff_obj.to_json())
    
    return {"diff": serializable_diff} 