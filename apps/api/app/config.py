"""
DiligenceOS API — Application configuration.

Reads all settings from environment variables via Pydantic Settings.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve path to project root .env
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ROOT_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env", str(_ROOT_ENV_FILE)),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────
    database_url: str = "postgresql://postgres:postgres@postgres:5432/diligenceos"

    # ── Redis ─────────────────────────────────────────────────
    redis_url: str = "redis://redis:6379/0"

    # ── Auth & Security ───────────────────────────────────────
    jwt_secret: str = "change-me-in-production"
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://web:3000"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: str = ""

    # ── AI Providers ──────────────────────────────────────────
    ai_provider: str = "gemini"  # "anthropic" or "gemini"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    voyage_api_key: str = ""

    # ── AWS / S3 ──────────────────────────────────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "ap-south-1"


settings = Settings()
