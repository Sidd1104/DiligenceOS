"""
DiligenceOS API — Authentication endpoints.

Provides /register, /login, /logout, and /me.
Session authentication uses HttpOnly cookies.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


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
    summary="Log in user and issue HttpOnly session cookie",
)
@limiter.limit("5/minute")
def login_user(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Verifies user credentials and sets a secure HttpOnly JWT session cookie.
    Does not leak whether the email exists on authentication failure.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Issue JWT access token
    access_token = create_access_token(subject=str(user.id))

    # Set HttpOnly session cookie (REQ-AUTH-02)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # False for HTTP in dev, True in HTTPS production
        samesite="lax",
        max_age=7 * 24 * 3600,  # 7 days
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


@router.post(
    "/logout",
    summary="Log out user and clear session cookie",
)
def logout_user(response: Response):
    """Clears the HttpOnly access token cookie."""
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax",
    )
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
