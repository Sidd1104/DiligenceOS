"""
Tests for real PDF document processing, PyMuPDF text extraction,
semantic paragraph chunking, 1024-dim vector embeddings, and error handling.
"""

from uuid import UUID
import fitz  # PyMuPDF
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Base, Document, DocumentChunk, ProcessingJob


@pytest.fixture(autouse=True)
def setup_db():
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    def override_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def create_sample_pdf_bytes() -> bytes:
    """Creates a multi-page PDF document in memory using PyMuPDF."""
    doc = fitz.open()  # type: ignore

    # Page 1
    page1 = doc.new_page()
    page1.insert_text(
        (50, 50),
        "Item 1. Executive Summary\n\n"
        "Acme Corporation is a leading provider of enterprise intelligence software.\n\n"
        "FINANCIAL PERFORMANCE\n\n"
        "Annual revenue reached $150M in FY2025, representing a 35% growth year-over-year.",
    )

    # Page 2
    page2 = doc.new_page()
    page2.insert_text(
        (50, 50),
        "Item 1A. Risk Factors\n\n"
        "Supply chain disruptions and macroeconomic volatility remain ongoing risk factors.\n\n"
        "CONCLUSION\n\n"
        "Management maintains an optimistic outlook for strategic expansion into new regional markets.",
    )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_empty_scanned_pdf_bytes() -> bytes:
    """Creates a PDF page with no extractable text."""
    doc = fitz.open()  # type: ignore
    doc.new_page()  # Blank page without text
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_real_pdf_processing_pipeline(client):
    """
    Uploads a real 2-page PDF and verifies:
    1. Text extraction page-by-page (page_count=2).
    2. Chunks created in DB with correct page_number metadata.
    3. Each chunk has a non-null 1024-dimension embedding array.
    4. Document status reaches COMPLETED.
    """
    # 1. Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "real_proc@example.com", "password": "password123"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "real_proc@example.com", "password": "password123"},
    )

    # 2. Create Company
    res_comp = client.post(
        "/api/v1/companies",
        json={"name": "Cyberdyne Systems", "industry": "Robotics"},
    )
    assert res_comp.status_code == 201
    comp_id = res_comp.json()["id"]

    # 3. Upload multi-page PDF
    pdf_bytes = create_sample_pdf_bytes()
    res_upload = client.post(
        f"/api/v1/companies/{comp_id}/documents",
        files={"file": ("cyberdyne_report.pdf", pdf_bytes, "application/pdf")},
    )
    assert res_upload.status_code == 202
    doc_id = UUID(res_upload.json()["id"])

    # 4. Fetch document and verify status COMPLETED
    res_doc = client.get(f"/api/v1/documents/{doc_id}")
    assert res_doc.status_code == 200
    doc_data = res_doc.json()
    assert doc_data["status"] == "COMPLETED"
    assert doc_data["page_count"] == 2

    # 5. Query DB directly via test session to verify document_chunks
    db_session_gen = app.dependency_overrides[get_db]()
    db = next(db_session_gen)

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )

    assert len(chunks) >= 2, "Expected at least 2 chunks created from 2-page PDF"

    # Verify chunk metadata & 1024-dim embeddings
    page_numbers = set()
    for chunk in chunks:
        assert chunk.document_id == doc_id
        assert chunk.page_number in [1, 2]
        page_numbers.add(chunk.page_number)
        assert chunk.text is not None and len(chunk.text) > 0
        assert chunk.token_count is not None and chunk.token_count > 0

        # Verify 1024-dimension vector embedding
        assert chunk.embedding is not None
        assert len(chunk.embedding) == 1024, f"Expected 1024-dim vector, got {len(chunk.embedding)}"

    assert 1 in page_numbers and 2 in page_numbers, "Expected chunks from both Page 1 and Page 2"


def test_scanned_unreadable_pdf_failure_handling(client):
    """
    Verifies that a PDF with zero extractable text (e.g. scanned image PDF)
    is marked FAILED with a descriptive stored error message.
    """
    # 1. Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "scanned_pdf@example.com", "password": "password123"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "scanned_pdf@example.com", "password": "password123"},
    )

    # 2. Create Company
    res_comp = client.post(
        "/api/v1/companies",
        json={"name": "Scanned Image Corp", "industry": "Paper"},
    )
    comp_id = res_comp.json()["id"]

    # 3. Upload empty scanned PDF
    empty_pdf = create_empty_scanned_pdf_bytes()
    res_upload = client.post(
        f"/api/v1/companies/{comp_id}/documents",
        files={"file": ("scanned_doc.pdf", empty_pdf, "application/pdf")},
    )
    assert res_upload.status_code == 202
    doc_id = UUID(res_upload.json()["id"])

    # 4. Fetch document and verify status FAILED
    res_doc = client.get(f"/api/v1/documents/{doc_id}")
    assert res_doc.status_code == 200
    doc_data = res_doc.json()
    assert doc_data["status"] == "FAILED"

    # 5. Query processing_jobs to confirm descriptive error message
    db_session_gen = app.dependency_overrides[get_db]()
    db = next(db_session_gen)

    job = db.query(ProcessingJob).filter(ProcessingJob.document_id == doc_id).first()
    assert job is not None
    assert job.status == "FAILED"
    assert job.error_message is not None
    assert "Could not extract text" in job.error_message
