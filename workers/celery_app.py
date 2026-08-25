"""
DiligenceOS — Celery worker application.

Shares models with apps/api. Configured with Redis as broker and result backend.
"""

import os
import sys
from pathlib import Path

# Ensure apps/api directory is in sys.path for worker imports
api_path = str(Path(__file__).resolve().parent.parent / "apps" / "api")
if api_path not in sys.path:
    sys.path.insert(0, api_path)

from celery import Celery

# Read Redis URL from environment
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "diligenceos",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


@celery_app.task(name="diligenceos.health_check")
def health_check_task():
    """Placeholder task — verifies the worker is connected and running."""
    return {"status": "worker_ok"}


@celery_app.task(name="diligenceos.process_document")
def process_document_task(job_id_str: str):
    """Celery task entry point for document processing."""
    from app.tasks.process_document import run_process_document_stub
    run_process_document_stub(job_id_str)
    return {"status": "completed", "job_id": job_id_str}
