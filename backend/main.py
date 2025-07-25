from fastapi import FastAPI, Body, HTTPException, status, Request, Query
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
import os
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
import requests

from database import template_collection, submission_collection, response_collection, template_version_collection, app_team_template_collection, fillername_submission_collection
from models import TemplateModel, SubmissionModel, ResponseModel, TemplateVersionModel

# import logging
# logging.basicConfig(level=logging.DEBUG)
# logger = logging.getLogger(__name__)


app = FastAPI(title="Form Template & Submission API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("=== FASTAPI SERVER STARTED ===", flush=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Helper Functions ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def to_bool(val):
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() == 'true'
    if isinstance(val, int):
        return val == 1
    return False

def normalize_field_booleans(schema):
    return schema

def serialize_mongo(obj):
    if isinstance(obj, list):
        return [serialize_mongo(i) for i in obj]
    if isinstance(obj, dict):
        return {str(k): serialize_mongo(v) for k, v in obj.items()}
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    if isinstance(obj, ObjectId):
        return str(obj)
    return obj

# --- Template Endpoints ---
@app.post("/templates/", response_description="Add new template", response_model=TemplateModel)
async def create_template(template: TemplateModel = Body(...)):
    # Always save as schemaname_v1
    base_name = template.name
    versioned_name = f"{base_name}_v1"
    if await template_collection.find_one({"name": versioned_name}):
        raise HTTPException(status_code=409, detail=f"Template with name {versioned_name} already exists.")
    encoded_template = jsonable_encoder(template)
    if "_id" in encoded_template and not encoded_template["_id"]:
        del encoded_template["_id"]
    # Remove lock-related fields if present
    encoded_template.pop("is_locked", None)
    encoded_template.pop("lock_password", None)
    encoded_template["name"] = versioned_name
    encoded_template["version"] = 1
    encoded_template["created_at"] = datetime.datetime.utcnow()
    encoded_template["updated_at"] = datetime.datetime.utcnow()
    # Ensure author, team_name, and version_tag are present
    encoded_template["author"] = template.author if hasattr(template, 'author') else None
    encoded_template["team_name"] = template.team_name if hasattr(template, 'team_name') else None
    encoded_template["version_tag"] = template.version_tag if hasattr(template, 'version_tag') else None
    # Normalize booleans in schema
    encoded_template["schema"] = normalize_field_booleans(encoded_template.get("schema", {}))
    new_template = await template_collection.insert_one(encoded_template)
    
    # Also create the first version in history
    version_data = TemplateVersionModel(
        template_name=versioned_name,
        version=1,
        schema=encoded_template["schema"],
        change_log="Initial version."
    )
    version_data_dict = jsonable_encoder(version_data)
    version_data_dict.pop('_id', None)
    await template_version_collection.insert_one(version_data_dict)

    created_template = await template_collection.find_one({"_id": new_template.inserted_id})
    return serialize_mongo(created_template)

@app.get("/submissions/search-by-filler", response_description="Search submissions by filler name")
async def search_submissions_by_filler(fillerName: str = Query(..., description="Filler name to search for")):
    # print("=== ENTERED /submissions/search-by-filler ENDPOINT ===", flush=True)
    # print(f"[DEBUG-search] fillerName param type: {type(fillerName)}, value: {fillerName}", flush=True)
    # print("[DEBUG-search] /submissions/search-by-filler endpoint called", flush=True)
    # print(f"[DEBUG-search] Using DB: {submission_collection.database.name}, Collection count: {await submission_collection.count_documents({})}", flush=True)
    query = {"$or": [
        {"fillerName": {"$regex": fillerName, "$options": "i"}},
        {"fillername": {"$regex": fillerName, "$options": "i"}}
    ]}
    # print(f"[DEBUG-search] Search query: {query}", flush=True)
    submissions = await submission_collection.find(query).to_list(1000)
    # print(f"[DEBUG-search] Number of results: {len(submissions)}", flush=True)
    #if submissions:
    #    print(f"[DEBUG-search] First submission: {submissions[0]}", flush=True)
    return [serialize_mongo(sub) for sub in submissions]

@app.get("/templates/", response_description="List all templates")
async def list_templates(team_name: str = Query(None)):
    query = {}
    if team_name:
        # Use case-insensitive substring matching for team_name
        query["team_name"] = {"$regex": team_name, "$options": "i"}
    templates = await template_collection.find(query).to_list(1000)
    result = []
    for t in templates:
        schema = t.get("schema", {})
        description = schema.get("description", "") if isinstance(schema, dict) else ""
        audit_pipeline = schema.get("audit_pipeline", "") if isinstance(schema, dict) else ""
        result.append({
            "name": t.get("name"),
            "description": description,
            "created_at": t.get("created_at"),
            "author": t.get("author", None),
            "team_name": t.get("team_name", None),
            "version_tag": t.get("version_tag", None),
            "audit_pipeline": audit_pipeline
        })
    return serialize_mongo(result)

@app.get("/templates/{name}", response_description="Get a single template")
async def get_template(name: str):
    template = await template_collection.find_one({"name": name})
    if template is not None:
        template.pop("lock_password", None)
        return serialize_mongo(template)
    raise HTTPException(status_code=404, detail=f"Template {name} not found")

class UpdateTemplateRequest(BaseModel):
    schema: Dict[str, Any]
    change_log: Optional[str] = "No change log provided."

@app.put("/templates/{name}", response_description="Update a template")
async def edit_template(name: str, req: UpdateTemplateRequest = Body(...)):
    existing_template = await template_collection.find_one({"name": name})
    if not existing_template:
        # If not found, create new template with version 1 and name_v1
        versioned_name = f"{name}_v1"
        new_template = {
            "name": versioned_name,
            "schema": normalize_field_booleans(req.schema),
            "version": 1,
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow(),
            "team_name": req.schema.get("team_name") if isinstance(req.schema, dict) else None,
            "version_tag": req.schema.get("version_tag") if isinstance(req.schema, dict) else None
        }
        await template_collection.insert_one(new_template)
        # Also create first version in history
        version_data = TemplateVersionModel(
            template_name=versioned_name,
            version=1,
            schema=new_template["schema"],
            change_log=req.change_log or "Initial version.",
            created_at=new_template["created_at"]
        )
        version_data_dict = jsonable_encoder(version_data)
        version_data_dict.pop('_id', None)
        await template_version_collection.insert_one(version_data_dict)
        return serialize_mongo(new_template)

    # Save current state to version history
    version_data = TemplateVersionModel(
        template_name=existing_template["name"],
        version=existing_template.get("version", 1),
        schema=existing_template.get("schema"),
        change_log=req.change_log,
        created_at=existing_template.get("updated_at")
    )
    version_data_dict = jsonable_encoder(version_data)
    version_data_dict.pop('_id', None)
    await template_version_collection.insert_one(version_data_dict)
    # Update the template in place (do not change name or version)
    update_data = {
        "schema": normalize_field_booleans(req.schema),
        "updated_at": datetime.datetime.utcnow()
    }
    # --- Add version_tag update logic ---
    if req.schema.get("version_tag"):
        update_data["version_tag"] = req.schema["version_tag"]
    elif req.schema.get("version"):
        update_data["version_tag"] = req.schema["version"]
    # --- Add author and team_name update logic ---
    if req.schema.get("author"):
        update_data["author"] = req.schema["author"]
    if req.schema.get("team_name"):
        update_data["team_name"] = req.schema["team_name"]
    await template_collection.update_one({"_id": existing_template["_id"]}, {"$set": update_data})
    updated_template = await template_collection.find_one({"_id": existing_template["_id"]})
    updated_template.pop("lock_password", None)
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
    
    # Remove lock-related fields
    original_template.pop('is_locked', None)
    original_template.pop('lock_password', None)

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
    new_template_data["version"] = 1

    await template_collection.insert_one(new_template_data)
    
    # Also create the first version in history for the duplicated template
    version_data = TemplateVersionModel(
        template_name=new_name,
        version=1,
        schema=new_template_data.get("schema"),
        change_log="Duplicated from " + name
    )
    version_data_dict = jsonable_encoder(version_data)
    version_data_dict.pop('_id', None)
    await template_version_collection.insert_one(version_data_dict)
    
    return {"message": f"Template duplicated as '{new_name}'.", "name": new_name}

# --- Template Versioning Endpoints ---
@app.get("/templates/{name}/history", response_description="Get template version history")
async def get_template_history(name: str):
    history = await template_version_collection.find({"template_name": name}).sort("version", -1).to_list(1000)
    return serialize_mongo(history)

@app.post("/templates/{name}/rollback/{version}", response_description="Rollback a template to a specific version")
async def rollback_template(name: str, version: int):
    # Try to find the version with the exact name first
    template_to_restore = await template_version_collection.find_one({
        "template_name": name,
        "version": version
    })
    # If not found, try matching base name (strip _vN)
    if not template_to_restore:
        import re
        base_match = re.match(r"^(.*?)(_v\\d+)?$", name)
        base_name = base_match.group(1) if base_match else name
        template_to_restore = await template_version_collection.find_one({
            "template_name": base_name,
            "version": version
        })
    if not template_to_restore:
        raise HTTPException(status_code=404, detail=f"Version {version} for template '{name}' not found.")

    current_template = await template_collection.find_one({"name": name})
    if not current_template:
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found.")

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
        "schema": normalize_field_booleans(template_to_restore.get("schema")),
        "version": new_version_num,
        "updated_at": datetime.datetime.utcnow(),
    }
    await template_collection.update_one({"name": name}, {"$set": update_data})
    
    # Add a log entry for the rollback itself
    rollback_log_entry = TemplateVersionModel(
        template_name=name,
        version=new_version_num,
        schema=normalize_field_booleans(template_to_restore.get("schema")),
        change_log=f"Rolled back to version {version}.",
    )
    rollback_log_entry_dict = jsonable_encoder(rollback_log_entry)
    rollback_log_entry_dict.pop('_id', None)
    await template_version_collection.insert_one(rollback_log_entry_dict)

    return {"message": f"Template '{name}' rolled back to version {version}. New version is {new_version_num}."}

@app.post("/templates/{name}/newversion", response_description="Create a new version of a template")
async def create_new_version(name: str, req: UpdateTemplateRequest = Body(...)):
    import re
    # Extract base name (before _vN)
    base_match = re.match(r"^(.*?)(_v\d+)?$", name)
    if base_match:
        base_name = base_match.group(1)
    else:
        base_name = name
    regex = re.compile(f"^{base_name}_v(\\d+)$")
    all_versions = await template_collection.find({"name": {"$regex": f"^{base_name}_v\\d+$"}}).to_list(1000)
    max_version = 0
    for t in all_versions:
        m = regex.match(t["name"])
        if m:
            v = int(m.group(1))
            if v > max_version:
                max_version = v
    new_version = max_version + 1
    versioned_name = f"{base_name}_v{new_version}"

    # Fetch previous version/template for metadata
    prev_template = await template_collection.find_one({"name": name})
    author = req.schema.get("author") if isinstance(req.schema, dict) and req.schema.get("author") else (prev_template.get("author") if prev_template else None)
    team_name = req.schema.get("team_name") if isinstance(req.schema, dict) and req.schema.get("team_name") else (prev_template.get("team_name") if prev_template else None)
    # --- Add version_tag update logic ---
    if req.schema.get("version_tag"):
        version_tag = req.schema["version_tag"]
    elif req.schema.get("version"):
        version_tag = req.schema["version"]
    else:
        version_tag = prev_template.get("version_tag") if prev_template else None

    new_template = {
        "name": versioned_name,
        "schema": normalize_field_booleans(req.schema),
        "version": new_version,
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow(),
        "author": author,
        "team_name": team_name,
        "version_tag": version_tag
    }
    await template_collection.insert_one(new_template)
    # Also create version in history
    version_data = TemplateVersionModel(
        template_name=versioned_name,
        version=new_version,
        schema=new_template["schema"],
        change_log=req.change_log or "Initial version.",
        created_at=new_template["created_at"]
    )
    version_data_dict = jsonable_encoder(version_data)
    version_data_dict.pop('_id', None)
    await template_version_collection.insert_one(version_data_dict)
    return {"message": f"Template '{versioned_name}' created as version {new_version}."}

# --- Submission Endpoints ---
@app.post("/submissions/{template_name}", response_description="Add new submission")
async def submit_form(template_name: str, request: Request):
    if not await template_collection.find_one({"name": template_name}):
        raise HTTPException(status_code=404, detail="Template not found.")
    submission_data = await request.json()
    filler_name = submission_data.pop("fillerName", None)
    _ = submission_data.pop("submission_name", None)
    last_submission = await submission_collection.find_one({"template_name": template_name}, sort=[("version", -1)])
    next_version = last_submission["version"] + 1 if last_submission else 1
    count = await submission_collection.count_documents({"template_name": template_name})
    submission_number = count + 1
    submission_name = f"{template_name}_{submission_number}"
    new_submission = {
        "template_name": template_name,
        "version": next_version,
        "fillerName": filler_name,
        "data": submission_data,
        "created_at": datetime.datetime.utcnow(),
        "submission_name": submission_name
    }
    await submission_collection.insert_one(jsonable_encoder(new_submission))
    # Insert into fillername_submission_collection if fillerName exists
    if filler_name:
        await fillername_submission_collection.insert_one({
            "fillerName": filler_name,
            "submission_name": submission_name,
            "template_name": template_name,
            "created_at": new_submission["created_at"],
            "data": submission_data
        })
    return {"message": f"Submission saved as version {next_version}.", "version": next_version, "submission_name": submission_name}

@app.get("/submissions/{template_name}", response_description="List all submissions for a template")
async def list_submissions(template_name: str):
    submissions = await submission_collection.find({"template_name": template_name}).sort("version", 1).to_list(1000)
    return [{"submission_name": sub.get("submission_name", f"v{sub['version']}")} for sub in submissions]

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

@app.get("/submissions/{template_name}/by-name/{submission_name}", response_description="Get a specific submission by submission_name")
async def get_submission_by_name(template_name: str, submission_name: str):
    submission = await submission_collection.find_one({"template_name": template_name, "submission_name": submission_name})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    responses = await response_collection.find({"submission_id": str(submission["_id"]), "version": submission["version"]}).to_list(1000)
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

@app.post("/submissions/{template_name}/by-name/{submission_name}/duplicate", response_description="Duplicate a submission by submission_name as a new version")
async def duplicate_submission_by_name(template_name: str, submission_name: str):
    original = await submission_collection.find_one({"template_name": template_name, "submission_name": submission_name})
    if not original:
        raise HTTPException(status_code=404, detail="Submission not found.")
    import re
    N = 1
    while True:
        existing_names = await submission_collection.find({"template_name": template_name}).to_list(1000)
        used_numbers = set()
        pattern = re.compile(rf"^{re.escape(template_name)}_(\\d+)$")
        for sub in existing_names:
            match = pattern.match(sub.get("submission_name", ""))
            if match:
                num = int(match.group(1))
                used_numbers.add(num)
        while N in used_numbers:
            N += 1
        new_submission_name = f"{template_name}_{N}"
        last_submission = await submission_collection.find_one({"template_name": template_name}, sort=[("version", -1)])
        next_version = last_submission["version"] + 1 if last_submission else 1
        new_submission = {
            "template_name": template_name,
            "version": next_version,
            "data": original["data"],
            "created_at": datetime.datetime.utcnow(),
            "submission_name": new_submission_name
        }
        try:
            await submission_collection.insert_one(jsonable_encoder(new_submission))
            break
        except Exception as e:
            if 'E11000' in str(e):  # Duplicate key error
                N += 1
                continue
            else:
                raise
    return {"message": f"Submission duplicated as {new_submission_name}.", "submission_name": new_submission_name}

@app.delete("/submissions/{template_name}/by-name/{submission_name}", response_description="Delete a specific submission by submission_name")
async def delete_submission_by_name(template_name: str, submission_name: str):
    submission = await submission_collection.find_one({"template_name": template_name, "submission_name": submission_name})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    delete_result = await submission_collection.delete_one({"_id": submission["_id"]})
    await response_collection.delete_many({"submission_id": str(submission["_id"]), "version": submission["version"]})
    # Optionally, delete from filesystem
    template_name = submission["template_name"]
    # Remove old base_match logic, use new path
    base_folder = os.path.join(os.path.dirname(__file__), "responses", template_name)
    filename = f"{submission_name}.json"
    filepath = os.path.join(base_folder, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    return {"message": f"Submission '{submission_name}' deleted."}

# --- New: Get submission by submission_name ---
@app.get("/submissions/by-name/{submission_name}", response_description="Get a submission by submission_name")
async def get_submission_by_name(submission_name: str):
    submission = await submission_collection.find_one({"submission_name": submission_name})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    # Fetch threaded responses
    responses = await response_collection.find({"submission_id": str(submission["_id"]), "version": submission["version"]}).to_list(1000)
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

# --- New: Download submission by submission_name ---
@app.get("/submissions/by-name/{submission_name}/download", response_description="Download a submission by submission_name")
async def download_submission_by_name(submission_name: str):
    submission = await submission_collection.find_one({"submission_name": submission_name})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    return serialize_mongo(submission)

# --- New: Duplicate submission by submission_name ---
@app.post("/submissions/by-name/{submission_name}/duplicate", response_description="Duplicate a submission by submission_name")
async def duplicate_submission_by_name(submission_name: str):
    original = await submission_collection.find_one({"submission_name": submission_name})
    if not original:
        raise HTTPException(status_code=404, detail="Submission not found.")
    template_name = original["template_name"]
    import re
    N = 1
    while True:
        existing_names = await submission_collection.find({"template_name": template_name}).to_list(1000)
        used_numbers = set()
        pattern = re.compile(rf"^{re.escape(template_name)}_(\\d+)$")
        for sub in existing_names:
            match = pattern.match(sub.get("submission_name", ""))
            if match:
                num = int(match.group(1))
                used_numbers.add(num)
        while N in used_numbers:
            N += 1
        new_submission_name = f"{template_name}_{N}"
        last_submission = await submission_collection.find_one({"template_name": template_name}, sort=[("version", -1)])
        next_version = last_submission["version"] + 1 if last_submission else 1
        new_submission = {
            "template_name": template_name,
            "version": next_version,
            "data": original["data"],
            "created_at": datetime.datetime.utcnow(),
            "submission_name": new_submission_name
        }
        try:
            await submission_collection.insert_one(jsonable_encoder(new_submission))
            break
        except Exception as e:
            if 'E11000' in str(e):  # Duplicate key error
                N += 1
                continue
            else:
                raise
    return {"message": f"Submission duplicated as {new_submission_name}.", "submission_name": new_submission_name}

# --- New: Delete submission by submission_name ---
@app.delete("/submissions/by-name/{submission_name}", response_description="Delete a submission by submission_name")
async def delete_submission_by_name(submission_name: str):
    submission = await submission_collection.find_one({"submission_name": submission_name})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    delete_result = await submission_collection.delete_one({"_id": submission["_id"]})
    await response_collection.delete_many({"submission_id": str(submission["_id"]), "version": submission["version"]})
    # Optionally, delete from filesystem
    template_name = submission["template_name"]
    # Remove old base_match logic, use new path
    base_folder = os.path.join(os.path.dirname(__file__), "responses", template_name)
    filename = f"{submission_name}.json"
    filepath = os.path.join(base_folder, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    return {"message": f"Submission '{submission_name}' deleted."}

# --- Application Team Template Endpoints ---
@app.post("/app-team-templates/", response_description="Add new app team template")
async def create_app_team_template(template: dict = Body(...)):
    template["created_at"] = datetime.datetime.utcnow()
    template["updated_at"] = datetime.datetime.utcnow()
    new_template = await app_team_template_collection.insert_one(template)
    created_template = await app_team_template_collection.find_one({"_id": new_template.inserted_id})
    return serialize_mongo(created_template)

@app.get("/app-team-templates/", response_description="List all app team templates")
async def list_app_team_templates():
    templates = await app_team_template_collection.find().to_list(1000)
    result = []
    for t in templates:
        result.append({
            "name": t.get("name"),
            "description": t.get("description", ""),
            "created_at": t.get("created_at"),
            "author": t.get("author", None),
            "team_name": t.get("team_name", None),
            "version_tag": t.get("version_tag", None),
            "audit_pipeline": t.get("audit_pipeline", None)
        })
    return serialize_mongo(result)

@app.get("/app-team-templates/{name}", response_description="Get a single app team template")
async def get_app_team_template(name: str):
    template = await app_team_template_collection.find_one({"name": name})
    if template is not None:
        return serialize_mongo(template)
    raise HTTPException(status_code=404, detail=f"App Team Template {name} not found")

@app.put("/app-team-templates/{name}", response_description="Update an app team template")
async def update_app_team_template(name: str, template: dict = Body(...)):
    template["updated_at"] = datetime.datetime.utcnow()
    result = await app_team_template_collection.update_one({"name": name}, {"$set": template})
    if result.modified_count == 1:
        updated_template = await app_team_template_collection.find_one({"name": name})
        return serialize_mongo(updated_template)
    raise HTTPException(status_code=404, detail=f"App Team Template {name} not found")

@app.delete("/app-team-templates/{name}", response_description="Delete an app team template")
async def delete_app_team_template(name: str):
    delete_result = await app_team_template_collection.delete_one({"name": name})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"App Team Template {name} not found")
    return JSONResponse(status_code=status.HTTP_200_OK, content={"message": f"App Team Template '{name}' deleted."})

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "YOUR_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "YOUR_CLIENT_SECRET")

@app.post("/github/oauth/callback")
async def github_oauth_callback(request: Request):
    data = await request.json()
    code = data.get("code")
    if not code:
        return {"error": "Missing code"}
    # Exchange code for access token
    resp = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
        },
    )
    token_data = resp.json()
    return token_data

