"""
DiligenceOS API — Document Pydantic schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    """Document response model."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    filename: str
    storage_key: str
    document_type: Optional[str] = None
    status: str
    page_count: Optional[int] = None
    file_size_bytes: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    error_message: Optional[str] = None


class DocumentUrlResponse(BaseModel):
    """Document presigned/access URL response schema."""

    url: str
    expires_in: int = 900

