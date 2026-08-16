"""
DiligenceOS — ResearchMessage model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `research_messages`
"""

from sqlalchemy import Column, String, Text, Index, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base, UUIDPrimaryKeyMixin


class ResearchMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "research_messages"

    session_id = Column(UUID(as_uuid=True), ForeignKey("research_sessions.id"), nullable=False)
    role = Column(String, nullable=False)    # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    session = relationship("ResearchSession", back_populates="messages")
    citations = relationship("Citation", back_populates="message")

    __table_args__ = (
        Index("ix_research_messages_session_id", "session_id"),
    )
