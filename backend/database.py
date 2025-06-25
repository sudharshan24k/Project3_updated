from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv("MONGO_DETAILS")

client = AsyncIOMotorClient(MONGO_DETAILS)

db = client.form_builder_db

template_collection = db.get_collection("templates")
submission_collection = db.get_collection("submissions")
response_collection = db.get_collection("responses")
template_version_collection = db.get_collection("template_versions") 