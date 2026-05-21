# Rozet kazanma kurallarını kontrol eder ve uygun rozeti kullanıcıya verir
from __future__ import annotations
from sqlalchemy.orm import Session

from app.models import (
    Application, Badge, DiaryEntry, Event, EventAttendee,
    TeamMember, UserBadge,
)


def _count_event(user_id: int, event: str, db: Session) -> int:
    mapping = {
        "application_submitted": lambda: db.query(Application).filter(Application.student_id == user_id).count(),
        "event_attendance": lambda: db.query(EventAttendee).filter(EventAttendee.user_id == user_id).count(),
        "team_join": lambda: db.query(TeamMember).filter(TeamMember.user_id == user_id).count(),
        "diary_entry_created": lambda: db.query(DiaryEntry).filter(DiaryEntry.student_id == user_id).count(),
        "first_login": lambda: 1,
    }
    fn = mapping.get(event)
    return fn() if fn else 0


def _ver_rozet(user_id: int, badge_id: int, db: Session) -> None:
    zaten_var = db.query(UserBadge).filter(
        UserBadge.user_id == user_id,
        UserBadge.badge_id == badge_id,
    ).first()
    if not zaten_var:
        db.add(UserBadge(user_id=user_id, badge_id=badge_id))
        db.commit()


def rozet_kontrol_et(user_id: int, event: str, db: Session) -> list[str]:
    """
    Tetiklenen event'e göre rozetleri kontrol eder, uygunları verir.
    Returns: kazanılan rozet adları listesi
    """
    kazanilan = []
    badges = db.query(Badge).all()
    count = _count_event(user_id, event, db)

    for badge in badges:
        kural = badge.kazanma_kurali or {}
        if kural.get("event") == event:
            threshold = kural.get("threshold", 1)
            if count >= threshold:
                _ver_rozet(user_id, badge.id, db)
                kazanilan.append(badge.ad)

    return kazanilan
