"""
DiligenceOS API — Company Pydantic schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CompanyCreate(BaseModel):
    """Payload for POST /api/v1/companies"""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Company name (required)",
    )
    industry: Optional[str] = Field(
        None,
        max_length=255,
        description="Industry sector (optional)",
    )
    description: Optional[str] = Field(
        None,
        max_length=2000,
        description="Company description (optional)",
    )

    @field_validator("name")
    @classmethod
    def validate_name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Company name cannot be empty or whitespace only")
        return stripped

    @field_validator("industry", "description")
    @classmethod
    def strip_whitespace_optional(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            return stripped if stripped else None
        return None


class CompanyResponse(BaseModel):
    """Company response model."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
