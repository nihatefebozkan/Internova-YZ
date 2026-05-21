# Portfolyo proje endpoint'leri
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import Portfolio, User, UserRole
from app.schemas import PortfolioCreate, PortfolioResponse, PortfolioUpdate

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/projects", response_model=list[PortfolioResponse])
def my_projects(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    return db.query(Portfolio).filter(Portfolio.student_id == current_user.id).all()


@router.post("/projects", response_model=PortfolioResponse, status_code=201)
def add_project(
    body: PortfolioCreate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    proje = Portfolio(student_id=current_user.id, **body.model_dump())
    db.add(proje)
    db.commit()
    db.refresh(proje)
    return proje


@router.put("/projects/{project_id}", response_model=PortfolioResponse)
def update_project(
    project_id: int,
    body: PortfolioUpdate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    proje = db.query(Portfolio).filter(Portfolio.id == project_id).first()
    if not proje:
        raise HTTPException(404, "Proje bulunamadı")
    if proje.student_id != current_user.id:
        raise HTTPException(403, "Bu projeyi düzenleme yetkiniz yok")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(proje, field, value)
    db.commit()
    db.refresh(proje)
    return proje


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    proje = db.query(Portfolio).filter(Portfolio.id == project_id).first()
    if not proje:
        raise HTTPException(404, "Proje bulunamadı")
    if proje.student_id != current_user.id:
        raise HTTPException(403, "Bu projeyi silme yetkiniz yok")
    db.delete(proje)
    db.commit()


@router.get("/{user_id}", response_model=list[PortfolioResponse])
def get_user_portfolio(
    user_id: int,
    db: Session = Depends(get_db),
):
    return db.query(Portfolio).filter(Portfolio.student_id == user_id).all()
