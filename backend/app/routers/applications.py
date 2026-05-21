# Başvuru yönetimi endpoint'leri
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import Application, ApplicationStatus, Internship, User, UserRole
from app.schemas import ApplicationDecision, ApplicationResponse

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/me", response_model=list[ApplicationResponse])
def my_applications(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    return (
        db.query(Application)
        .options(selectinload(Application.internship))
        .filter(Application.student_id == current_user.id)
        .order_by(Application.basvuru_tarihi.desc())
        .all()
    )


@router.get("/internship/{internship_id}", response_model=list[ApplicationResponse])
def internship_applications(
    internship_id: int,
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    ilan = db.query(Internship).filter(Internship.id == internship_id).first()
    if not ilan:
        raise HTTPException(404, "İlan bulunamadı")
    if ilan.company_id != current_user.id:
        raise HTTPException(403, "Bu ilanın başvurularını görme yetkiniz yok")
    return (
        db.query(Application)
        .options(selectinload(Application.student))
        .filter(Application.internship_id == internship_id)
        .order_by(Application.basvuru_tarihi.desc())
        .all()
    )


@router.put("/{application_id}/decision", response_model=ApplicationResponse)
def decide_application(
    application_id: int,
    body: ApplicationDecision,
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    if body.durum not in (ApplicationStatus.kabul, ApplicationStatus.red):
        raise HTTPException(400, "Karar 'kabul' veya 'red' olmalı")
    basvuru = (
        db.query(Application)
        .options(selectinload(Application.internship))
        .filter(Application.id == application_id)
        .first()
    )
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if basvuru.internship.company_id != current_user.id:
        raise HTTPException(403, "Bu başvuruyu değerlendirme yetkiniz yok")
    basvuru.durum = body.durum
    basvuru.karar_tarihi = datetime.now(timezone.utc)
    db.commit()
    db.refresh(basvuru)
    return basvuru
