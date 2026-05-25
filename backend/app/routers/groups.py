# Grup yönetimi endpoint'leri — CRUD, üyelik, join request, rol yönetimi, mesaj geçmişi
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import (
    Group, GroupJoinRequest, GroupMembership, GroupMessage,
    User,
)
from app.schemas import (
    GroupCreate, GroupDetailResponse, GroupJoinRequestCreate,
    GroupJoinRequestDecision, GroupJoinRequestResponse,
    GroupMemberRoleUpdate, GroupMessageResponse,
    GroupResponse, GroupUpdate,
)

router = APIRouter(prefix="/groups", tags=["groups"])


# ---------- yardımcılar -----------------------------------------------------

def _uye_sayisi(db: Session, group_id: int) -> int:
    return db.query(func.count(GroupMembership.id)).filter(GroupMembership.group_id == group_id).scalar() or 0


def _membership(db: Session, group_id: int, user_id: int) -> GroupMembership | None:
    return db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id, GroupMembership.user_id == user_id
    ).first()


def _require_role(db: Session, group_id: int, user: User, roles: tuple[str, ...]) -> GroupMembership:
    m = _membership(db, group_id, user.id)
    if not m or m.rol not in roles:
        raise HTTPException(403, "Bu işlem için yetkiniz yok")
    return m


# ---------- liste / detay --------------------------------------------------

@router.get("", response_model=list[GroupResponse])
def list_groups(
    q: str | None = Query(default=None),
    kategori: str | None = None,
    acik: bool | None = None,
    skip: int = 0, limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    qry = db.query(Group).options(selectinload(Group.owner))
    if q:
        qry = qry.filter(or_(Group.ad.ilike(f"%{q}%"), Group.aciklama.ilike(f"%{q}%")))
    if kategori:
        qry = qry.filter(Group.kategori == kategori)
    if acik is not None:
        qry = qry.filter(Group.acik == acik)
    groups = qry.order_by(Group.created_at.desc()).offset(skip).limit(limit).all()
    out = []
    for g in groups:
        item = GroupResponse.model_validate(g)
        item.uye_sayisi = _uye_sayisi(db, g.id)
        out.append(item)
    return out


@router.get("/me", response_model=list[GroupResponse])
def my_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = db.query(GroupMembership).options(
        selectinload(GroupMembership.group).selectinload(Group.owner)
    ).filter(GroupMembership.user_id == current_user.id).all()
    out = []
    for m in memberships:
        if m.group:
            item = GroupResponse.model_validate(m.group)
            item.uye_sayisi = _uye_sayisi(db, m.group.id)
            out.append(item)
    return out


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    g = db.query(Group).options(
        selectinload(Group.owner),
        selectinload(Group.memberships).selectinload(GroupMembership.user),
    ).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(404, "Grup bulunamadı")
    item = GroupDetailResponse.model_validate(g)
    item.uye_sayisi = len(g.memberships)
    return item


# ---------- create / update / delete ---------------------------------------

@router.post("", response_model=GroupResponse, status_code=201)
def create_group(
    body: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = Group(owner_id=current_user.id, **body.model_dump())
    db.add(g)
    db.flush()
    db.add(GroupMembership(group_id=g.id, user_id=current_user.id, rol="owner"))
    db.commit()
    db.refresh(g)
    item = GroupResponse.model_validate(g)
    item.uye_sayisi = 1
    return item


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int, body: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(404, "Grup bulunamadı")
    _require_role(db, group_id, current_user, ("owner", "moderator"))
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(g, f, v)
    db.commit()
    db.refresh(g)
    item = GroupResponse.model_validate(g)
    item.uye_sayisi = _uye_sayisi(db, g.id)
    return item


@router.delete("/{group_id}", status_code=204)
def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(404, "Grup bulunamadı")
    if g.owner_id != current_user.id:
        raise HTTPException(403, "Sadece grup sahibi silebilir")
    db.delete(g)
    db.commit()


# ---------- join requests --------------------------------------------------

@router.post("/{group_id}/join", response_model=GroupJoinRequestResponse, status_code=201)
def join_group(
    group_id: int, body: GroupJoinRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(404, "Grup bulunamadı")
    if not g.acik:
        raise HTTPException(400, "Grup yeni üye almıyor")
    if _membership(db, group_id, current_user.id):
        raise HTTPException(400, "Zaten üyesisiniz")
    if _uye_sayisi(db, group_id) >= g.max_uye:
        raise HTTPException(400, "Grup dolu")
    mevcut = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.group_id == group_id,
        GroupJoinRequest.user_id == current_user.id,
        GroupJoinRequest.durum == "bekleyen",
    ).first()
    if mevcut:
        raise HTTPException(400, "Zaten bekleyen başvurunuz var")
    req = GroupJoinRequest(group_id=group_id, user_id=current_user.id, mesaj=body.mesaj)
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/{group_id}/requests", response_model=list[GroupJoinRequestResponse])
def list_requests(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(db, group_id, current_user, ("owner", "moderator"))
    return (
        db.query(GroupJoinRequest)
        .options(selectinload(GroupJoinRequest.user))
        .filter(GroupJoinRequest.group_id == group_id, GroupJoinRequest.durum == "bekleyen")
        .order_by(GroupJoinRequest.created_at.desc())
        .all()
    )


@router.put("/{group_id}/requests/{req_id}", response_model=GroupJoinRequestResponse)
def decide_request(
    group_id: int, req_id: int, body: GroupJoinRequestDecision,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(db, group_id, current_user, ("owner", "moderator"))
    if body.durum not in ("kabul", "red"):
        raise HTTPException(400, "Geçersiz karar")
    req = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.id == req_id, GroupJoinRequest.group_id == group_id
    ).first()
    if not req:
        raise HTTPException(404, "Başvuru bulunamadı")
    req.durum = body.durum
    if body.durum == "kabul":
        g = db.query(Group).filter(Group.id == group_id).first()
        if _uye_sayisi(db, group_id) >= g.max_uye:
            raise HTTPException(400, "Grup dolu, kabul edilemez")
        if not _membership(db, group_id, req.user_id):
            db.add(GroupMembership(group_id=group_id, user_id=req.user_id, rol="member"))
    db.commit()
    db.refresh(req)
    return req


# ---------- members --------------------------------------------------------

@router.put("/{group_id}/members/{user_id}/role", status_code=204)
def change_role(
    group_id: int, user_id: int, body: GroupMemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g or g.owner_id != current_user.id:
        raise HTTPException(403, "Sadece grup sahibi rol değiştirebilir")
    if body.rol not in ("moderator", "member"):
        raise HTTPException(400, "Geçersiz rol")
    m = _membership(db, group_id, user_id)
    if not m:
        raise HTTPException(404, "Üye bulunamadı")
    if m.rol == "owner":
        raise HTTPException(400, "Sahip rolü değiştirilemez")
    m.rol = body.rol
    db.commit()


@router.delete("/{group_id}/members/{user_id}", status_code=204)
def remove_member(
    group_id: int, user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(404, "Grup bulunamadı")
    m = _membership(db, group_id, user_id)
    if not m:
        raise HTTPException(404, "Üye bulunamadı")
    # owner/moderator çıkarabilir, ya da kullanıcı kendi rızasıyla çıkabilir
    if current_user.id != user_id:
        _require_role(db, group_id, current_user, ("owner", "moderator"))
    if m.rol == "owner":
        raise HTTPException(400, "Sahip çıkarılamaz")
    db.delete(m)
    db.commit()


# ---------- messages (geçmiş) ---------------------------------------------

@router.get("/{group_id}/messages", response_model=list[GroupMessageResponse])
def list_messages(
    group_id: int,
    before_id: int | None = None,
    limit: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _membership(db, group_id, current_user.id):
        raise HTTPException(403, "Bu grubun üyesi değilsiniz")
    qry = db.query(GroupMessage).options(selectinload(GroupMessage.sender)).filter(
        GroupMessage.group_id == group_id
    )
    if before_id:
        qry = qry.filter(GroupMessage.id < before_id)
    msgs = qry.order_by(GroupMessage.id.desc()).limit(limit).all()
    return list(reversed(msgs))
