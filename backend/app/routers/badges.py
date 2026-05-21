# Rozet endpoint'leri
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import Badge, User, UserBadge
from app.schemas import BadgeResponse, UserBadgeResponse

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("", response_model=list[BadgeResponse])
def list_badges(db: Session = Depends(get_db)):
    return db.query(Badge).all()


@router.get("/me", response_model=list[UserBadgeResponse])
def my_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(UserBadge)
        .options(selectinload(UserBadge.badge))
        .filter(UserBadge.user_id == current_user.id)
        .all()
    )


@router.get("/{user_id}", response_model=list[UserBadgeResponse])
def user_badges(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(UserBadge)
        .options(selectinload(UserBadge.badge))
        .filter(UserBadge.user_id == user_id)
        .all()
    )
