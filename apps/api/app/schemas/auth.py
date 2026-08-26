"""
DiligenceOS API — Auth Pydantic schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload for POST /api/v1/auth/register"""

    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    full_name: Optional[str] = Field(None, max_length=255)


class LoginRequest(BaseModel):
    """Payload for POST /api/v1/auth/login"""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response model."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: Optional[str] = None
    workspace_id: Optional[UUID] = None
    created_at: datetime
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
