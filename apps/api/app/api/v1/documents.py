"""
DiligenceOS API — Document management endpoints.

Provides:
- POST /companies/{company_id}/documents
- GET /companies/{company_id}/documents
- GET /documents/{id}

All routes are protected by `get_current_user` and enforce strict workspace tenant isolation.
"""

from typing import List
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.company import Company
from app.models.document import Document
from app.models.processing_job import ProcessingJob
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services.storage import upload_file_to_s3
from app.tasks.process_document import run_process_document_stub

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


@router.post(
    "/companies/{company_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF document to a company workspace",
)
async def upload_document(
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

    return document


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
    return documents


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

    return document
