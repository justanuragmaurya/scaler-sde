from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.auth import decode_access_token
from app.db import SessionLocal
from app.models import ConversationMember, MessageReceipt, User, utcnow
from app.ws import manager

router = APIRouter()


def _mark_delivered(db: Session, user_id: str) -> None:
    now = utcnow()
    receipts = (
        db.query(MessageReceipt)
        .filter(MessageReceipt.user_id == user_id, MessageReceipt.delivered_at.is_(None))
        .all()
    )
    for receipt in receipts:
        receipt.delivered_at = now


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user_id = decode_access_token(token)
    except Exception:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            await websocket.close(code=4401)
            return
        await manager.connect(user.id, websocket)
        user.last_seen_at = utcnow()
        _mark_delivered(db, user.id)
        db.commit()
        await manager.presence(user.id, True)

        while True:
            data = await websocket.receive_json()
            event = data.get("type")
            if event == "ping":
                await websocket.send_json({"type": "pong"})
            elif event == "typing":
                conversation_id = data.get("conversation_id")
                typing = bool(data.get("typing"))
                if not conversation_id:
                    continue
                member_ids = [
                    row.user_id
                    for row in db.query(ConversationMember).filter(
                        ConversationMember.conversation_id == conversation_id
                    )
                ]
                if user.id not in member_ids:
                    continue
                await manager.broadcast_users(
                    member_ids,
                    {
                        "type": "typing",
                        "conversation_id": conversation_id,
                        "user_id": user.id,
                        "display_name": user.display_name,
                        "typing": typing,
                    },
                    exclude=user.id,
                )
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(user_id, websocket)
        try:
            user = db.get(User, user_id)
            if user:
                user.last_seen_at = utcnow()
                db.commit()
        except Exception:
            db.rollback()
        db.close()
        if not manager.is_online(user_id):
            await manager.presence(user_id, False)
