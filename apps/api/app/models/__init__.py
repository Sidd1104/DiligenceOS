"""
DiligenceOS — Model registry.

All models must be imported here so Alembic's autogenerate can detect them.
"""

from app.models.base import Base
from app.models.user import User
from app.models.workspace import Workspace
from app.models.company import Company
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.processing_job import ProcessingJob
from app.models.research_session import ResearchSession
from app.models.research_message import ResearchMessage
from app.models.citation import Citation

__all__ = [
    "Base",
    "User",
    "Workspace",
    "Company",
    "Document",
    "DocumentChunk",
    "ProcessingJob",
    "ResearchSession",
    "ResearchMessage",
    "Citation",
]
