# FastAPI uygulama giriş noktası
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import User, UserRole
from app.routers import auth

app = FastAPI(
    title="InternovaYZ API",
    description="Bursa Teknik Üniversitesi kariyer ve staj platformu",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/health", tags=["sistem"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Veritabanı bağlantı hatası: {exc}")


@app.get("/users", tags=["admin"])
def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tüm kullanıcıları listeler — yalnızca admin rolü."""
    if current_user.role != UserRole.company:  # TODO: admin rolü eklenince burası güncellenir
        raise HTTPException(status_code=403, detail="Bu endpoint yalnızca admin tarafından kullanılabilir")
    if limit > 100:
        limit = 100
    users = db.query(User).offset(skip).limit(limit).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "ad": u.ad,
            "soyad": u.soyad,
            "role": u.role,
            "aktif": u.aktif,
            "created_at": u.created_at,
        }
        for u in users
    ]
