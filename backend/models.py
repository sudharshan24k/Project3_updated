from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, List, Optional
from bson import ObjectId
import datetime

class TemplateVersionModel(BaseModel):
    id: Optional[Any] = Field(alias="_id", default=None)
    template_name: str = Field(...)
    version: int = Field(...)
    schema: Optional[Dict[str, Any]] = Field(default_factory=dict)
    change_log: Optional[str] = Field(default="Initial version.")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )

class TemplateModel(BaseModel):
    id: Optional[Any] = Field(alias="_id", default=None)
    name: str = Field(...)
    version: int = Field(default=1)
    schema: Optional[Dict[str, Any]] = Field(default_factory=dict)
    author: Optional[str] = Field(default="")
    team_name: Optional[str] = Field(default="")
    version_tag: Optional[str] = Field(default="")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        json_schema_extra={
            "example": {
                "name": "My Form Template",
                "author": "John Doe",
                "team_name": "Framework Team",
                "version_tag": "v1.0",
                "schema": {
                    "description": "A sample form schema.",
                    "fields": [
                        {"key": "name", "label": "Name", "type": "text", "required": True}
                    ],
                    "audit_pipeline": "standard"
                }
            }
        },
    )

class ResponseModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    submission_id: str = Field(...)
    version: int = Field(...)
    parent_id: Optional[str] = Field(default=None)
    author: Optional[str] = Field(default=None)
    content: str = Field(...)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    children: Optional[List['ResponseModel']] = Field(default_factory=list)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        json_schema_extra={
            "example": {
                "submission_id": "abc123",
                "version": 1,
                "parent_id": None,
                "author": "user1",
                "content": "This is a response.",
                "children": []
            }
        },
    )

ResponseModel.model_rebuild()

class SubmissionModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    template_name: str = Field(...)
    version: int = Field(...)
    submission_data: Dict[str, Any] = Field(..., alias="data")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    responses: Optional[List[ResponseModel]] = Field(default_factory=list)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        json_schema_extra={
            "example": {
                "template_name": "My Form Template",
                "version": 1,
                "data": {"name": "John Doe"},
                "responses": []
            }
        },
    )