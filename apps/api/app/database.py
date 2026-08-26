"""
DiligenceOS API — Database engine & session factory.

Uses synchronous SQLAlchemy engine (Alembic requires sync).
Converts postgres:// to postgresql:// for compatibility with cloud providers (Render, Supabase, Neon).
"""

import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

logger = logging.getLogger("diligenceos.db")

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Configure engine connect args (e.g. SSL for cloud managed databases)
connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        connect_args=connect_args,
    )
    with engine.connect() as conn:
        logger.info("[DB Engine] Database connection successful.")
except Exception as conn_err:
    logger.error(f"[DB Engine] Primary DATABASE_URL unreachable: {conn_err}")
    # Fallback to local sqlite only in development / test environments
    if os.environ.get("ENVIRONMENT", "development").lower() in ["development", "test", "local"]:
        logger.warning("[DB Engine] Development fallback: Using local SQLite database.")
        engine = create_engine(
            "sqlite:///./diligenceos_dev.db",
            connect_args={"check_same_thread": False},
        )
    else:
        raise conn_err

from app.models import Base
Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session, closes on teardown."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
