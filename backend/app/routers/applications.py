# Başvuru yönetimi endpoint'leri — 5'li durum timeline (Faz 2 #8)
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import require_role
from app.database import get_db
from app.models import (
    APPLICATION_GECERLI_GECISLER,
    Application,
    ApplicationDurumGecmis,
    ApplicationStatus,
    Internship,
    User,
    UserRole,
)
from app.schemas import (
    AdaySiralamaItem, ApplicationBulkDecision, ApplicationBulkResult,
    ApplicationDecision, ApplicationResponse, DurumGecmisItem,
)
from app.services.aday_siralama import adaylari_sirala

router = APIRouter(prefix="/applications", tags=["applications"])


# ───────────────────────── yardımcılar ─────────────────────────

def _gecmis_to_items(application: Application) -> list[DurumGecmisItem]:
    """Application'ın durum_gecmis ilişkisinden DurumGecmisItem listesi üret."""
    items = []
    for g in application.durum_gecmis or []:
        item = DurumGecmisItem.model_validate(g)
        if g.degistiren:
            item.degistiren_ad = f"{g.degistiren.ad} {g.degistiren.soyad}".strip()
        items.append(item)
    return items


def _populate_response(app: Application) -> ApplicationResponse:
    resp = ApplicationResponse.model_validate(app)
    resp.durum_gecmis = _gecmis_to_items(app)
    return resp


# ───────────────────────── endpoint'ler ─────────────────────────

@router.get("/me", response_model=list[ApplicationResponse])
def my_applications(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(Application)
        .options(
            selectinload(Application.internship),
            selectinload(Application.durum_gecmis).selectinload(ApplicationDurumGecmis.degistiren),
        )
        .filter(Application.student_id == current_user.id)
        .order_by(Application.basvuru_tarihi.desc())
        .all()
    )
    return [_populate_response(a) for a in apps]


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Öğrencinin kendi başvurusunun detayı + durum geçmişi."""
    app = (
        db.query(Application)
        .options(
            selectinload(Application.internship),
            selectinload(Application.durum_gecmis).selectinload(ApplicationDurumGecmis.degistiren),
        )
        .filter(Application.id == application_id)
        .first()
    )
    if not app:
        raise HTTPException(404, "Başvuru bulunamadı")
    if app.student_id != current_user.id:
        raise HTTPException(403, "Bu başvuruya erişim yok")
    return _populate_response(app)


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
    apps = (
        db.query(Application)
        .options(
            selectinload(Application.student),
            selectinload(Application.durum_gecmis).selectinload(ApplicationDurumGecmis.degistiren),
        )
        .filter(Application.internship_id == internship_id)
        .order_by(Application.basvuru_tarihi.desc())
        .all()
    )
    return [_populate_response(a) for a in apps]


@router.put("/{application_id}/decision", response_model=ApplicationResponse)
def decide_application(
    application_id: int,
    body: ApplicationDecision,
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    """Şirket başvuruyu yeni bir durum'a taşır (bekleyen → inceleniyor → mulakat → kabul/red).

    Geçerli geçişler `APPLICATION_GECERLI_GECISLER`'de tanımlı. Her geçiş
    `application_durum_gecmis` tablosuna kaydedilir.
    """
    yeni_durum = body.durum.value if hasattr(body.durum, "value") else str(body.durum)

    basvuru = (
        db.query(Application)
        .options(
            selectinload(Application.internship),
            selectinload(Application.durum_gecmis).selectinload(ApplicationDurumGecmis.degistiren),
        )
        .filter(Application.id == application_id)
        .first()
    )
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if basvuru.internship.company_id != current_user.id:
        raise HTTPException(403, "Bu başvuruyu değerlendirme yetkiniz yok")

    eski_durum = basvuru.durum
    if eski_durum == yeni_durum:
        raise HTTPException(400, f"Başvuru zaten '{yeni_durum}' durumunda")

    izinli = APPLICATION_GECERLI_GECISLER.get(eski_durum, [])
    if yeni_durum not in izinli:
        raise HTTPException(
            400,
            f"'{eski_durum}' → '{yeni_durum}' geçişi mümkün değil. "
            f"Geçerli geçişler: {izinli or 'yok (terminal durum)'}",
        )

    # Geçişi uygula
    basvuru.durum = yeni_durum
    if yeni_durum in (ApplicationStatus.kabul.value, ApplicationStatus.red.value):
        basvuru.karar_tarihi = datetime.now(timezone.utc)

    # Geçmiş kaydı
    db.add(ApplicationDurumGecmis(
        application_id=basvuru.id,
        eski_durum=eski_durum,
        yeni_durum=yeni_durum,
        degistiren_id=current_user.id,
        not_=body.not_,
    ))

    db.commit()
    db.refresh(basvuru)
    return _populate_response(basvuru)


@router.put("/bulk-decision", response_model=ApplicationBulkResult)
def bulk_decide(
    body: ApplicationBulkDecision,
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    """Birden çok başvuruyu tek seferde aynı duruma taşır. Her başarılı geçiş için
    audit kaydı oluşturulur. Geçersiz geçişler `atlanan` listesine düşer.
    """
    yeni_durum = body.durum.value if hasattr(body.durum, "value") else str(body.durum)
    if not body.application_ids:
        raise HTTPException(400, "Hiç başvuru seçilmedi")

    basvurular = (
        db.query(Application)
        .options(selectinload(Application.internship))
        .filter(Application.id.in_(body.application_ids))
        .all()
    )
    mevcut_id = {a.id for a in basvurular}

    basarili: list[int] = []
    atlanan: list[dict] = []

    for app_id in body.application_ids:
        if app_id not in mevcut_id:
            atlanan.append({"id": app_id, "sebep": "Başvuru bulunamadı"})

    for a in basvurular:
        if a.internship.company_id != current_user.id:
            atlanan.append({"id": a.id, "sebep": "Bu başvuruyu değerlendirme yetkiniz yok"})
            continue
        if a.durum == yeni_durum:
            atlanan.append({"id": a.id, "sebep": f"Zaten '{yeni_durum}'"})
            continue
        izinli = APPLICATION_GECERLI_GECISLER.get(a.durum, [])
        if yeni_durum not in izinli:
            atlanan.append({"id": a.id, "sebep": f"'{a.durum}' → '{yeni_durum}' geçersiz"})
            continue
        eski = a.durum
        a.durum = yeni_durum
        if yeni_durum in (ApplicationStatus.kabul.value, ApplicationStatus.red.value):
            a.karar_tarihi = datetime.now(timezone.utc)
        db.add(ApplicationDurumGecmis(
            application_id=a.id, eski_durum=eski, yeni_durum=yeni_durum,
            degistiren_id=current_user.id, not_=body.not_,
        ))
        basarili.append(a.id)

    db.commit()
    return ApplicationBulkResult(basarili=basarili, atlanan=atlanan)


@router.get("/internship/{internship_id}/ai-siralama", response_model=list[AdaySiralamaItem])
def ai_aday_siralama(
    internship_id: int,
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    """İlanın başvuranlarını ilan beceri profili ile uyum skoruna göre sıralı döner.

    Skor `eksik_analizi.py`'deki helper'larla deterministik hesaplanır — LLM yok,
    çağrı çok hızlı. Her aday için en güçlü/en zayıf kategori de döner.
    """
    ilan = db.query(Internship).filter(Internship.id == internship_id).first()
    if not ilan:
        raise HTTPException(404, "İlan bulunamadı")
    if ilan.company_id != current_user.id:
        raise HTTPException(403, "Bu ilanın başvurularını görme yetkiniz yok")

    basvurular = (
        db.query(Application)
        .options(selectinload(Application.student))
        .filter(Application.internship_id == internship_id)
        .all()
    )
    return adaylari_sirala(db, ilan, basvurular)


@router.get("/{application_id}/gecmis", response_model=list[DurumGecmisItem])
def application_gecmis(
    application_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Bir başvurunun durum geçmişi — timeline UI için."""
    basvuru = (
        db.query(Application)
        .options(selectinload(Application.durum_gecmis).selectinload(ApplicationDurumGecmis.degistiren))
        .filter(Application.id == application_id)
        .first()
    )
    if not basvuru:
        raise HTTPException(404, "Başvuru bulunamadı")
    if basvuru.student_id != current_user.id:
        raise HTTPException(403, "Bu başvuruya erişim yok")
    return _gecmis_to_items(basvuru)
