# Staj ilanı endpoint'leri
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import Application, Internship, InternshipStatus, User, UserRole
from app.schemas import ApplicationCreate, ApplicationResponse, InternshipCreate, InternshipResponse, InternshipUpdate

router = APIRouter(prefix="/internships", tags=["internships"])


@router.get("", response_model=list[InternshipResponse])
def list_internships(
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    durum: InternshipStatus = InternshipStatus.aktif,
    search: str = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(Internship).options(selectinload(Internship.company)).filter(
        Internship.durum == durum
    )
    if search:
        q = q.filter(
            Internship.pozisyon.ilike(f"%{search}%") |
            Internship.konum.ilike(f"%{search}%") |
            Internship.aciklama.ilike(f"%{search}%")
        )
    return q.order_by(Internship.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/me", response_model=list[InternshipResponse])
def my_internships(
    durum: InternshipStatus | None = Query(default=None, description="Filtre — boşsa tüm durumlar"),
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    """Şirket kendi ilanlarını listeler — durum filtresi opsiyonel.

    `/internships` herkese açık ve sadece `aktif` döner; bu endpoint ise şirketin
    TÜM ilanlarını (taslak/aktif/kapalı) görmesini sağlar.
    """
    q = (
        db.query(Internship)
        .options(selectinload(Internship.company))
        .filter(Internship.company_id == current_user.id)
    )
    if durum is not None:
        q = q.filter(Internship.durum == durum)
    return q.order_by(Internship.created_at.desc()).all()


@router.post("", response_model=InternshipResponse, status_code=201)
def create_internship(
    body: InternshipCreate,
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    from app.data.career_data import BOLUM_KATEGORILERI, BOLUMLER
    data = body.model_dump()

    # Bölüm kodu geçerli mi?
    bolum_kodu = data.get("bolum_kodu")
    if bolum_kodu and bolum_kodu not in BOLUMLER:
        raise HTTPException(400, f"Geçersiz bölüm kodu: {bolum_kodu}")

    # beceri_profili gönderilmemişse bölüme göre sıfır profil oluştur
    if not data.get("beceri_profili"):
        kategoriler = BOLUM_KATEGORILERI.get(bolum_kodu, []) if bolum_kodu else []
        data["beceri_profili"] = {k: 0 for k in kategoriler} if kategoriler else {}

    ilan = Internship(**data, company_id=current_user.id)
    db.add(ilan)
    db.commit()
    db.refresh(ilan)
    db.refresh(ilan, ["company"])
    return ilan


@router.get("/{internship_id}", response_model=InternshipResponse)
def get_internship(
    internship_id: int,
    db: Session = Depends(get_db),
):
    ilan = db.query(Internship).options(selectinload(Internship.company)).filter(
        Internship.id == internship_id
    ).first()
    if not ilan:
        raise HTTPException(404, "İlan bulunamadı")
    return ilan


@router.put("/{internship_id}", response_model=InternshipResponse)
def update_internship(
    internship_id: int,
    body: InternshipUpdate,
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    ilan = db.query(Internship).filter(Internship.id == internship_id).first()
    if not ilan:
        raise HTTPException(404, "İlan bulunamadı")
    if ilan.company_id != current_user.id:
        raise HTTPException(403, "Bu ilanı düzenleme yetkiniz yok")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(ilan, field, value)
    db.commit()
    db.refresh(ilan)
    return ilan


@router.delete("/{internship_id}", status_code=204)
def delete_internship(
    internship_id: int,
    current_user: User = Depends(require_role(UserRole.company)),
    db: Session = Depends(get_db),
):
    ilan = db.query(Internship).filter(Internship.id == internship_id).first()
    if not ilan:
        raise HTTPException(404, "İlan bulunamadı")
    if ilan.company_id != current_user.id:
        raise HTTPException(403, "Bu ilanı silme yetkiniz yok")
    ilan.durum = InternshipStatus.kapali
    db.commit()


@router.post("/{internship_id}/apply", response_model=ApplicationResponse, status_code=201)
def apply_internship(
    internship_id: int,
    body: ApplicationCreate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    ilan = db.query(Internship).filter(
        Internship.id == internship_id, Internship.durum == InternshipStatus.aktif
    ).first()
    if not ilan:
        raise HTTPException(404, "Aktif ilan bulunamadı")
    mevcut = db.query(Application).filter(
        Application.student_id == current_user.id,
        Application.internship_id == internship_id,
    ).first()
    if mevcut:
        raise HTTPException(400, "Bu ilana zaten başvurdunuz")
    basvuru = Application(
        student_id=current_user.id,
        internship_id=internship_id,
        on_yazi=body.on_yazi,
    )
    db.add(basvuru)
    db.commit()
    db.refresh(basvuru)
    return basvuru
