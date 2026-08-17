"""
DiligenceOS API — Document management endpoints.

Provides:
- POST /companies/{company_id}/documents
- GET /companies/{company_id}/documents
- GET /documents/{id}

All routes are protected by `get_current_user` and enforce strict workspace tenant isolation.
"""

from datetime import datetime, timezone
from typing import List
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import get_user_or_ip_key, limiter
from app.database import get_db
from app.models.company import Company
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.processing_job import ProcessingJob
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentUrlResponse
from app.services.storage import (
    generate_presigned_url_for_document,
    upload_file_to_s3,
)
from app.tasks.process_document import retrieve_pdf_bytes, run_process_document_stub

router = APIRouter(tags=["documents"])

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


def infer_document_type(filename: str) -> str:
    """Infer simple document type from filename."""
    fn_lower = filename.lower()
    if "annual" in fn_lower or "10-k" in fn_lower or "10k" in fn_lower:
        return "annual_report"
    if "pitch" in fn_lower or "deck" in fn_lower or "presentation" in fn_lower:
        return "pitch_deck"
    if "financial" in fn_lower or "statement" in fn_lower or "balance" in fn_lower:
        return "financial_statement"
    return "other"


def build_document_response(doc: Document, db: Session) -> DocumentResponse:
    """Helper to populate error_message from ProcessingJob if document failed."""
    err_msg = None
    if doc.status == "FAILED":
        job = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.document_id == doc.id)
            .order_by(ProcessingJob.created_at.desc())
            .first()
        )
        if job and job.error_message:
            err_msg = job.error_message

    resp = DocumentResponse.model_validate(doc)
    resp.error_message = err_msg
    return resp


@router.post(
    "/companies/{company_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF document to a company workspace",
)
@limiter.limit("10/minute", key_func=get_user_or_ip_key)
async def upload_document(
    request: Request,
    company_id: UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts multipart/form-data PDF file upload for a company.
    Enforces workspace tenant isolation (returns 404 if company is not in user's workspace).
    Validates magic bytes (%PDF-) and max 50MB size limit (returns 400 if invalid).
    Uploads to S3 and enqueues stub background processing job.
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    # 1. Enforce hard workspace tenant isolation boundary
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    # 2. Read content & validate file size (max 50MB)
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({file_size / (1024 * 1024):.1f}MB) exceeds maximum allowed limit of 50MB",
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty",
        )

    # 3. Validate magic bytes (%PDF-)
    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only valid PDF documents are allowed",
        )

    # 4. Generate metadata & storage key
    document_id = uuid4()
    storage_key = f"{current_user.workspace.id}/{company_id}/{document_id}/{file.filename}"
    doc_type = infer_document_type(file.filename or "")

    # 5. Upload to S3
    upload_file_to_s3(
        file_bytes=content,
        storage_key=storage_key,
        content_type="application/pdf",
    )

    # 6. Create Document record
    document = Document(
        id=document_id,
        company_id=company_id,
        filename=file.filename or "document.pdf",
        storage_key=storage_key,
        document_type=doc_type,
        status="QUEUED",
        file_size_bytes=file_size,
    )
    db.add(document)

    # 7. Create ProcessingJob record
    job = ProcessingJob(
        document_id=document_id,
        job_type="EXTRACTION",
        status="QUEUED",
    )
    db.add(job)

    db.commit()
    db.refresh(document)

    # 8. Trigger background processing task
    background_tasks.add_task(run_process_document_stub, str(job.id), content)

    return build_document_response(document, db)


@router.get(
    "/companies/{company_id}/documents",
    response_model=List[DocumentResponse],
    summary="List documents for a company",
)
def list_company_documents(
    company_id: UUID,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists all documents for a company belonging exclusively to the current user's workspace.
    Returns 404 if company does not exist or belongs to another user's workspace.
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    documents = (
        db.query(Document)
        .filter(Document.company_id == company_id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [build_document_response(doc, db) for doc in documents]


@router.get(
    "/documents/{id}",
    response_model=DocumentResponse,
    summary="Fetch a specific document by ID",
)
def get_document(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetches a single document's current status and metadata.
    Enforces tenant isolation — returns 404 (not 403) if document is not found
    or belongs to another user's workspace.
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    document = (
        db.query(Document)
        .join(Company)
        .filter(
            Document.id == id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return build_document_response(document, db)


@router.get(
    "/documents/{id}/url",
    response_model=DocumentUrlResponse,
    summary="Get short-lived signed URL for document PDF viewing",
)
def get_document_url(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns a short-lived presigned URL (15 min expiry) for viewing/downloading document file.
    Enforces strict workspace tenant isolation — returns 404 (not 403) if document
    is not found or belongs to another user's workspace.
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    document = (
        db.query(Document)
        .join(Company)
        .filter(
            Document.id == id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    url = generate_presigned_url_for_document(
        document_id=str(document.id),
        storage_key=document.storage_key,
        expires_in=900,
    )
    return DocumentUrlResponse(url=url, expires_in=900)


@router.get(
    "/documents/{id}/file",
    summary="Securely stream document PDF content",
)
def get_document_file(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Securely streams the document PDF file bytes for local/dev fallback viewing.
    Enforces strict workspace tenant isolation — returns 404 if unauthorized.
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    document = (
        db.query(Document)
        .join(Company)
        .filter(
            Document.id == id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    pdf_bytes = retrieve_pdf_bytes(document.storage_key)
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file content not found",
        )

    return Response(content=pdf_bytes, media_type="application/pdf")


@router.post(
    "/documents/{id}/retry",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
    summary="Retry background processing for a failed document",
)
def retry_document_processing(
    id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Resets document and processing_jobs status to QUEUED and re-enqueues extraction task.
    Only permitted if current document status is FAILED (returns 400 Bad Request otherwise).
    Enforces hard workspace tenant isolation (returns 404 if not found or unauthorized).
    Clears any partial/orphaned document_chunks before re-enqueuing.
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # 1. Enforce hard workspace tenant isolation boundary
    document = (
        db.query(Document)
        .join(Company)
        .filter(
            Document.id == id,
            Company.workspace_id == current_user.workspace.id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # 2. Reject if document is not in FAILED state (REQ-REL-01)
    if document.status != "FAILED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed documents can be retried",
        )

    # 3. Clear partial or orphaned document_chunks rows for this document
    db.query(DocumentChunk).filter(DocumentChunk.document_id == id).delete()

    # 4. Reset document status
    now = datetime.now(timezone.utc)
    document.status = "QUEUED"
    document.updated_at = now

    # 5. Fetch or create ProcessingJob and reset status
    job = (
        db.query(ProcessingJob)
        .filter(ProcessingJob.document_id == id)
        .order_by(ProcessingJob.created_at.desc())
        .first()
    )

    if not job:
        job = ProcessingJob(
            document_id=id,
            job_type="EXTRACTION",
            status="QUEUED",
        )
        db.add(job)
    else:
        job.status = "QUEUED"
        job.error_message = None
        job.started_at = None
        job.completed_at = None

    db.commit()
    db.refresh(document)

    # 6. Re-enqueue processing task (Celery task or background task fallback)
    try:
        from workers.celery_app import celery_app
        celery_app.send_task("diligenceos.process_document", args=[str(job.id)])
    except Exception:
        background_tasks.add_task(run_process_document_stub, str(job.id))

    return build_document_response(document, db)

