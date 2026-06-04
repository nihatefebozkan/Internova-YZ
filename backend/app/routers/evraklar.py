# Staj dijital evrak akışı — öğrenci yükler, akademisyen onaylar (Faz 3 #14)
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import (
    Application, ApplicationStatus, Internship, StajEvrak, User, UserRole,
)
from app.schemas import EvrakOnayRequest, StajEvrakResponse

router = APIRouter(prefix="/staj/evrak", tags=["evraklar"])


GECERLI_TIPLER = {
    "kabul_mektubu", "sigorta_bilgisi",
    "is_yeri_degerlendirme", "ogrenci_degerlendirme",
    "staj_defteri", "diger",
}

UPLOADS_DIR = os.getenv(
    "UPLOADS_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backend", "uploads"),
)
EVRAK_DIR = os.path.join(UPLOADS_DIR, "evraklar")
os.makedirs(EVRAK_DIR, exist_ok=True)


def _evrak_to_response(e: StajEvrak) -> StajEvrakResponse:
    resp = StajEvrakResponse.model_validate(e)
    if e.yukleyen:
        resp.yukleyen_ad = f"{e.yukleyen.ad} {e.yukleyen.soyad}".strip()
    if e.onaylayan:
        resp.onaylayan_ad = f"{e.onaylayan.ad} {e.onaylayan.soyad}".strip()
    if e.application:
        if e.application.internship:
            resp.pozisyon = e.application.internship.pozisyon
            if e.application.internship.company:
                resp.sirket_adi = e.application.internship.company.ad
        if e.application.student:
            resp.ogrenci_ad = f"{e.application.student.ad} {e.application.student.soyad}".strip()
            resp.ogrenci_bolum = e.application.student.bolum
    return resp


# ────────────────────────── ÖĞRENCİ ENDPOİNTLERİ ──────────────────────────

@router.post("", response_model=StajEvrakResponse, status_code=201)
async def evrak_yukle(
    application_id: int = Form(...),
    ad: str = Form(...),
    tip: str = Form(default="diger"),
    dosya: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Öğrenci yeni evrak yükler. Sadece kabul edilmiş başvuruya bağlı.

    Maksimum 10 MB, sadece PDF/JPG/PNG.
    """
    if tip not in GECERLI_TIPLER:
        raise HTTPException(400, f"Geçersiz evrak tipi. Geçerli: {sorted(GECERLI_TIPLER)}")

    basvuru = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if basvuru.student_id != current_user.id:
        raise HTTPException(403, "Bu başvuruya evrak yükleyemezsiniz")
    if basvuru.durum != ApplicationStatus.kabul.value:
        raise HTTPException(400, "Sadece kabul edilmiş başvurulara evrak yüklenir")

    # Dosya kontrolü
    icerik = await dosya.read()
    if len(icerik) > 10 * 1024 * 1024:
        raise HTTPException(400, "Dosya 10 MB'dan büyük olamaz")
    uzanti = (dosya.filename or "").rsplit(".", 1)[-1].lower() if "." in (dosya.filename or "") else ""
    if uzanti not in ("pdf", "jpg", "jpeg", "png"):
        raise HTTPException(400, "Sadece PDF, JPG veya PNG yükleyebilirsiniz")

    benzersiz_ad = f"{uuid.uuid4().hex}.{uzanti}"
    yol = os.path.join(EVRAK_DIR, benzersiz_ad)
    with open(yol, "wb") as f:
        f.write(icerik)

    evrak = StajEvrak(
        application_id=application_id,
        yukleyen_id=current_user.id,
        ad=ad.strip()[:200],
        tip=tip,
        dosya_url=f"/uploads/evraklar/{benzersiz_ad}",
        dosya_adi=dosya.filename or benzersiz_ad,
    )
    db.add(evrak)
    db.commit()
    db.refresh(evrak)

    evrak = db.query(StajEvrak).options(
        selectinload(StajEvrak.yukleyen),
        selectinload(StajEvrak.onaylayan),
        selectinload(StajEvrak.application).selectinload(Application.internship).selectinload(Internship.company),
        selectinload(StajEvrak.application).selectinload(Application.student),
    ).filter(StajEvrak.id == evrak.id).first()
    return _evrak_to_response(evrak)


@router.get("/me", response_model=list[StajEvrakResponse])
def evraklarim(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Öğrencinin yüklediği tüm evraklar (tüm staj başvurularından)."""
    evraklar = (
        db.query(StajEvrak)
        .join(Application, StajEvrak.application_id == Application.id)
        .options(
            selectinload(StajEvrak.yukleyen),
            selectinload(StajEvrak.onaylayan),
            selectinload(StajEvrak.application).selectinload(Application.internship).selectinload(Internship.company),
            selectinload(StajEvrak.application).selectinload(Application.student),
        )
        .filter(Application.student_id == current_user.id)
        .order_by(StajEvrak.created_at.desc())
        .all()
    )
    return [_evrak_to_response(e) for e in evraklar]


@router.get("/application/{application_id}", response_model=list[StajEvrakResponse])
def evraklar_basvuru(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bir başvuruya ait evraklar. Öğrenci kendi başvurusunu görür, akademisyen herkesinkini."""
    basvuru = db.query(Application).filter(Application.id == application_id).first()
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if current_user.role == UserRole.student and basvuru.student_id != current_user.id:
        raise HTTPException(403, "Bu başvuruya erişim yok")
    if current_user.role == UserRole.company:
        raise HTTPException(403, "Şirketler evrak akışında değil")

    evraklar = (
        db.query(StajEvrak)
        .options(
            selectinload(StajEvrak.yukleyen),
            selectinload(StajEvrak.onaylayan),
            selectinload(StajEvrak.application).selectinload(Application.internship).selectinload(Internship.company),
            selectinload(StajEvrak.application).selectinload(Application.student),
        )
        .filter(StajEvrak.application_id == application_id)
        .order_by(StajEvrak.created_at.desc())
        .all()
    )
    return [_evrak_to_response(e) for e in evraklar]


@router.delete("/{evrak_id}", status_code=204)
def evrak_sil(
    evrak_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Öğrenci kendi evraklarını silebilir — onaylanmış olanlar silinemez."""
    e = db.query(StajEvrak).filter(StajEvrak.id == evrak_id).first()
    if not e:
        raise HTTPException(404, "Evrak bulunamadı")
    if e.yukleyen_id != current_user.id:
        raise HTTPException(403, "Sadece yüklediğin evrakı silebilirsin")
    if e.durum == "onayli":
        raise HTTPException(400, "Onaylanmış evrak silinemez")

    # Dosya disk'ten temizle
    if e.dosya_url:
        try:
            relatif = e.dosya_url.replace("/uploads/", "")
            yol = os.path.join(UPLOADS_DIR, relatif)
            if os.path.exists(yol):
                os.remove(yol)
        except OSError:
            pass

    db.delete(e)
    db.commit()


# ────────────────────────── AKADEMİSYEN ENDPOİNTLERİ ──────────────────────────

@router.get("/onay-kuyrugu", response_model=list[StajEvrakResponse])
def onay_kuyrugu(
    current_user: User = Depends(require_role(UserRole.teacher)),
    db: Session = Depends(get_db),
):
    """Akademisyen: tüm bekleyen evrakları döner — en eski üstte (FIFO)."""
    evraklar = (
        db.query(StajEvrak)
        .options(
            selectinload(StajEvrak.yukleyen),
            selectinload(StajEvrak.application).selectinload(Application.internship).selectinload(Internship.company),
            selectinload(StajEvrak.application).selectinload(Application.student),
        )
        .filter(StajEvrak.durum == "bekleyen")
        .order_by(StajEvrak.created_at.asc())
        .all()
    )
    return [_evrak_to_response(e) for e in evraklar]


@router.get("/akademisyen/tumu", response_model=list[StajEvrakResponse])
def tum_evraklar(
    durum: Optional[str] = None,
    current_user: User = Depends(require_role(UserRole.teacher)),
    db: Session = Depends(get_db),
):
    """Akademisyen: tüm evraklar (filtreli)."""
    q = db.query(StajEvrak).options(
        selectinload(StajEvrak.yukleyen),
        selectinload(StajEvrak.onaylayan),
        selectinload(StajEvrak.application).selectinload(Application.internship).selectinload(Internship.company),
        selectinload(StajEvrak.application).selectinload(Application.student),
    )
    if durum:
        q = q.filter(StajEvrak.durum == durum)
    return [_evrak_to_response(e) for e in q.order_by(StajEvrak.created_at.desc()).limit(200).all()]


@router.put("/{evrak_id}/onay", response_model=StajEvrakResponse)
def evrak_onay(
    evrak_id: int,
    body: EvrakOnayRequest,
    current_user: User = Depends(require_role(UserRole.teacher)),
    db: Session = Depends(get_db),
):
    """Akademisyen: evrakı onayla veya reddet. Bir kere karar verince geri alınamaz."""
    if body.durum not in ("onayli", "red"):
        raise HTTPException(400, "Durum 'onayli' veya 'red' olmalı")

    e = (
        db.query(StajEvrak)
        .options(
            selectinload(StajEvrak.yukleyen),
            selectinload(StajEvrak.application).selectinload(Application.internship).selectinload(Internship.company),
            selectinload(StajEvrak.application).selectinload(Application.student),
        )
        .filter(StajEvrak.id == evrak_id)
        .first()
    )
    if not e:
        raise HTTPException(404, "Evrak bulunamadı")
    if e.durum != "bekleyen":
        raise HTTPException(400, f"Bu evrak zaten '{e.durum}' durumunda")

    e.durum = body.durum
    e.onaylayan_id = current_user.id
    e.onay_notu = body.onay_notu
    e.onay_tarihi = datetime.now(timezone.utc)
    db.commit()
    db.refresh(e)
    # Yeniden yükle (onaylayan dahil)
    e = db.query(StajEvrak).options(
        selectinload(StajEvrak.yukleyen),
        selectinload(StajEvrak.onaylayan),
        selectinload(StajEvrak.application).selectinload(Application.internship).selectinload(Internship.company),
        selectinload(StajEvrak.application).selectinload(Application.student),
    ).filter(StajEvrak.id == evrak_id).first()
    return _evrak_to_response(e)
