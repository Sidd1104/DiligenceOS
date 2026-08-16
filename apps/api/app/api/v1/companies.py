"""
DiligenceOS API — Company management endpoints.

Provides POST /companies, GET /companies, and GET /companies/{id}.
All routes are protected by `get_current_user` and enforce strict workspace tenant isolation.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new company under the current user's workspace",
)
def create_company(
    payload: CompanyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a company under the authenticated user's workspace.
    """
    if not current_user.workspace:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an active workspace",
        )

    company = Company(
        workspace_id=current_user.workspace.id,
        name=payload.name,
        industry=payload.industry,
        description=payload.description,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    return company


@router.get(
    "",
    response_model=List[CompanyResponse],
    summary="List all companies in the current user's workspace",
)
def list_companies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists companies belonging exclusively to the authenticated user's workspace.
    Hard tenant isolation boundary enforced at the database query level.
    """
    if not current_user.workspace:
        return []

    companies = (
        db.query(Company)
        .filter(Company.workspace_id == current_user.workspace.id)
        .order_by(Company.created_at.desc())
        .all()
    )
    return companies


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Fetch a specific company by ID",
)
def get_company(
    company_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetches a company by ID if it belongs to the authenticated user's workspace.
    Returns 404 (not 403) if company is missing or belongs to another workspace to prevent resource enumeration.
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

    return company
