# AI endpoint'leri — RAG asistan, mentor bot, staj önerileri
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import CV, Internship, InternshipStatus, User
from app.services.llm_service import cv_iyilestir, ilan_iyilestir
from app.services.rag_service import sor
from app.services.team_matcher import takim_eslesim

router = APIRouter(prefix="/ai", tags=["ai"])


class AskRequest(BaseModel):
    soru: str


class TextRequest(BaseModel):
    metin: str


@router.post("/ask")
async def ask_yonetmelik(
    body: AskRequest,
    current_user: User = Depends(get_current_user),
):
    """BTÜ staj yönetmeliği hakkında soru sor (RAG)."""
    if not body.soru.strip():
        raise HTTPException(400, "Soru boş olamaz")
    yanit = await sor(body.soru)
    return {"soru": body.soru, "yanit": yanit}


@router.post("/mentor/cv")
async def mentor_cv(
    body: TextRequest,
    current_user: User = Depends(get_current_user),
):
    """CV özetini analiz et, iyileştirme önerileri sun."""
    if not body.metin.strip():
        raise HTTPException(400, "CV metni boş olamaz")
    oneri = cv_iyilestir(body.metin)
    return {"oneri": oneri}


@router.post("/mentor/internship")
async def mentor_internship(
    body: TextRequest,
    current_user: User = Depends(get_current_user),
):
    """Staj ilanı açıklamasını analiz et, iyileştirme önerileri sun."""
    if not body.metin.strip():
        raise HTTPException(400, "İlan metni boş olamaz")
    oneri = ilan_iyilestir(body.metin)
    return {"oneri": oneri}


@router.get("/recommendations")
def recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Öğrencinin CV becerilerine göre en uygun staj ilanlarını öner."""
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    beceriler = cv.beceriler or [] if cv else []

    ilanlar = db.query(Internship).filter(
        Internship.durum == InternshipStatus.aktif
    ).all()

    if not beceriler or not ilanlar:
        return {
            "onerileri": [],
            "mesaj": "Öneri alabilmek için CV'nize beceri ekleyin.",
        }

    adaylar = [
        {"student_id": i.id, "beceriler": (i.gereksinimler or "").split(",")}
        for i in ilanlar
    ]
    eslesmeler = takim_eslesim(beceriler, adaylar, top_n=5)

    sonuc = []
    ilan_map = {i.id: i for i in ilanlar}
    for e in eslesmeler:
        ilan = ilan_map.get(e["student_id"])
        if ilan and e["score"] > 0:
            sonuc.append({
                "ilan_id": ilan.id,
                "pozisyon": ilan.pozisyon,
                "konum": ilan.konum,
                "eslesen_beceriler": e["eslesen_beceriler"],
                "uyum_skoru": e["score"],
            })
    return {"onerileri": sonuc}
