"""
DiligenceOS API — Application configuration.

Reads all settings from environment variables via Pydantic Settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────
    database_url: str = "postgresql://postgres:postgres@postgres:5432/diligenceos"

    # ── Redis ─────────────────────────────────────────────────
    redis_url: str = "redis://redis:6379/0"

    # ── Auth ──────────────────────────────────────────────────
    jwt_secret: str = "change-me-in-production"

    # ── AI Providers ──────────────────────────────────────────
    anthropic_api_key: str = ""
    voyage_api_key: str = ""

    # ── AWS / S3 ──────────────────────────────────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "ap-south-1"


settings = Settings()
