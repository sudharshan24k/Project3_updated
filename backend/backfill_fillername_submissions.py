import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb://localhost:27017/")
client = MongoClient(MONGO_DETAILS)
db = client["form_builder_db"]

submissions = db["submissions"]
fillername_submissions = db["fillername_submissions"]

count = 0
for sub in submissions.find():
    data = sub.get("data", {})
    # Try to get fillerName from data.fillerName
    filler_name = data.get("fillerName")
    # If not found, try data.data.fillerName
    if not filler_name and isinstance(data, dict):
        inner_data = data.get("data")
        if isinstance(inner_data, dict):
            filler_name = inner_data.get("fillerName")
    if filler_name:
        doc = {
            "fillerName": filler_name,
            "submission_name": sub.get("submission_name"),
            "template_name": sub.get("template_name"),
            "created_at": sub.get("created_at"),
            "data": data  # Store the full data object
        }
        # Avoid duplicates
        if not fillername_submissions.find_one({"submission_name": doc["submission_name"]}):
            fillername_submissions.insert_one(doc)
            count += 1
print(f"Backfilled {count} entries into fillername_submissions.") 