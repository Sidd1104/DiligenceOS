"""
DiligenceOS — Company model.

Schema reference: docs/01-mvp-requirements-and-schema.md §2.3 `companies`
"""

from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class Company(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "companies"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    # Relationships
    workspace = relationship("Workspace", back_populates="companies")
    documents = relationship("Document", back_populates="company")
    research_sessions = relationship("ResearchSession", back_populates="company")
