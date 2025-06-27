#!/usr/bin/env python3
"""
Script to update existing templates in the database that have "None" values
for team_name, version_tag, and audit_pipeline fields.
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime

# MongoDB connection
client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
db = client.form_templates
template_collection = db.templates

async def update_existing_templates():
    """Update existing templates that have 'None' values for missing fields."""
    
    # Find templates with "None" values for team_name, version_tag, or audit_pipeline
    query = {
        "$or": [
            {"team_name": "None"},
            {"version_tag": "None"},
            {"audit_pipeline": "None"}
        ]
    }
    
    templates_to_update = await template_collection.find(query).to_list(1000)
    
    print(f"Found {len(templates_to_update)} templates to update:")
    
    for template in templates_to_update:
        print(f"  - {template['name']}")
        
        # Update fields to null instead of "None" string
        update_data = {}
        
        if template.get('team_name') == 'None':
            update_data['team_name'] = None
            
        if template.get('version_tag') == 'None':
            update_data['version_tag'] = None
            
        if template.get('audit_pipeline') == 'None':
            update_data['audit_pipeline'] = None
            
        if update_data:
            await template_collection.update_one(
                {"_id": template["_id"]},
                {"$set": update_data}
            )
            print(f"    Updated: {update_data}")
    
    print("Update completed!")

async def main():
    try:
        await update_existing_templates()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main()) 