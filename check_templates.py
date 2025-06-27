#!/usr/bin/env python3
"""
Script to check the actual values stored in the database for templates.
"""

import asyncio
import motor.motor_asyncio
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection - same as backend
MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb+srv://sai3:pCoec8U4cOGUZppB@cluster0.gpxgs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS)
db = client.form_builder_db
template_collection = db.get_collection("templates")

async def check_templates():
    """Check the actual values stored in the database."""
    
    templates = await template_collection.find().to_list(1000)
    
    print(f"Found {len(templates)} templates:")
    
    for template in templates:
        print(f"\nTemplate: {template['name']}")
        print(f"  team_name: {repr(template.get('team_name'))}")
        print(f"  version_tag: {repr(template.get('version_tag'))}")
        print(f"  audit_pipeline: {repr(template.get('audit_pipeline'))}")
        print(f"  schema: {template.get('schema', {})}")

async def main():
    try:
        await check_templates()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main()) 