# Grup sohbeti WebSocket — auth token query string'den okunur,
# in-memory ConnectionManager ile broadcast yapılır, mesaj DB'ye yazılır.
import json
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session, selectinload

from app.auth_utils import SECRET_KEY, ALGORITHM
from app.database import get_db, SessionLocal
from app.models import GroupMembership, GroupMessage, User

router = APIRouter(tags=["ws-chat"])


class ConnectionManager:
    """Grup bazlı bağlantı haritası ve broadcast yardımcısı."""

    def __init__(self) -> None:
        self.aktif: Dict[int, Set[WebSocket]] = defaultdict(set)
        self.online_users: Dict[int, Set[int]] = defaultdict(set)  # group_id -> {user_id}

    async def connect(self, group_id: int, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self.aktif[group_id].add(ws)
        self.online_users[group_id].add(user_id)

    def disconnect(self, group_id: int, user_id: int, ws: WebSocket) -> None:
        self.aktif[group_id].discard(ws)
        # aynı kullanıcının başka tab bağlantısı yoksa offline say
        # NOT: basit MVP — birden fazla tab takibi yok
        self.online_users[group_id].discard(user_id)
        if not self.aktif[group_id]:
            self.aktif.pop(group_id, None)
            self.online_users.pop(group_id, None)

    async def broadcast(self, group_id: int, payload: dict) -> None:
        data = json.dumps(payload, default=str)
        olu = []
        for ws in list(self.aktif.get(group_id, [])):
            try:
                await ws.send_text(data)
            except Exception:
                olu.append(ws)
        for ws in olu:
            self.aktif[group_id].discard(ws)


manager = ConnectionManager()


def _kullanici_dogrula(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        return None
    return db.query(User).filter(User.id == user_id, User.aktif == True).first()


def _uye_mi(db: Session, group_id: int, user_id: int) -> bool:
    return db.query(GroupMembership.id).filter(
        GroupMembership.group_id == group_id, GroupMembership.user_id == user_id
    ).first() is not None


@router.websocket("/ws/groups/{group_id}/chat")
async def ws_group_chat(websocket: WebSocket, group_id: int, token: str | None = None):
    db: Session = SessionLocal()
    try:
        user = _kullanici_dogrula(token, db)
        if not user or not _uye_mi(db, group_id, user.id):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(group_id, user.id, websocket)

        # Bağlanan kullanıcı için presence event yayınla
        await manager.broadcast(group_id, {
            "type": "presence",
            "user_id": user.id,
            "online": list(manager.online_users[group_id]),
        })

        try:
            while True:
                ham = await websocket.receive_text()
                try:
                    payload = json.loads(ham)
                    icerik = (payload.get("icerik") or "").strip()
                except Exception:
                    icerik = ham.strip()
                if not icerik:
                    continue

                msg = GroupMessage(group_id=group_id, sender_id=user.id, icerik=icerik)
                db.add(msg)
                db.commit()
                db.refresh(msg)

                await manager.broadcast(group_id, {
                    "type": "message",
                    "id": msg.id,
                    "group_id": group_id,
                    "sender_id": user.id,
                    "sender_ad": f"{user.ad} {user.soyad}".strip(),
                    "icerik": msg.icerik,
                    "created_at": msg.created_at.isoformat() if msg.created_at else datetime.now(timezone.utc).isoformat(),
                })
        except WebSocketDisconnect:
            pass
        finally:
            manager.disconnect(group_id, user.id, websocket)
            await manager.broadcast(group_id, {
                "type": "presence",
                "user_id": user.id,
                "online": list(manager.online_users.get(group_id, [])),
            })
    finally:
        db.close()


@router.get("/groups/{group_id}/presence", tags=["ws-chat"])
def online_users(group_id: int, db: Session = Depends(get_db)):
    return {"online": list(manager.online_users.get(group_id, []))}
