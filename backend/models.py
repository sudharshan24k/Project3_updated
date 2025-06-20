from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, List, Optional
from bson import ObjectId
import datetime

class TemplateModel(BaseModel):
    id: Optional[Any] = Field(alias="_id", default=None)
    name: str = Field(...)
    schema_data: Optional[Dict[str, Any]] = Field(default=None, alias="schema")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        json_schema_extra={
            "example": {
                "name": "My Form Template",
                "schema": {
                    "description": "A sample form schema.",
                    "fields": [
                        {"key": "name", "label": "Name", "type": "text", "required": True}
                    ]
                }
            }
        },
    )

class SubmissionModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    template_name: str = Field(...)
    version: int = Field(...)
    submission_data: Dict[str, Any] = Field(..., alias="data")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        json_schema_extra={
            "example": {
                "template_name": "My Form Template",
                "version": 1,
                "data": {"name": "John Doe"}
            }
        },
    ) 