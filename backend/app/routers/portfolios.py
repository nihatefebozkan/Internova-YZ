# Portfolyo proje endpoint'leri + GitHub repo analiz
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import Portfolio, User, UserRole
from app.schemas import PortfolioCreate, PortfolioResponse, PortfolioUpdate

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/projects", response_model=list[PortfolioResponse])
def my_projects(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    return db.query(Portfolio).filter(Portfolio.student_id == current_user.id).all()


@router.post("/analyze-github", response_model=PortfolioResponse, status_code=201)
async def analyze_github(
    github_url: str = Body(..., embed=True),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """
    GitHub repo URL'sini alır → API ile dosyaları çeker →
    Gemini ile tech stack analiz eder → DB'ye kaydeder.
    """
    from app.services.github_service import github_repo_analiz_et

    sonuc = await github_repo_analiz_et(github_url, current_user.github_username)

    if sonuc["hata"]:
        raise HTTPException(400, detail=sonuc["hata"])

    # DB'ye kaydet
    proje = Portfolio(
        student_id=current_user.id,
        proje_adi=sonuc["proje_adi"] or "GitHub Projesi",
        aciklama=sonuc["ozet"] or sonuc["aciklama"] or "",
        github_link=github_url,
        teknolojiler=sonuc["teknolojiler"],
        proje_buyuklugu=sonuc.get("proje_buyuklugu", 5),
        konu=sonuc.get("konu", ""),
        teknik_yetkinlik=sonuc.get("teknik_yetkinlik", 0.0),
        beceriler=sonuc.get("beceriler", 0.0),
        analiz_durumu=sonuc.get("analiz_durumu", "bekliyor"),
        katki_analizi=sonuc.get("katki_analizi"),
        saglik=sonuc.get("saglik"),
        mimari=sonuc.get("mimari"),
        seviye=sonuc.get("seviye"),
        kavramlar=sonuc.get("kavramlar") or [],
        beceri_kategorileri=sonuc.get("beceri_kategorileri"),
        gorseller=None,
    )
    db.add(proje)
    db.commit()
    db.refresh(proje)
    return proje


@router.get("/projects/{project_id}/eslesen-ilanlar")
def eslesen_ilanlar(
    project_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Bu projenin teknolojileri ve kavramlarına göre eşleşen açık staj
    ilanları ve grup projelerini Jaccard skoru ile sıralar."""
    from app.models import Internship, InternshipStatus, Project, ProjectDepartment

    proje = db.query(Portfolio).filter(Portfolio.id == project_id).first()
    if not proje:
        raise HTTPException(404, "Proje bulunamadı")
    if proje.student_id != current_user.id:
        raise HTTPException(403, "Bu projeye erişim yok")

    def _norm(s):
        return str(s).strip().lower().replace(" ", "-") if s else ""

    benim = set()
    for t in (proje.teknolojiler or []):
        benim.add(_norm(t))
    for k in (proje.kavramlar or []):
        benim.add(_norm(k))

    def jaccard(a: set, b: set) -> float:
        if not a or not b:
            return 0.0
        return len(a & b) / len(a | b)

    # ---- Staj ilanları ----
    ilanlar = db.query(Internship).filter(Internship.durum == InternshipStatus.aktif).all()
    ilan_sonuc = []
    for i in ilanlar:
        tags = set()
        for _, lst in (i.beceri_profili or {}).items():
            if isinstance(lst, list):
                for t in lst:
                    tags.add(_norm(t))
        skor = jaccard(benim, tags)
        if skor > 0:
            ilan_sonuc.append({
                "id": i.id,
                "pozisyon": i.pozisyon,
                "departman": i.departman,
                "skor": round(skor * 100, 1),
                "eslesen": list(benim & tags)[:8],
            })
    ilan_sonuc.sort(key=lambda x: x["skor"], reverse=True)

    # ---- Grup projeleri (departman bazlı) ----
    departmanlar = db.query(ProjectDepartment).join(Project).filter(Project.durum == "acik").all()
    grup_sonuc = []
    for d in departmanlar:
        tags = set(_norm(t) for t in (d.beceri_etiketleri or []))
        skor = jaccard(benim, tags)
        if skor > 0:
            grup_sonuc.append({
                "project_id": d.project_id,
                "department_id": d.id,
                "departman_adi": d.ad,
                "proje_adi": d.project.ad if d.project else None,
                "grup_id": d.project.group_id if d.project else None,
                "skor": round(skor * 100, 1),
                "eslesen": list(benim & tags)[:8],
            })
    grup_sonuc.sort(key=lambda x: x["skor"], reverse=True)

    return {
        "proje_id": project_id,
        "etiket_sayisi": len(benim),
        "staj_ilanlari": ilan_sonuc[:10],
        "grup_projeleri": grup_sonuc[:10],
    }


@router.post("/projects/{project_id}/reanalyze", response_model=PortfolioResponse)
async def reanalyze_project(
    project_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    """Mevcut projeyi yeniden analiz et — github_link gerekli."""
    from app.services.github_service import github_repo_analiz_et

    proje = db.query(Portfolio).filter(Portfolio.id == project_id).first()
    if not proje:
        raise HTTPException(404, "Proje bulunamadı")
    if proje.student_id != current_user.id:
        raise HTTPException(403, "Bu projeyi yeniden analiz edemezsiniz")
    if not proje.github_link:
        raise HTTPException(400, "Bu proje GitHub linki olmadan eklenmiş, yeniden analiz edilemez")

    sonuc = await github_repo_analiz_et(proje.github_link, current_user.github_username)
    if sonuc.get("hata"):
        raise HTTPException(400, detail=sonuc["hata"])

    proje.aciklama         = sonuc.get("ozet") or sonuc.get("aciklama") or proje.aciklama
    proje.teknolojiler     = sonuc.get("teknolojiler") or proje.teknolojiler
    proje.proje_buyuklugu  = sonuc.get("proje_buyuklugu", proje.proje_buyuklugu)
    proje.konu             = sonuc.get("konu") or proje.konu
    proje.teknik_yetkinlik = sonuc.get("teknik_yetkinlik", proje.teknik_yetkinlik)
    proje.beceriler        = sonuc.get("beceriler", proje.beceriler)
    proje.analiz_durumu    = sonuc.get("analiz_durumu", proje.analiz_durumu)
    proje.katki_analizi    = sonuc.get("katki_analizi")
    proje.saglik           = sonuc.get("saglik")
    proje.mimari           = sonuc.get("mimari") or proje.mimari
    proje.seviye           = sonuc.get("seviye") or proje.seviye
    proje.kavramlar        = sonuc.get("kavramlar") or proje.kavramlar or []
    proje.beceri_kategorileri = sonuc.get("beceri_kategorileri") or proje.beceri_kategorileri
    db.commit()
    db.refresh(proje)
    return proje


@router.post("/projects", response_model=PortfolioResponse, status_code=201)
def add_project(
    body: PortfolioCreate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    proje = Portfolio(student_id=current_user.id, **body.model_dump())
    db.add(proje)
    db.commit()
    db.refresh(proje)
    return proje


@router.put("/projects/{project_id}", response_model=PortfolioResponse)
def update_project(
    project_id: int,
    body: PortfolioUpdate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    proje = db.query(Portfolio).filter(Portfolio.id == project_id).first()
    if not proje:
        raise HTTPException(404, "Proje bulunamadı")
    if proje.student_id != current_user.id:
        raise HTTPException(403, "Bu projeyi düzenleme yetkiniz yok")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(proje, field, value)
    db.commit()
    db.refresh(proje)
    return proje


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    proje = db.query(Portfolio).filter(Portfolio.id == project_id).first()
    if not proje:
        raise HTTPException(404, "Proje bulunamadı")
    if proje.student_id != current_user.id:
        raise HTTPException(403, "Bu projeyi silme yetkiniz yok")
    db.delete(proje)
    db.commit()


@router.get("/{user_id}", response_model=list[PortfolioResponse])
def get_user_portfolio(
    user_id: int,
    db: Session = Depends(get_db),
):
    return db.query(Portfolio).filter(Portfolio.student_id == user_id).all()
