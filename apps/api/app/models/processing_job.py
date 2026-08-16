"""
DiligenceOS — ProcessingJob model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `processing_jobs`
"""

from sqlalchemy import Column, String, Text, Index, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base, UUIDPrimaryKeyMixin


class ProcessingJob(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "processing_jobs"

    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    job_type = Column(String, nullable=False)   # EXTRACTION | CHUNKING | EMBEDDING
    status = Column(String, nullable=False, default="QUEUED")  # QUEUED | PROCESSING | COMPLETED | FAILED
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    document = relationship("Document", back_populates="processing_jobs")

    __table_args__ = (
        Index("ix_processing_jobs_document_id", "document_id"),
        Index("ix_processing_jobs_status", "status"),
    )
