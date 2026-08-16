"""
DiligenceOS — DocumentChunk model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `document_chunks`
Uses pgvector VECTOR(1024) for Voyage AI voyage-finance-2 embeddings.
"""

from sqlalchemy import Column, String, Integer, Text, Index, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from datetime import datetime, timezone
import uuid

from app.models.base import Base, UUIDPrimaryKeyMixin


class DocumentChunk(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "document_chunks"

    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)  # denormalized for fast filtering
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=True)
    section_title = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    embedding = Column(Vector(1024), nullable=True)  # pgvector; Voyage AI voyage-finance-2 (1024 dims)
    token_count = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    document = relationship("Document", back_populates="chunks")
    citations = relationship("Citation", back_populates="chunk")

    __table_args__ = (
        Index("ix_document_chunks_document_id", "document_id"),
        Index("ix_document_chunks_company_id", "company_id"),
        # IVFFlat ANN index for vector similarity search — created in migration
        # since SQLAlchemy Index doesn't natively support `USING ivfflat ... vector_cosine_ops`
    )
