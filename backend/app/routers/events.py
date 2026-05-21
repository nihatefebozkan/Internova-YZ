# Etkinlik endpoint'leri — CRUD, katılım, QR check-in
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import Event, EventAttendee, User, UserRole
from app.schemas import EventCreate, EventResponse, QRCheckinRequest
from app.services.badge_service import rozet_kontrol_et

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventResponse])
def list_events(
    kategori: str = Query(default=None),
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Event).options(selectinload(Event.organizator))
    if kategori:
        q = q.filter(Event.kategori == kategori)
    return q.order_by(Event.baslangic_tarihi).offset(skip).limit(limit).all()


@router.post("", response_model=EventResponse, status_code=201)
def create_event(
    body: EventCreate,
    current_user: User = Depends(require_role(UserRole.teacher)),
    db: Session = Depends(get_db),
):
    qr = f"BTU-EVENT-{uuid.uuid4().hex[:10].upper()}"
    event = Event(
        organizator_id=current_user.id,
        qr_kod=qr,
        **body.model_dump(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).options(selectinload(Event.organizator)).filter(
        Event.id == event_id
    ).first()
    if not event:
        raise HTTPException(404, "Etkinlik bulunamadı")
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    current_user: User = Depends(require_role(UserRole.teacher)),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Etkinlik bulunamadı")
    if event.organizator_id != current_user.id:
        raise HTTPException(403, "Yalnızca organizatör silebilir")
    db.delete(event)
    db.commit()


@router.post("/{event_id}/attend", status_code=201)
def attend_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Etkinlik bulunamadı")
    mevcut = db.query(EventAttendee).filter(
        EventAttendee.event_id == event_id,
        EventAttendee.user_id == current_user.id,
    ).first()
    if mevcut:
        raise HTTPException(400, "Bu etkinliğe zaten kayıt oldunuz")
    if event.kapasite:
        mevcut_sayisi = db.query(EventAttendee).filter(
            EventAttendee.event_id == event_id
        ).count()
        if mevcut_sayisi >= event.kapasite:
            raise HTTPException(400, "Etkinlik kapasitesi dolmuş")
    db.add(EventAttendee(event_id=event_id, user_id=current_user.id))
    db.commit()
    kazanilan = rozet_kontrol_et(current_user.id, "event_attendance", db)
    return {"detail": "Etkinliğe kayıt olundu", "kazanilan_rozetler": kazanilan}


@router.delete("/{event_id}/attend", status_code=204)
def leave_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kayit = db.query(EventAttendee).filter(
        EventAttendee.event_id == event_id,
        EventAttendee.user_id == current_user.id,
    ).first()
    if not kayit:
        raise HTTPException(404, "Etkinlik kaydı bulunamadı")
    db.delete(kayit)
    db.commit()


@router.post("/qr-checkin", status_code=200)
def qr_checkin(
    body: QRCheckinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.qr_kod == body.qr_kod).first()
    if not event:
        raise HTTPException(404, "Geçersiz QR kodu")
    mevcut = db.query(EventAttendee).filter(
        EventAttendee.event_id == event.id,
        EventAttendee.user_id == current_user.id,
    ).first()
    if mevcut:
        return {"detail": "Zaten check-in yapıldı", "etkinlik": event.baslik}
    db.add(EventAttendee(event_id=event.id, user_id=current_user.id))
    db.commit()
    kazanilan = rozet_kontrol_et(current_user.id, "event_attendance", db)
    return {
        "detail": "Check-in başarılı",
        "etkinlik": event.baslik,
        "kazanilan_rozetler": kazanilan,
    }


@router.get("/{event_id}/attendees")
def list_attendees(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Etkinlik bulunamadı")
    if event.organizator_id != current_user.id:
        raise HTTPException(403, "Yalnızca organizatör görebilir")
    katilimcilar = db.query(EventAttendee).filter(
        EventAttendee.event_id == event_id
    ).all()
    return {"etkinlik": event.baslik, "katilimci_sayisi": len(katilimcilar)}
