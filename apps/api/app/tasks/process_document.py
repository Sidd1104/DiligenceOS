"""
DiligenceOS — Real Document Processing Task Pipeline.

Replaces the stub task with a production document processing pipeline:
1. Download PDF bytes from storage using storage_key
2. Extract text page-by-page preserving page_number (PyMuPDF)
3. Chunk text semantically by paragraph (~500-800 tokens) with heading detection
4. Generate 1024-dimension embeddings via Voyage AI (voyage-finance-2)
5. Store each chunk in `document_chunks` DB table with page metadata & embeddings
6. Update document.page_count and set status to COMPLETED (or FAILED if error)
"""

from datetime import datetime, timezone
import logging
import os
import uuid
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.processing_job import ProcessingJob
from app.services.embeddings import generate_embeddings
from app.services.extractor import chunk_pages, extract_pdf_pages

logger = logging.getLogger("diligenceos.tasks")


def retrieve_pdf_bytes(storage_key: str) -> Optional[bytes]:
    """
    Retrieves document bytes from S3 or local dev fallback cache.
    """
    # 1. Try downloading from S3 if configured
    bucket = settings.aws_s3_bucket
    aws_access_key = settings.aws_access_key_id
    aws_secret_key = settings.aws_secret_access_key

    if bucket and aws_access_key and aws_secret_key and not aws_access_key.startswith("your-"):
        try:
            import boto3

            s3_client = boto3.client(
                "s3",
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=settings.aws_region or "ap-south-1",
            )
            response = s3_client.get_object(Bucket=bucket, Key=storage_key)
            return response["Body"].read()
        except Exception as err:
            logger.warning(f"Failed to fetch {storage_key} from S3: {err}")

    # 2. Local dev / test fallback
    local_path = os.path.join("/tmp", storage_key)
    if os.path.exists(local_path):
        with open(local_path, "rb") as f:
            return f.read()

    return None


def run_process_document_stub(
    job_id_str: str,
    pdf_bytes_override: Optional[bytes] = None,
    db: Optional[Session] = None,
) -> None:
    """
    Executes the document processing pipeline for a given job ID.
    If `db` session is provided, reuses it. Otherwise checks dependency overrides
    (for tests) or falls back to SessionLocal().
    """
    close_db_when_done = False
    if db is None:
        from app.api.deps import get_db
        from app.main import app

        if get_db in app.dependency_overrides:
            try:
                db_gen = app.dependency_overrides[get_db]()
                db = next(db_gen)
            except Exception:
                db = SessionLocal()
                close_db_when_done = True
        else:
            db = SessionLocal()
            close_db_when_done = True

    try:
        job_id = UUID(str(job_id_str))
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            logger.error(f"ProcessingJob {job_id_str} not found")
            return

        doc = db.query(Document).filter(Document.id == job.document_id).first()
        if not doc:
            logger.error(f"Document {job.document_id} not found for job {job_id_str}")
            return

        # 1. Update status to PROCESSING
        logger.info(f"Starting real document processing for Document {doc.id} ({doc.filename})")
        now = datetime.now(timezone.utc)
        job.status = "PROCESSING"
        job.started_at = now
        doc.status = "PROCESSING"
        doc.updated_at = now
        db.commit()

        # 2. Get PDF bytes
        pdf_bytes = pdf_bytes_override or retrieve_pdf_bytes(doc.storage_key)
        if not pdf_bytes:
            raise ValueError("Could not download document file from storage location")

        # 3. Extract text page-by-page preserving page numbers
        try:
            page_count, pages_data = extract_pdf_pages(pdf_bytes)
        except ValueError as val_err:
            # Handle scanned, image-only, or unreadable PDFs gracefully
            error_msg = str(val_err)
            logger.warning(f"Text extraction failed for Document {doc.id}: {error_msg}")
            now_fail = datetime.now(timezone.utc)
            job.status = "FAILED"
            job.error_message = error_msg
            job.completed_at = now_fail
            doc.status = "FAILED"
            doc.updated_at = now_fail
            db.commit()
            return

        # 4. Chunk text semantically (~500-800 tokens) with heading detection
        chunks_data = chunk_pages(pages_data)
        if not chunks_data:
            raise ValueError("Could not extract text — the PDF may be scanned/image-based or unreadable")

        # 5. Generate 1024-dimension embeddings via Voyage AI
        chunk_texts = [c["text"] for c in chunks_data]
        embeddings = generate_embeddings(chunk_texts)

        # Delete any pre-existing chunks for this document (re-run safety)
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()

        # 6. Store each chunk in `document_chunks` table
        chunk_records = []
        for i, chunk_info in enumerate(chunks_data):
            emb_vector = embeddings[i] if i < len(embeddings) else None
            chunk_rec = DocumentChunk(
                id=uuid.uuid4(),
                document_id=doc.id,
                company_id=doc.company_id,
                chunk_index=chunk_info["chunk_index"],
                page_number=chunk_info["page_number"],
                section_title=chunk_info["section_title"],
                text=chunk_info["text"],
                embedding=emb_vector,
                token_count=chunk_info["token_count"],
            )
            chunk_records.append(chunk_rec)

        db.add_all(chunk_records)

        # 7. Update document & job metadata to COMPLETED
        now_done = datetime.now(timezone.utc)
        doc.page_count = page_count
        doc.status = "COMPLETED"
        doc.updated_at = now_done

        job.status = "COMPLETED"
        job.completed_at = now_done
        job.error_message = None

        db.commit()
        logger.info(
            f"Successfully processed Document {doc.id}: {page_count} pages, "
            f"{len(chunk_records)} chunks created with 1024-dim embeddings."
        )

    except Exception as err:
        logger.exception(f"Unhandled error in document processing job {job_id_str}: {err}")
        try:
            now_err = datetime.now(timezone.utc)
            if "job" in locals() and job:
                job.status = "FAILED"
                job.error_message = str(err)
                job.completed_at = now_err
            if "doc" in locals() and doc:
                doc.status = "FAILED"
                doc.updated_at = now_err
            db.commit()
        except Exception:
            db.rollback()
    finally:
        if close_db_when_done and db is not None:
            db.close()
