from fastapi import FastAPI, Body, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from deepdiff import DeepDiff
import datetime
import json
import copy
from passlib.context import CryptContext
from pydantic import BaseModel

from database import template_collection, submission_collection, response_collection, template_version_collection
from models import TemplateModel, SubmissionModel, ResponseModel, TemplateVersionModel

app = FastAPI(title="Form Template & Submission API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Helper Functions ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

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
    if "_id" in encoded_template and not encoded_template["_id"]:
        del encoded_template["_id"]
    new_template = await template_collection.insert_one(encoded_template)
    
    # Also create the first version in history
    version_data = TemplateVersionModel(
        template_name=template.name,
        version=1,
        schema=template.schema,
        change_log="Initial version."
    )
    await template_version_collection.insert_one(jsonable_encoder(version_data))

    created_template = await template_collection.find_one({"_id": new_template.inserted_id})
    return TemplateModel.model_validate(created_template)
     
@app.get("/templates/", response_description="List all templates")
async def list_templates():
    templates = await template_collection.find().to_list(1000)
    
    result = []
    for t in templates:
        schema = t.get("schema", {})
        description = schema.get("description", "") if isinstance(schema, dict) else ""
        result.append({
            "name": t.get("name"),
            "is_locked": t.get("is_locked", False),
            "description": description,
            "created_at": t.get("created_at")
        })
    return serialize_mongo(result)

@app.get("/templates/{name}", response_description="Get a single template")
async def get_template(name: str):
    if (template := await template_collection.find_one({"name": name})) is not None:
        # Never return the password hash
        if "lock_password" in template:
            del template["lock_password"]
        return serialize_mongo(template)
    raise HTTPException(status_code=404, detail=f"Template {name} not found")

class UpdateTemplateRequest(BaseModel):
    schema: Dict[str, Any]
    change_log: Optional[str] = "No change log provided."

@app.put("/templates/{name}", response_description="Update a template")
async def edit_template(name: str, req: UpdateTemplateRequest = Body(...)):
    existing_template = await template_collection.find_one({"name": name})
    if not existing_template:
        raise HTTPException(status_code=404, detail=f"Template {name} not found")

    if existing_template.get("is_locked"):
        raise HTTPException(status_code=403, detail="Template is locked. Cannot edit.")

    current_version = existing_template.get("version", 1)
    
    # Save current state to version history
    version_data = TemplateVersionModel(
        template_name=name,
        version=current_version,
        schema=existing_template.get("schema"),
        change_log=req.change_log,
        created_at=existing_template.get("updated_at")
    )
    await template_version_collection.insert_one(jsonable_encoder(version_data))
    
    # Update the template with new schema and increment version
    new_version = current_version + 1
    update_data = {
        "schema": req.schema,
        "version": new_version,
        "updated_at": datetime.datetime.utcnow()
    }

    update_result = await template_collection.update_one(
        {"name": name}, {"$set": update_data}
    )

    if update_result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Template {name} not found")
        
    updated_template = await template_collection.find_one({"name": name})
    # Never return the password hash
    if "lock_password" in updated_template:
        del updated_template["lock_password"]
    return serialize_mongo(updated_template)

@app.delete("/templates/{name}", response_description="Delete a template")
async def delete_template(name: str):
    delete_result = await template_collection.delete_one({"name": name})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Template {name} not found")
    
    # Also delete history and submissions for this template
    await template_version_collection.delete_many({"template_name": name})
    await submission_collection.delete_many({"template_name": name})
    return JSONResponse(status_code=status.HTTP_200_OK, content={"message": f"Template '{name}', its history, and its submissions deleted."})

@app.post("/templates/{name}/duplicate", response_description="Duplicate a template")
async def duplicate_template(name: str):
    original_template = await template_collection.find_one({"name": name})
    if not original_template:
        raise HTTPException(status_code=404, detail="Template not found.")
    
    # Duplicated template should not be locked
    original_template['is_locked'] = False
    original_template['lock_password'] = None

    i = 1
    while True:
        new_name = f"{name}_copy{i}"
        if not await template_collection.find_one({"name": new_name}):
            break
        i += 1
        
    new_template_data = copy.deepcopy(original_template)
    new_template_data.pop("_id", None)
    new_template_data["name"] = new_name
    new_template_data["created_at"] = datetime.datetime.utcnow()
    new_template_data["updated_at"] = datetime.datetime.utcnow()
    new_template_data["is_locked"] = False
    new_template_data["lock_password"] = None
    new_template_data["version"] = 1

    await template_collection.insert_one(new_template_data)
    
    # Also create the first version in history for the duplicated template
    version_data = TemplateVersionModel(
        template_name=new_name,
        version=1,
        schema=new_template_data.get("schema"),
        change_log="Duplicated from " + name
    )
    await template_version_collection.insert_one(jsonable_encoder(version_data))
    
    return {"message": f"Template duplicated as '{new_name}'.", "name": new_name}

# --- Template Versioning Endpoints ---
@app.get("/templates/{name}/history", response_description="Get template version history")
async def get_template_history(name: str):
    history = await template_version_collection.find({"template_name": name}).sort("version", -1).to_list(1000)
    return serialize_mongo(history)

@app.post("/templates/{name}/rollback/{version}", response_description="Rollback a template to a specific version")
async def rollback_template(name: str, version: int):
    template_to_restore = await template_version_collection.find_one({
        "template_name": name,
        "version": version
    })
    if not template_to_restore:
        raise HTTPException(status_code=404, detail=f"Version {version} for template '{name}' not found.")

    current_template = await template_collection.find_one({"name": name})
    if not current_template:
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found.")

    if current_template.get("is_locked"):
        raise HTTPException(status_code=403, detail="Cannot roll back a locked template.")

    # Save the current state to history before rolling back
    current_version_num = current_template.get("version", 1)
    version_data = TemplateVersionModel(
        template_name=name,
        version=current_version_num,
        schema=current_template.get("schema"),
        change_log=f"Pre-rollback save of version {current_version_num}.",
        created_at=current_template.get("updated_at")
    )
    await template_version_collection.insert_one(jsonable_encoder(version_data))

    # Restore the old version
    new_version_num = current_version_num + 1
    update_data = {
        "schema": template_to_restore.get("schema"),
        "version": new_version_num,
        "updated_at": datetime.datetime.utcnow(),
    }
    await template_collection.update_one({"name": name}, {"$set": update_data})
    
    # Add a log entry for the rollback itself
    rollback_log_entry = TemplateVersionModel(
        template_name=name,
        version=new_version_num,
        schema=template_to_restore.get("schema"),
        change_log=f"Rolled back to version {version}.",
    )
    await template_version_collection.insert_one(jsonable_encoder(rollback_log_entry))

    return {"message": f"Template '{name}' rolled back to version {version}. New version is {new_version_num}."}

# --- Template Locking Endpoints ---
@app.post("/templates/{name}/lock", response_description="Lock a template")
async def lock_template(name: str, request: Request):
    data = await request.json()
    password = data.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required to lock a template.")

    hashed_password = get_password_hash(password)
    update_result = await template_collection.update_one(
        {"name": name},
        {"$set": {"is_locked": True, "lock_password": hashed_password}}
    )
    if update_result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Template {name} not found")
    return {"message": f"Template '{name}' locked successfully."}

@app.post("/templates/{name}/unlock", response_description="Unlock a template")
async def unlock_template(name: str, request: Request):
    data = await request.json()
    password = data.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required to unlock a template.")
    
    template = await template_collection.find_one({"name": name})
    if not template:
        raise HTTPException(status_code=404, detail=f"Template {name} not found")
    
    if not template.get("is_locked"):
        return {"message": "Template is not locked."}

    if not verify_password(password, template.get("lock_password")):
        raise HTTPException(status_code=401, detail="Invalid password.")

    update_result = await template_collection.update_one(
        {"name": name},
        {"$set": {"is_locked": False, "lock_password": None}}
    )
    if update_result.matched_count == 0:
        # This case is unlikely if the find_one above succeeded, but good practice
        raise HTTPException(status_code=404, detail=f"Template {name} not found")
    return {"message": f"Template '{name}' unlocked successfully."}

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
    # Fetch threaded responses
    responses = await response_collection.find({"submission_id": str(submission["_id"]), "version": version}).to_list(1000)
    def build_thread(parent_id=None):
        thread = []
        for resp in responses:
            if resp.get("parent_id") == parent_id:
                children = build_thread(str(resp["_id"]))
                resp["children"] = children
                thread.append(resp)
        return thread
    submission["responses"] = build_thread(None)
    return serialize_mongo(submission)

@app.post("/submissions/{template_name}/{version}/responses", response_description="Add a threaded response to a submission/version")
async def add_response(template_name: str, version: int, request: Request):
    submission = await submission_collection.find_one({"template_name": template_name, "version": version})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    data = await request.json()
    response_doc = {
        "submission_id": str(submission["_id"]),
        "version": version,
        "parent_id": data.get("parent_id"),
        "author": data.get("author"),
        "content": data["content"],
        "created_at": datetime.datetime.utcnow(),
    }
    result = await response_collection.insert_one(response_doc)
    response_doc["_id"] = result.inserted_id
    return serialize_mongo(response_doc)

@app.get("/submissions/{template_name}/{version}/responses", response_description="Get all threaded responses for a submission/version")
async def get_responses(template_name: str, version: int):
    submission = await submission_collection.find_one({"template_name": template_name, "version": version})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    responses = await response_collection.find({"submission_id": str(submission["_id"]), "version": version}).to_list(1000)
    def build_thread(parent_id=None):
        thread = []
        for resp in responses:
            if resp.get("parent_id") == parent_id:
                children = build_thread(str(resp["_id"]))
                resp["children"] = children
                thread.append(resp)
        return thread
    return build_thread(None)

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

# --- Duplicate Submission Endpoint ---
@app.post("/submissions/{template_name}/{version}/duplicate", response_description="Duplicate a submission version as a new version")
async def duplicate_submission(template_name: str, version: int):
    # Find the original submission
    original = await submission_collection.find_one({"template_name": template_name, "version": version})
    if not original:
        raise HTTPException(status_code=404, detail="Submission not found.")
    # Get the next version number
    last_submission = await submission_collection.find_one({"template_name": template_name}, sort=[("version", -1)])
    next_version = last_submission["version"] + 1 if last_submission else 1
    # Prepare the new submission data (copy data, new version, new created_at)
    new_submission = {
        "template_name": template_name,
        "version": next_version,
        "data": original["data"],
        "created_at": datetime.datetime.utcnow()
    }
    await submission_collection.insert_one(jsonable_encoder(new_submission))
    return {"message": f"Submission duplicated as version {next_version}.", "version": next_version}

@app.delete("/submissions/{template_name}/{version}", response_description="Delete a specific submission version")
async def delete_submission_version(template_name: str, version: int):
    delete_result = await submission_collection.delete_one({"template_name": template_name, "version": version})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission version not found.")
    # Optionally, also delete responses for this submission version
    await response_collection.delete_many({"version": version, "submission_id": {"$exists": True}})
    return {"message": f"Submission version {version} deleted."} 