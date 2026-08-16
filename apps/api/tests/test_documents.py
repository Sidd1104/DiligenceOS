"""
Tests for Document Management API endpoints, PDF validation, and tenant isolation.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Base


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


def test_document_upload_validations(client):
    """
    Verify PDF magic byte and file size validation rules.
    """
    # 1. Register & Login User
    client.post(
        "/api/v1/auth/register",
        json={"email": "doc_val@example.com", "password": "password123"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "doc_val@example.com", "password": "password123"},
    )

    # 2. Create Company
    res_comp = client.post(
        "/api/v1/companies",
        json={"name": "Acme Corp", "industry": "Tech"},
    )
    assert res_comp.status_code == 201
    comp_id = res_comp.json()["id"]

    # 3. Upload Non-PDF file -> MUST return 400 Bad Request
    non_pdf_file = ("test.txt", b"Hello world text file content", "text/plain")
    res_non_pdf = client.post(
        f"/api/v1/companies/{comp_id}/documents",
        files={"file": non_pdf_file},
    )
    assert res_non_pdf.status_code == 400
    assert "Invalid file format" in res_non_pdf.json()["detail"]

    # 4. Upload file > 50MB -> MUST return 400 Bad Request
    large_size = 50 * 1024 * 1024 + 100
    oversized_content = b"%PDF-1.5 " + b"X" * (large_size - 8)
    large_file = ("large.pdf", oversized_content, "application/pdf")
    res_large = client.post(
        f"/api/v1/companies/{comp_id}/documents",
        files={"file": large_file},
    )
    assert res_large.status_code == 400
    assert "exceeds maximum allowed limit of 50MB" in res_large.json()["detail"]


def test_document_upload_and_tenant_isolation(client):
    """
    Verify valid PDF upload succeeds and document is protected by hard workspace tenant isolation.
    """
    # 1. Register & Login User 1
    client.post(
        "/api/v1/auth/register",
        json={"email": "u1_doc@example.com", "password": "password123"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "u1_doc@example.com", "password": "password123"},
    )

    # 2. Create Company for User 1
    res_comp1 = client.post(
        "/api/v1/companies",
        json={"name": "Stark Corp", "industry": "Defense"},
    )
    comp1_id = res_comp1.json()["id"]

    # 3. Upload valid PDF for User 1
    valid_pdf_bytes = b"%PDF-1.7 header\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    pdf_file = ("Annual_Report_2025.pdf", valid_pdf_bytes, "application/pdf")
    res_upload = client.post(
        f"/api/v1/companies/{comp1_id}/documents",
        files={"file": pdf_file},
    )
    assert res_upload.status_code == 202
    doc_data = res_upload.json()
    doc_id = doc_data["id"]
    assert doc_data["filename"] == "Annual_Report_2025.pdf"
    assert doc_data["document_type"] == "annual_report"
    assert doc_data["status"] == "QUEUED"
    assert doc_data["file_size_bytes"] == len(valid_pdf_bytes)

    # 4. User 1 lists documents -> 1 document
    res_list1 = client.get(f"/api/v1/companies/{comp1_id}/documents")
    assert res_list1.status_code == 200
    docs1 = res_list1.json()
    assert len(docs1) == 1
    assert docs1[0]["id"] == doc_id

    # 5. User 1 gets document by ID -> 200 OK
    res_get1 = client.get(f"/api/v1/documents/{doc_id}")
    assert res_get1.status_code == 200
    assert res_get1.json()["filename"] == "Annual_Report_2025.pdf"

    # 6. Logout User 1
    client.post("/api/v1/auth/logout")

    # 7. Register & Login User 2
    client.post(
        "/api/v1/auth/register",
        json={"email": "u2_doc@example.com", "password": "password123"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "u2_doc@example.com", "password": "password123"},
    )

    # 8. User 2 attempts to list documents for User 1's company -> MUST return 404 NOT FOUND
    res_list2 = client.get(f"/api/v1/companies/{comp1_id}/documents")
    assert res_list2.status_code == 404
    assert res_list2.json()["detail"] == "Company not found"

    # 9. User 2 attempts to fetch User 1's document by ID -> MUST return 404 NOT FOUND
    res_get2 = client.get(f"/api/v1/documents/{doc_id}")
    assert res_get2.status_code == 404
    assert res_get2.json()["detail"] == "Document not found"
