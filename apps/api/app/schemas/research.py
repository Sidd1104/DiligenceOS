"""
DiligenceOS API — Research Pydantic schemas.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ResearchRequest(BaseModel):
    """Payload for asking a research question."""

    question: str = Field(..., min_length=1, description="Question string")
    session_id: Optional[UUID] = None


class CitationResponse(BaseModel):
    """Citation metadata for an assistant response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    chunk_id: UUID
    document_id: UUID
    filename: Optional[str] = None
    page_number: Optional[int] = None
    excerpt: Optional[str] = None


class ResearchMessageResponse(BaseModel):
    """Research message response model."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    role: str
    content: str
    created_at: datetime
    citations: List[CitationResponse] = []


class ResearchSessionResponse(BaseModel):
    """Research session list item model."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    title: Optional[str] = None
    created_at: datetime
    message_count: int = 0


class ResearchAnswerResponse(BaseModel):
    """Response returned after submitting a research question."""

    session_id: UUID
    message_id: UUID
    answer: str
    citations: List[CitationResponse] = []
