"""
DiligenceOS — User model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `users`
"""

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)

    # Relationships
    workspace = relationship("Workspace", back_populates="user", uselist=False)
    research_sessions = relationship("ResearchSession", back_populates="user")
