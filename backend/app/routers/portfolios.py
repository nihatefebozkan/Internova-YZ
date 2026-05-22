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


@router.post("/analyze-github", status_code=201)
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

    sonuc = await github_repo_analiz_et(github_url)

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
        gorseller=None,
    )
    db.add(proje)
    db.commit()
    db.refresh(proje)

    return {
        "id":                proje.id,
        "proje_adi":         proje.proje_adi,
        "aciklama":          proje.aciklama,
        "github_link":       proje.github_link,
        "teknolojiler":      proje.teknolojiler,
        "proje_buyuklugu":   proje.proje_buyuklugu,
        "konu":              proje.konu,
        "teknik_yetkinlik":  proje.teknik_yetkinlik,
        "beceriler":         proje.beceriler,
        "created_at":        proje.created_at,
    }


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
