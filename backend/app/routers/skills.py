# Beceri etiketi (skill tag) ve kullanıcı becerileri endpoint'leri
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import SkillTag, User, UserSkill
from app.schemas import (
    SkillTagCreate, SkillTagResponse,
    UserSkillResponse, UserSkillsUpdate,
)

router = APIRouter(tags=["skills"])


def _slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[ğ]", "g", s); s = re.sub(r"[ü]", "u", s)
    s = re.sub(r"[ş]", "s", s); s = re.sub(r"[ı]", "i", s)
    s = re.sub(r"[ö]", "o", s); s = re.sub(r"[ç]", "c", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


@router.get("/skill-tags", response_model=list[SkillTagResponse])
def list_tags(
    q: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
):
    qry = db.query(SkillTag)
    if q:
        qry = qry.filter(SkillTag.ad.ilike(f"%{q}%"))
    return qry.order_by(SkillTag.ad).limit(limit).all()


@router.post("/skill-tags", response_model=SkillTagResponse, status_code=201)
def create_tag(
    body: SkillTagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slug = _slugify(body.ad)
    if not slug:
        raise HTTPException(400, "Geçersiz etiket adı")
    mevcut = db.query(SkillTag).filter(SkillTag.slug == slug).first()
    if mevcut:
        return mevcut
    tag = SkillTag(ad=body.ad.strip(), slug=slug, kategori=body.kategori)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.get("/users/me/skills", response_model=list[UserSkillResponse])
def my_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(UserSkill)
        .options(selectinload(UserSkill.skill))
        .filter(UserSkill.user_id == current_user.id)
        .order_by(UserSkill.created_at)
        .all()
    )


@router.put("/users/me/skills", response_model=list[UserSkillResponse])
def update_my_skills(
    body: UserSkillsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Toplu güncelleme: önce hepsini sil, sonra yeniden ekle
    db.query(UserSkill).filter(UserSkill.user_id == current_user.id).delete()
    for item in body.skills:
        seviye = max(1, min(5, item.seviye))
        if not db.query(SkillTag.id).filter(SkillTag.id == item.skill_tag_id).first():
            continue
        db.add(UserSkill(
            user_id=current_user.id,
            skill_tag_id=item.skill_tag_id,
            seviye=seviye,
        ))
    db.commit()
    return (
        db.query(UserSkill)
        .options(selectinload(UserSkill.skill))
        .filter(UserSkill.user_id == current_user.id)
        .all()
    )


@router.get("/users/{user_id}/skills", response_model=list[UserSkillResponse])
def get_user_skills(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(UserSkill)
        .options(selectinload(UserSkill.skill))
        .filter(UserSkill.user_id == user_id)
        .all()
    )
