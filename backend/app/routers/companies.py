# Şirket profili endpoint'leri
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import Internship, InternshipStatus, User, UserRole
from app.schemas import CompanyProfileResponse, InternshipResponse

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyProfileResponse])
def list_companies(
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    return (
        db.query(User)
        .filter(User.role == UserRole.company, User.aktif == True)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{company_id}", response_model=CompanyProfileResponse)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
):
    company = db.query(User).filter(
        User.id == company_id,
        User.role == UserRole.company,
        User.aktif == True,
    ).first()
    if not company:
        raise HTTPException(404, "Şirket bulunamadı")
    ilanlar = (
        db.query(Internship)
        .filter(
            Internship.company_id == company_id,
            Internship.durum == InternshipStatus.aktif,
        )
        .all()
    )
    result = CompanyProfileResponse.model_validate(company)
    result.internships = [InternshipResponse.model_validate(i) for i in ilanlar]
    return result
