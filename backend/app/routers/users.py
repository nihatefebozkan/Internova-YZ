# Kullanıcı profili endpoint'leri
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserProfileUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.aktif == True).first()
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(403, "Yalnızca kendi profilinizi güncelleyebilirsiniz")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
