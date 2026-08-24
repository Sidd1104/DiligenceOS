"""
Tests for Auth API endpoints, Access + Refresh Token flow, and REQ-SEC-05 Rate Limiting.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
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
    tc = TestClient(app)
    tc.cookies.clear()
    return tc


def test_login_rate_limiting(client):
    """
    REQ-SEC-05: Confirm rate limiting triggers on POST /api/v1/auth/login after 5 attempts.
    The 6th attempt must return HTTP 429 Too Many Requests with a Retry-After header.
    """
    client.post(
        "/api/v1/auth/register",
        json={"email": "ratelimit@example.com", "password": "password123"},
    )

    for i in range(5):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "ratelimit@example.com", "password": "wrongpassword"},
        )
        assert res.status_code == 401

    res_exceeded = client.post(
        "/api/v1/auth/login",
        json={"email": "ratelimit@example.com", "password": "wrongpassword"},
    )

    assert res_exceeded.status_code == 429
    assert "Rate limit exceeded" in res_exceeded.json()["detail"]
    assert "retry-after" in res_exceeded.headers or "Retry-After" in res_exceeded.headers


def test_login_issues_two_cookies(client):
    """Confirm login issues both access_token and refresh_token cookies."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "twotokens@example.com", "password": "password123"},
    )

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "twotokens@example.com", "password": "password123"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.cookies
    assert "refresh_token" in login_res.cookies


def test_expired_access_token_and_successful_refresh(client):
    """
    Confirm an expired access token can be refreshed using the refresh_token cookie,
    yielding a new valid access token.
    """
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": "expaccess@example.com", "password": "password123"},
    )
    user_id = reg_res.json()["id"]

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "expaccess@example.com", "password": "password123"},
    )
    refresh_cookie = login_res.cookies.get("refresh_token")

    # Manually set access_token to an expired JWT
    expired_token = create_access_token(
        subject=user_id,
        expires_delta=timedelta(seconds=-10),
    )
    client.cookies.set("access_token", expired_token)

    # Calling /me with expired access_token fails with 401
    me_fail = client.get("/api/v1/auth/me")
    assert me_fail.status_code == 401

    # Clear access token and set refresh token cookie
    client.cookies.clear()
    client.cookies.set("refresh_token", refresh_cookie)

    # Call /refresh with refresh_token cookie
    refresh_res = client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.cookies

    # Calling /me with new access_token succeeds
    me_success = client.get("/api/v1/auth/me")
    assert me_success.status_code == 200
    assert me_success.json()["email"] == "expaccess@example.com"


def test_revoked_or_expired_refresh_token_fails(client):
    """Confirm a revoked or missing refresh token rejects token refresh attempts."""
    login_res = client.post(
        "/api/v1/auth/register",
        json={"email": "revokedtoken@example.com", "password": "password123"},
    )
    assert login_res.status_code == 201

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "revokedtoken@example.com", "password": "password123"},
    )

    # 1. Invalid refresh token returns 401
    client.cookies.clear()
    client.cookies.set("refresh_token", "invalid_fake_refresh_token")
    bad_res = client.post("/api/v1/auth/refresh")
    assert bad_res.status_code == 401

    # 2. Missing refresh token returns 401
    client.cookies.clear()
    no_cookie_res = client.post("/api/v1/auth/refresh")
    assert no_cookie_res.status_code == 401


def test_logout_revokes_refresh_token_server_side(client):
    """
    Confirm logout revokes the refresh token server-side in the database,
    causing any saved copy of that token to be rejected.
    """
    client.post(
        "/api/v1/auth/register",
        json={"email": "logoutrevoke@example.com", "password": "password123"},
    )

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "logoutrevoke@example.com", "password": "password123"},
    )
    old_refresh_token = login_res.cookies.get("refresh_token")

    # Logout
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Attempting to use the old refresh token MUST be rejected
    client.cookies.clear()
    client.cookies.set("refresh_token", old_refresh_token)
    rejected_res = client.post("/api/v1/auth/refresh")
    assert rejected_res.status_code == 401
