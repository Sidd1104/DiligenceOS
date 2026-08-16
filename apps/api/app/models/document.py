"""
DiligenceOS — Document model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `documents`
"""

from sqlalchemy import Column, String, Integer, BigInteger, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class Document(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "documents"

    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    filename = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)  # S3 object key
    document_type = Column(String, nullable=True)  # e.g. "annual_report", "pitch_deck"
    status = Column(String, nullable=False, default="QUEUED")  # QUEUED | PROCESSING | COMPLETED | FAILED
    page_count = Column(Integer, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)

    # Relationships
    company = relationship("Company", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document")
    processing_jobs = relationship("ProcessingJob", back_populates="document")
    citations = relationship("Citation", back_populates="document")

    __table_args__ = (
        Index("ix_documents_company_id", "company_id"),
        Index("ix_documents_status", "status"),
    )
