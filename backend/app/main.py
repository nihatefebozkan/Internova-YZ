# FastAPI uygulama giriş noktası
import os
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.auth_utils import get_current_user
from app.database import get_db
from app.limiter import limiter
from app.models import User, UserRole
from app.routers import auth, users, internships, applications, companies, cv, portfolios, certificates, diary, teams, career, ai, groups, projects, skills, discover, ws_chat, staj, evraklar

app = FastAPI(
    title="InternovaYZ API",
    description="Bursa Teknik Üniversitesi kariyer ve staj platformu",
    version="0.2.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   "http://localhost:3001", "http://127.0.0.1:3001",
                   "https://generous-wisdom-production-3844.up.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(internships.router)
app.include_router(applications.router)
app.include_router(companies.router)
app.include_router(cv.router)
app.include_router(portfolios.router)
app.include_router(certificates.router)
app.include_router(diary.router)
app.include_router(teams.router)
app.include_router(career.router)
app.include_router(ai.router)
app.include_router(groups.router)
app.include_router(projects.router)
app.include_router(skills.router)
app.include_router(discover.router)
app.include_router(ws_chat.router)
app.include_router(staj.router)
app.include_router(evraklar.router)

# Yüklenen dosyaları sunmak için statik mount (evrak PDF'leri vb.)
UPLOADS_DIR = os.getenv("UPLOADS_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
os.makedirs(os.path.join(UPLOADS_DIR, "evraklar"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Sunucu hatası oluştu"})


@app.get("/health", tags=["sistem"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Veritabanı bağlantı hatası: {exc}")
