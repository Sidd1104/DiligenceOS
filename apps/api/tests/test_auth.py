"""
Tests for Auth API endpoints and REQ-SEC-05 Rate Limiting.
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
    # Reset slowapi limiter storage between tests
    if hasattr(app.state, "limiter") and hasattr(app.state.limiter, "reset"):
        app.state.limiter.reset()
    return TestClient(app)


def test_login_rate_limiting(client):
    """
    REQ-SEC-05: Confirm rate limiting triggers on POST /api/v1/auth/login after 5 attempts.
    The 6th attempt must return HTTP 429 Too Many Requests with a Retry-After header.
    """
    # 1. Register a test user
    client.post(
        "/api/v1/auth/register",
        json={"email": "ratelimit@example.com", "password": "password123"},
    )

    # 2. Make 5 login attempts (limit is 5 per minute)
    for i in range(5):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "ratelimit@example.com", "password": "wrongpassword"},
        )
        # Should be 401 Unauthorized for bad password
        assert res.status_code == 401

    # 3. 6th login attempt MUST trigger 429 Too Many Requests
    res_exceeded = client.post(
        "/api/v1/auth/login",
        json={"email": "ratelimit@example.com", "password": "wrongpassword"},
    )

    assert res_exceeded.status_code == 429
    assert "Rate limit exceeded" in res_exceeded.json()["detail"]
    assert "retry-after" in res_exceeded.headers or "Retry-After" in res_exceeded.headers
    retry_after = res_exceeded.headers.get("Retry-After") or res_exceeded.headers.get("retry-after")
    assert retry_after is not None
    assert int(retry_after) > 0
