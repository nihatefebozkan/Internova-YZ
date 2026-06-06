# Proje takımı endpoint'leri — CRUD, başvuru, eşleştirme
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import CV, ProjectTeam, TeamApplication, TeamMember, TeamStatus, User, UserRole
from app.schemas import (
    TeamApplicationCreate, TeamApplicationDecision, TeamApplicationResponse,
    TeamCreate, TeamResponse, TeamUpdate,
)
from app.services.team_matcher import takim_eslesim

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamResponse])
def list_teams(
    durum: str = Query(default="acik"),
    skip: int = 0, limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    return (
        db.query(ProjectTeam)
        .options(selectinload(ProjectTeam.lider))
        .filter(ProjectTeam.durum == durum)
        .offset(skip).limit(limit).all()
    )


@router.post("", response_model=TeamResponse, status_code=201)
def create_team(
    body: TeamCreate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    team = ProjectTeam(lider_id=current_user.id, **body.model_dump())
    db.add(team)
    db.flush()
    db.add(TeamMember(team_id=team.id, user_id=current_user.id, rol="lider"))
    db.commit()
    db.refresh(team)
    return team


@router.get("/match", tags=["teams"])
def match_students(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Takımın aranan yetkinliklerine göre en uygun öğrencileri döner."""
    team = db.query(ProjectTeam).filter(ProjectTeam.id == team_id).first()
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    aranan = team.aranan_yetkinlikler or []
    cvler = db.query(CV).all()
    adaylar = [
        {"student_id": cv.student_id, "beceriler": cv.beceriler or []}
        for cv in cvler
    ]
    return takim_eslesim(aranan, adaylar)


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(ProjectTeam).options(selectinload(ProjectTeam.lider)).filter(
        ProjectTeam.id == team_id
    ).first()
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    return team


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int, body: TeamUpdate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    team = db.query(ProjectTeam).filter(ProjectTeam.id == team_id).first()
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    if team.lider_id != current_user.id:
        raise HTTPException(403, "Yalnızca lider düzenleyebilir")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return team


@router.post("/{team_id}/apply", response_model=TeamApplicationResponse, status_code=201)
def apply_team(
    team_id: int, body: TeamApplicationCreate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    team = db.query(ProjectTeam).filter(ProjectTeam.id == team_id).first()
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    if team.durum != "acik":
        raise HTTPException(400, "Takım başvuruya kapalı")
    mevcut = db.query(TeamApplication).filter(
        TeamApplication.team_id == team_id,
        TeamApplication.applicant_id == current_user.id,
    ).first()
    if mevcut:
        raise HTTPException(400, "Bu takıma zaten başvurdunuz")
    app = TeamApplication(
        team_id=team_id, applicant_id=current_user.id, mesaj=body.mesaj
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/{team_id}/applications", response_model=list[TeamApplicationResponse])
def team_applications(
    team_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    team = db.query(ProjectTeam).filter(ProjectTeam.id == team_id).first()
    if not team:
        raise HTTPException(404, "Takım bulunamadı")
    if team.lider_id != current_user.id:
        raise HTTPException(403, "Yalnızca lider görebilir")
    return (
        db.query(TeamApplication)
        .options(selectinload(TeamApplication.applicant))
        .filter(TeamApplication.team_id == team_id)
        .all()
    )


@router.put("/{team_id}/applications/{app_id}", response_model=TeamApplicationResponse)
def decide_team_application(
    team_id: int, app_id: int, body: TeamApplicationDecision,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    team = db.query(ProjectTeam).filter(ProjectTeam.id == team_id).first()
    if not team or team.lider_id != current_user.id:
        raise HTTPException(403, "Yalnızca lider karar verebilir")
    app = db.query(TeamApplication).filter(TeamApplication.id == app_id).first()
    if not app:
        raise HTTPException(404, "Başvuru bulunamadı")
    app.durum = body.durum
    if body.durum == "kabul":
        uye = TeamMember(team_id=team_id, user_id=app.applicant_id, rol="üye")
        db.add(uye)
    db.commit()
    db.refresh(app)
    return app
