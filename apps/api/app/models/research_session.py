"""
DiligenceOS — ResearchSession model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `research_sessions`
"""

from sqlalchemy import Column, String, Index, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base, UUIDPrimaryKeyMixin


class ResearchSession(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "research_sessions"

    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    company = relationship("Company", back_populates="research_sessions")
    user = relationship("User", back_populates="research_sessions")
    messages = relationship("ResearchMessage", back_populates="session")

    __table_args__ = (
        Index("ix_research_sessions_company_id", "company_id"),
    )
