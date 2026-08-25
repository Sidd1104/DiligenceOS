"""
DiligenceOS API — Authentication endpoints.

Provides /register, /login, /refresh, /logout, and /me.
Session authentication uses HttpOnly cookies with access + refresh token flow.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.security import create_access_token, hash_password, verify_password, REFRESH_TOKEN_EXPIRE_DAYS, DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.refresh_token import RefreshToken, generate_refresh_token_string, hash_refresh_token_string
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens_and_set_cookies(user: User, response: Response, db: Session) -> UserResponse:
    """
    Helper function to generate access & refresh tokens, persist refresh token hash in DB,
    and set HttpOnly cookies on the response.
    """
    # 1. Short-lived access token (15 mins)
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # 2. Long-lived refresh token (7 days)
    raw_refresh_token = generate_refresh_token_string()
    refresh_hash = hash_refresh_token_string(raw_refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    refresh_token_record = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(refresh_token_record)
    db.commit()

    # 3. Set HttpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain or None,
        max_age=DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain or None,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/",
    )

    workspace_id = user.workspace.id if user.workspace else None
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        workspace_id=workspace_id,
        created_at=user.created_at,
    )


def _clear_auth_cookies(response: Response) -> None:
    domain = settings.cookie_domain or None
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=domain,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
    )
    response.delete_cookie(
        key="refresh_token",
        path="/",
        domain=domain,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
@limiter.limit("3/minute")
def register_user(
    request: Request,
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Registers a new user with email + password.
    Hashes password and auto-creates a default Workspace for the user.
    """
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Hash password & create user
    hashed_pw = hash_password(payload.password)
    user = User(
        email=payload.email,
        password_hash=hashed_pw,
        full_name=payload.full_name,
    )
    db.add(user)
    db.flush()  # populate user.id

    # Auto-create workspace for user (REQ-WS-01)
    workspace_name = f"{payload.full_name or payload.email}'s Workspace"
    workspace = Workspace(
        user_id=user.id,
        name=workspace_name,
    )
    db.add(workspace)
    db.commit()
    db.refresh(user)

    workspace_id = user.workspace.id if user.workspace else None
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        workspace_id=workspace_id,
        created_at=user.created_at,
    )


@router.post(
    "/login",
    response_model=UserResponse,
    summary="Log in user and issue HttpOnly access + refresh cookies",
)
@limiter.limit("5/minute")
def login_user(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Verifies user credentials and sets HttpOnly access_token and refresh_token cookies.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    return _issue_tokens_and_set_cookies(user, response, db)


@router.post(
    "/refresh",
    response_model=UserResponse,
    summary="Refresh access token using HttpOnly refresh_token cookie",
)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Validates refresh_token cookie, verifies it is unrevoked in DB, rotates token,
    and returns a fresh access token + updated refresh token cookies.
    """
    raw_refresh_token = request.cookies.get("refresh_token")
    if not raw_refresh_token:
        # Fallback check for custom header if present
        auth_header = request.headers.get("X-Refresh-Token")
        if auth_header:
            raw_refresh_token = auth_header

    if not raw_refresh_token:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    token_hash = hash_refresh_token_string(raw_refresh_token)
    token_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    if not token_record:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )

    # Normalize expires_at comparison
    record_expires_at = token_record.expires_at
    if record_expires_at.tzinfo is None:
        record_expires_at = record_expires_at.replace(tzinfo=timezone.utc)

    if record_expires_at <= now:
        token_record.revoked = True
        db.commit()
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    # Revoke current token (rotation)
    token_record.revoked = True

    # Retrieve user
    user = db.query(User).filter(User.id == token_record.user_id).first()


    if not user:
        db.commit()
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Issue new token pair
    return _issue_tokens_and_set_cookies(user, response, db)


@router.post(
    "/logout",
    summary="Log out user, revoke refresh token server-side, and clear session cookies",
)
def logout_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Revokes refresh token in DB server-side and clears HttpOnly cookies."""
    raw_refresh_token = request.cookies.get("refresh_token")
    if not raw_refresh_token:
        raw_refresh_token = request.headers.get("X-Refresh-Token")

    if raw_refresh_token:
        token_hash = hash_refresh_token_string(raw_refresh_token)
        token_record = (
            db.query(RefreshToken)
            .filter(RefreshToken.token_hash == token_hash)
            .first()
        )
        if token_record:
            token_record.revoked = True
            db.commit()

    _clear_auth_cookies(response)
    return {"status": "ok", "message": "Logged out successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current logged in user details",
)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    workspace_id = current_user.workspace.id if current_user.workspace else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        workspace_id=workspace_id,
        created_at=current_user.created_at,
    )
