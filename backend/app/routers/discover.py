# Keşfet + öneri sistemi — Jaccard skill matching
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import (
    CV, Group, GroupMembership, Project, ProjectDepartment, User,
)


def _project_to_response(p, ProjectResponseCls):
    item = ProjectResponseCls.model_validate(p)
    item.group_ad = p.group.ad if p.group else None
    if p.owner:
        item.owner_ad = f"{p.owner.ad} {p.owner.soyad}".strip()
    return item
from app.schemas import (
    DiscoveryResponse, GroupResponse, ProjectResponse,
)

router = APIRouter(prefix="/discover", tags=["discover"])


def _uye_sayisi(db: Session, group_id: int) -> int:
    return db.query(func.count(GroupMembership.id)).filter(
        GroupMembership.group_id == group_id
    ).scalar() or 0


def _normalize(s: str) -> str:
    return str(s).strip().lower().replace(" ", "-")


def _user_skill_slugs(db: Session, user_id: int) -> set[str]:
    """CV.beceriler listesinden becerileri çıkar. Liste string veya {name,...} olabilir."""
    cv = db.query(CV).filter(CV.student_id == user_id).first()
    if not cv or not cv.beceriler:
        return set()
    out = set()
    for item in cv.beceriler:
        if isinstance(item, dict):
            ad = item.get("name") or item.get("ad")
        else:
            ad = item
        if ad:
            out.add(_normalize(ad))
    return out


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


@router.get("", response_model=DiscoveryResponse)
def discover(
    q: str | None = None,
    kategori: str | None = None,
    seviye: str | None = None,
    durum: str | None = Query(default="acik"),
    skill: list[str] | None = Query(default=None),
    db: Session = Depends(get_db),
):
    # Grup sorgusu
    g_qry = db.query(Group).options(selectinload(Group.owner)).filter(Group.acik == True)
    if q:
        g_qry = g_qry.filter(or_(Group.ad.ilike(f"%{q}%"), Group.aciklama.ilike(f"%{q}%")))
    if kategori:
        g_qry = g_qry.filter(Group.kategori == kategori)
    groups = g_qry.order_by(Group.created_at.desc()).limit(40).all()
    g_out = []
    for g in groups:
        item = GroupResponse.model_validate(g)
        item.uye_sayisi = _uye_sayisi(db, g.id)
        g_out.append(item)

    # Proje sorgusu
    p_qry = db.query(Project).options(
        selectinload(Project.departments),
        selectinload(Project.group),
        selectinload(Project.owner),
    )
    if durum:
        p_qry = p_qry.filter(Project.durum == durum)
    if kategori:
        p_qry = p_qry.filter(Project.kategori == kategori)
    if seviye:
        p_qry = p_qry.filter(Project.seviye == seviye)
    if q:
        p_qry = p_qry.filter(or_(Project.ad.ilike(f"%{q}%"), Project.kisa_aciklama.ilike(f"%{q}%")))
    projects = p_qry.order_by(Project.created_at.desc()).limit(60).all()

    # Skill filtresi — herhangi bir departmanda eşleşen etiket varsa al
    if skill:
        skill_set = {s.lower() for s in skill}
        filtered = []
        for p in projects:
            tags = set()
            for d in p.departments:
                for t in (d.beceri_etiketleri or []):
                    tags.add(str(t).lower())
            if skill_set & tags:
                filtered.append(p)
        projects = filtered

    p_out = [_project_to_response(p, ProjectResponse) for p in projects]
    return DiscoveryResponse(groups=g_out, projects=p_out)


@router.get("/recommendations", response_model=DiscoveryResponse)
def recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    benim = _user_skill_slugs(db, current_user.id)
    if not benim:
        return DiscoveryResponse(groups=[], projects=[])

    # Tüm açık projeleri çek, jaccard hesapla, üye olunmayanları öner
    uye_olunan = {m[0] for m in db.query(GroupMembership.group_id).filter(
        GroupMembership.user_id == current_user.id
    ).all()}

    projects = db.query(Project).options(
        selectinload(Project.departments),
        selectinload(Project.group),
        selectinload(Project.owner),
    ).filter(Project.durum == "acik").all()

    skorlu = []
    for p in projects:
        # Departman etiketlerini slug'a indirgeyemediğimiz için string karşılaştırması
        tags = set()
        for d in p.departments:
            for t in (d.beceri_etiketleri or []):
                tags.add(_normalize(t))
        skor = _jaccard(benim, tags)
        if skor > 0 and p.group_id not in uye_olunan:
            skorlu.append((skor, p))
    skorlu.sort(key=lambda x: x[0], reverse=True)

    proj_out = [_project_to_response(p, ProjectResponse) for _, p in skorlu[:20]]

    # Grup önerileri: skorlu projelerin gruplarından unique
    grup_ids = []
    for _, p in skorlu[:20]:
        if p.group_id not in grup_ids:
            grup_ids.append(p.group_id)
    grup_objs = db.query(Group).options(selectinload(Group.owner)).filter(
        Group.id.in_(grup_ids), Group.acik == True
    ).all() if grup_ids else []
    grup_out = []
    for g in grup_objs:
        item = GroupResponse.model_validate(g)
        item.uye_sayisi = _uye_sayisi(db, g.id)
        grup_out.append(item)

    return DiscoveryResponse(groups=grup_out, projects=proj_out)
