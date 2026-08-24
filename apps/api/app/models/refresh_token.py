"""
DiligenceOS — Refresh Token model for secure authentication token rotation & revocation.
"""

import hashlib
import secrets
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


def generate_refresh_token_string() -> str:
    """Generates a high-entropy URL-safe random string for refresh token secret."""
    return secrets.token_urlsafe(48)


def hash_refresh_token_string(raw_token: str) -> str:
    """Hashes a raw refresh token using SHA-256 for secure database storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class RefreshToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "refresh_tokens"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, index=True)

    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    replaced_by = Column(String, nullable=True)

    # Relationship
    user = relationship("User", back_populates="refresh_tokens")
