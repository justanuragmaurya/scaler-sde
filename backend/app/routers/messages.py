from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth import get_current_user
from app.db import get_db
from app.models import ConversationMember, Message, Reaction, User, utcnow
from app.schemas import MarkReadBody, MessageCreate, MessageOut, ReactionBody
from app.serializers import ensure_receipts, serialize_message
from app.ws import manager

router = APIRouter(tags=["messages"])


def _load_message(db: Session, message_id: str) -> Message:
    message = (
        db.query(Message)
        .options(
            joinedload(Message.sender),
            joinedload(Message.reply_to).joinedload(Message.sender),
            selectinload(Message.receipts),
            selectinload(Message.reactions),
        )
        .filter(Message.id == message_id)
        .first()
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


def _require_member(db: Session, conversation_id: str, user_id: str) -> ConversationMember:
    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return member


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(
    conversation_id: str,
    before: str | None = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MessageOut]:
    _require_member(db, conversation_id, user.id)
    limit = min(max(limit, 1), 100)
    q = (
        db.query(Message)
        .options(
            joinedload(Message.sender),
            joinedload(Message.reply_to).joinedload(Message.sender),
            selectinload(Message.receipts),
            selectinload(Message.reactions),
        )
        .filter(Message.conversation_id == conversation_id)
    )
    if before:
        cursor = db.get(Message, before)
        if cursor:
            q = q.filter(Message.created_at < cursor.created_at)
    rows = q.order_by(Message.created_at.desc()).limit(limit).all()
    rows.reverse()
    return [serialize_message(m, user.id) for m in rows]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut)
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    _require_member(db, conversation_id, user.id)
    text = (body.body or "").strip() or None
    if not text and not body.attachment_key:
        raise HTTPException(status_code=400, detail="Message is empty")
    if body.reply_to_id:
        reply = db.get(Message, body.reply_to_id)
        if not reply or reply.conversation_id != conversation_id:
            raise HTTPException(status_code=400, detail="Invalid reply")
    message = Message(
        conversation_id=conversation_id,
        sender_id=user.id,
        body=text,
        reply_to_id=body.reply_to_id,
        attachment_key=body.attachment_key,
        attachment_type=body.attachment_type,
        attachment_size=body.attachment_size,
        attachment_name=body.attachment_name,
    )
    db.add(message)
    db.flush()
    members = (
        db.query(ConversationMember)
        .filter(ConversationMember.conversation_id == conversation_id)
        .all()
    )
    ensure_receipts(message, [m.user_id for m in members])
    db.flush()
    message = _load_message(db, message.id)
    payload = {
        "type": "message:new",
        "conversation_id": conversation_id,
        "message": serialize_message(message, user.id).model_dump(mode="json"),
    }
    await manager.broadcast_users([m.user_id for m in members], payload)
    for member in members:
        if member.user_id != user.id and manager.is_online(member.user_id):
            await manager.send_user(
                user.id,
                {
                    "type": "message:status",
                    "conversation_id": conversation_id,
                    "message_id": message.id,
                    "status": "delivered",
                },
            )
            break
    return serialize_message(message, user.id)


@router.post("/conversations/{conversation_id}/read")
async def mark_read(
    conversation_id: str,
    body: MarkReadBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    member = _require_member(db, conversation_id, user.id)
    message = db.get(Message, body.message_id)
    if not message or message.conversation_id != conversation_id:
        raise HTTPException(status_code=404, detail="Message not found")
    member.last_read_message_id = message.id
    now = utcnow()
    pending = (
        db.query(Message)
        .options(selectinload(Message.receipts))
        .filter(
            Message.conversation_id == conversation_id,
            Message.created_at <= message.created_at,
            Message.sender_id != user.id,
        )
        .all()
    )
    sender_ids: set[str] = set()
    updated_ids: list[str] = []
    for item in pending:
        receipt = next((r for r in item.receipts if r.user_id == user.id), None)
        if receipt is None:
            from app.models import MessageReceipt

            receipt = MessageReceipt(message_id=item.id, user_id=user.id, delivered_at=now, read_at=now)
            db.add(receipt)
            updated_ids.append(item.id)
            sender_ids.add(item.sender_id)
        elif receipt.read_at is None:
            receipt.delivered_at = receipt.delivered_at or now
            receipt.read_at = now
            updated_ids.append(item.id)
            sender_ids.add(item.sender_id)
    db.flush()
    for message_id in updated_ids:
        await manager.broadcast_users(
            list(sender_ids | {user.id}),
            {
                "type": "message:status",
                "conversation_id": conversation_id,
                "message_id": message_id,
                "status": "read",
                "user_id": user.id,
            },
        )
    return {"ok": True}


@router.post("/messages/{message_id}/reactions", response_model=MessageOut)
async def add_reaction(
    message_id: str,
    body: ReactionBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    message = _load_message(db, message_id)
    _require_member(db, message.conversation_id, user.id)
    existing = (
        db.query(Reaction)
        .filter(
            Reaction.message_id == message.id,
            Reaction.user_id == user.id,
            Reaction.emoji == body.emoji,
        )
        .first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(Reaction(message_id=message.id, user_id=user.id, emoji=body.emoji))
    db.flush()
    message = _load_message(db, message.id)
    members = (
        db.query(ConversationMember)
        .filter(ConversationMember.conversation_id == message.conversation_id)
        .all()
    )
    await manager.broadcast_users(
        [m.user_id for m in members],
        {
            "type": "reaction",
            "conversation_id": message.conversation_id,
            "message": serialize_message(message, user.id).model_dump(mode="json"),
        },
    )
    return serialize_message(message, user.id)
