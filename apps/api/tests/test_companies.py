"""
Tests for Company Management API endpoints & workspace tenant isolation.
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


def test_unauthenticated_requests(client):
    """Verify unauthenticated requests return 401 Unauthorized."""
    res_create = client.post("/api/v1/companies", json={"name": "Acme"})
    assert res_create.status_code == 401

    res_list = client.get("/api/v1/companies")
    assert res_list.status_code == 401

    res_get = client.get("/api/v1/companies/00000000-0000-0000-0000-000000000000")
    assert res_get.status_code == 401


def test_company_validation(client):
    """Verify name validation rules."""
    # Register & login user
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "val@example.com", "password": "password123"},
    )
    assert reg.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "val@example.com", "password": "password123"},
    )
    assert login.status_code == 200

    # Empty name
    res_empty = client.post("/api/v1/companies", json={"name": ""})
    assert res_empty.status_code == 422

    # Whitespace-only name
    res_ws = client.post("/api/v1/companies", json={"name": "   "})
    assert res_ws.status_code == 422


def test_company_creation_and_isolation(client):
    """
    Verify creating, listing, and getting companies works and enforces tenant isolation.
    """
    # 1. Register & Login User 1
    reg1 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "user1@example.com",
            "password": "password123",
            "full_name": "User One",
        },
    )
    assert reg1.status_code == 201

    login1 = client.post(
        "/api/v1/auth/login",
        json={"email": "user1@example.com", "password": "password123"},
    )
    assert login1.status_code == 200

    # 2. User 1 creates Company A
    res_create = client.post(
        "/api/v1/companies",
        json={
            "name": "Stark Industries",
            "industry": "Defense & Energy",
            "description": "Clean energy and defense tech",
        },
    )
    assert res_create.status_code == 201
    comp1 = res_create.json()
    comp1_id = comp1["id"]
    assert comp1["name"] == "Stark Industries"
    assert comp1["industry"] == "Defense & Energy"
    assert comp1["description"] == "Clean energy and defense tech"

    # 3. User 1 lists companies -> 1 company
    res_list1 = client.get("/api/v1/companies")
    assert res_list1.status_code == 200
    companies1 = res_list1.json()
    assert len(companies1) == 1
    assert companies1[0]["id"] == comp1_id

    # 4. User 1 gets company by ID -> 200 OK
    res_get1 = client.get(f"/api/v1/companies/{comp1_id}")
    assert res_get1.status_code == 200
    assert res_get1.json()["name"] == "Stark Industries"

    # 5. Log out User 1
    client.post("/api/v1/auth/logout")

    # 6. Register & Login User 2
    reg2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "user2@example.com",
            "password": "password123",
            "full_name": "User Two",
        },
    )
    assert reg2.status_code == 201

    login2 = client.post(
        "/api/v1/auth/login",
        json={"email": "user2@example.com", "password": "password123"},
    )
    assert login2.status_code == 200

    # 7. User 2 lists companies -> MUST BE EMPTY (0 companies) - Tenant Isolation!
    res_list2 = client.get("/api/v1/companies")
    assert res_list2.status_code == 200
    companies2 = res_list2.json()
    assert len(companies2) == 0

    # 8. User 2 tries to fetch User 1's company by ID -> MUST RETURN 404 NOT FOUND (not 403)
    res_get2 = client.get(f"/api/v1/companies/{comp1_id}")
    assert res_get2.status_code == 404
    assert res_get2.json()["detail"] == "Company not found"
