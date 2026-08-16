"""
DiligenceOS — Workspace model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `workspaces`
MVP: one workspace auto-created per user.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.models.base import Base, UUIDPrimaryKeyMixin


class Workspace(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "workspaces"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="workspace")
    companies = relationship("Company", back_populates="workspace")
