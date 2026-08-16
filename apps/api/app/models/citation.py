"""
DiligenceOS — Citation model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `citations`
"""

from sqlalchemy import Column, Integer, Text, Index, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base, UUIDPrimaryKeyMixin


class Citation(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "citations"

    message_id = Column(UUID(as_uuid=True), ForeignKey("research_messages.id"), nullable=False)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("document_chunks.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)  # denormalized for direct lookup
    page_number = Column(Integer, nullable=True)
    excerpt = Column(Text, nullable=True)  # short snippet shown in UI
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    message = relationship("ResearchMessage", back_populates="citations")
    chunk = relationship("DocumentChunk", back_populates="citations")
    document = relationship("Document", back_populates="citations")

    __table_args__ = (
        Index("ix_citations_message_id", "message_id"),
    )
