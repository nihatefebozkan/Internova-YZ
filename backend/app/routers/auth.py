# Auth endpoint'leri: kayıt, giriş, oturum bilgisi, çıkış
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth_utils import (
    create_access_token,
    get_current_user,
    hash_password,
    revoke_token,
    verify_password,
)
from app.database import get_db
from app.limiter import limiter
from app.models import User
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer()


@router.post("/register", response_model=AuthResponse, status_code=201)
@limiter.limit("10/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    parts = body.name.strip().split(" ", 1)
    ad = parts[0]
    soyad = parts[1] if len(parts) > 1 else "-"

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        ad=ad,
        soyad=soyad,
        email_dogrulandi=False,
        aktif=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.aktif == True).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")

    return AuthResponse(token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.post("/logout", status_code=200)
def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    revoke_token(credentials.credentials)
    return {"detail": "Çıkış yapıldı"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
