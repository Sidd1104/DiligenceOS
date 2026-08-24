"""
DiligenceOS API — Database engine & session factory.

Uses synchronous SQLAlchemy engine (Alembic requires sync).
"""

import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

logger = logging.getLogger("diligenceos.db")

try:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    with engine.connect() as conn:
        pass
except Exception as conn_err:
    logger.warning(f"Primary DATABASE_URL unreachable ({conn_err}). Falling back to local SQLite dev database.")
    engine = create_engine(
        "sqlite:///./diligenceos_dev.db",
        connect_args={"check_same_thread": False},
    )
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
