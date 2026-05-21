# CV endpoint'leri — her öğrencinin tek CV'si (upsert mantığı)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import CV, User, UserRole
from app.schemas import CVResponse, CVUpdate

router = APIRouter(prefix="/cv", tags=["cv"])


@router.get("/me", response_model=CVResponse)
def get_my_cv(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    if not cv:
        raise HTTPException(404, "CV henüz oluşturulmamış")
    return cv


@router.put("/me", response_model=CVResponse)
def upsert_my_cv(
    body: CVUpdate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    if cv:
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(cv, field, value)
    else:
        cv = CV(student_id=current_user.id, **body.model_dump(exclude_none=True))
        db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.get("/{user_id}", response_model=CVResponse)
def get_user_cv(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.student_id == user_id).first()
    if not cv:
        raise HTTPException(404, "CV bulunamadı")
    return cv
