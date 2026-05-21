# Kariyer haritası endpoint'leri — radar verisi ve gap analizi
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.data.career_data import RADAR_CATEGORIES, ROLE_LABELS, ROLE_SKILL_MAP
from app.database import get_db
from app.models import CV, User, UserRole

router = APIRouter(prefix="/career", tags=["career"])


def _hesapla_radar(beceriler: list[str]) -> dict:
    beceri_set = set(b.lower() for b in beceriler)
    radar = {}
    for kategori, kategori_becerileri in RADAR_CATEGORIES.items():
        total = len(kategori_becerileri)
        matches = sum(1 for b in kategori_becerileri if b.lower() in beceri_set)
        radar[kategori] = round((matches / total) * 100) if total else 0
    return radar


@router.get("/radar")
def get_radar(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    beceriler = cv.beceriler or [] if cv else []
    radar = _hesapla_radar(beceriler)
    return {
        "radar": [{"kategori": k, "skor": v} for k, v in radar.items()],
        "beceri_sayisi": len(beceriler),
    }


@router.get("/gap-analysis")
def gap_analysis(
    target_role: str = Query(default="backend"),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    if target_role not in ROLE_SKILL_MAP:
        return {"hata": f"Geçersiz rol. Seçenekler: {', '.join(ROLE_SKILL_MAP.keys())}"}
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    mevcut = set(b.lower() for b in (cv.beceriler or [])) if cv else set()
    hedef = ROLE_SKILL_MAP[target_role]
    hedef_lower = {b.lower(): b for b in hedef}

    eksik = [hedef_lower[b] for b in hedef_lower if b not in mevcut]
    sahip = [hedef_lower[b] for b in hedef_lower if b in mevcut]
    tamamlanma = round(len(sahip) / len(hedef) * 100) if hedef else 0

    return {
        "hedef_rol": ROLE_LABELS.get(target_role, target_role),
        "tamamlanma_yuzdesi": tamamlanma,
        "sahip_olunan": sahip,
        "eksik_beceriler": eksik,
        "toplam_gereken": len(hedef),
    }


@router.put("/skills")
def update_skills(
    beceriler: list[str],
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.student_id == current_user.id).first()
    if not cv:
        from app.models import CV as CVModel
        cv = CVModel(student_id=current_user.id, beceriler=beceriler)
        db.add(cv)
    else:
        cv.beceriler = beceriler
    db.commit()
    return {"guncellendi": True, "beceri_sayisi": len(beceriler)}


@router.get("/roles")
def list_roles():
    return [{"id": k, "label": v, "gerekli_beceriler": ROLE_SKILL_MAP[k]}
            for k, v in ROLE_LABELS.items()]
