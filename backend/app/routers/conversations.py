from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user
from app.db import get_db
from app.models import Contact, Conversation, ConversationMember, Message, User
from app.schemas import ConversationCreate, ConversationOut, ConversationUpdate, MemberAdd, MemberOut
from app.serializers import last_preview, member_out, user_public
from app.storage import media_url
from app.ws import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _membership(db: Session, conversation_id: str, user_id: str) -> ConversationMember:
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


def _unread_count(db: Session, conversation_id: str, last_read_id: str | None) -> int:
    q = db.query(func.count(Message.id)).filter(
        Message.conversation_id == conversation_id,
        Message.deleted_at.is_(None),
    )
    if last_read_id:
        last = db.get(Message, last_read_id)
        if last:
            q = q.filter(Message.created_at > last.created_at)
    return int(q.scalar() or 0)


def serialize_conversation(db: Session, convo: Conversation, viewer: User) -> ConversationOut:
    member = next((m for m in convo.members if m.user_id == viewer.id), None)
    last = (
        db.query(Message)
        .filter(Message.conversation_id == convo.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    other = None
    display_name = convo.name
    avatar = None
    if convo.type == "dm":
        other_member = next((m for m in convo.members if m.user_id != viewer.id), None)
        if other_member:
            other = user_public(other_member.user)
            display_name = other.display_name
            avatar = other.avatar_url
    else:
        avatar = media_url(convo.avatar_key)
    return ConversationOut(
        id=convo.id,
        type=convo.type,
        name=display_name,
        avatar_url=avatar,
        created_at=convo.created_at,
        unread_count=_unread_count(db, convo.id, member.last_read_message_id if member else None),
        last_message=last_preview(last),
        members=[member_out(m) for m in convo.members],
        other_user=other,
    )


def _load_convo(db: Session, convo_id: str) -> Conversation:
    convo = (
        db.query(Conversation)
        .options(selectinload(Conversation.members).joinedload(ConversationMember.user))
        .filter(Conversation.id == convo_id)
        .first()
    )
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo


@router.get("", response_model=list[ConversationOut])
def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationOut]:
    memberships = (
        db.query(ConversationMember)
        .filter(ConversationMember.user_id == user.id)
        .all()
    )
    ids = [m.conversation_id for m in memberships]
    if not ids:
        return []
    convos = (
        db.query(Conversation)
        .options(selectinload(Conversation.members).joinedload(ConversationMember.user))
        .filter(Conversation.id.in_(ids))
        .all()
    )
    serialized = [serialize_conversation(db, c, user) for c in convos]
    serialized.sort(
        key=lambda c: c.last_message.created_at if c.last_message else c.created_at,
        reverse=True,
    )
    return serialized


@router.post("", response_model=ConversationOut)
async def create_conversation(
    body: ConversationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationOut:
    if body.type == "dm":
        if not body.user_id:
            raise HTTPException(status_code=400, detail="user_id required for DM")
        if body.user_id == user.id:
            raise HTTPException(status_code=400, detail="Cannot DM yourself")
        other = db.get(User, body.user_id)
        if not other:
            raise HTTPException(status_code=404, detail="User not found")
        existing = (
            db.query(Conversation)
            .join(ConversationMember)
            .filter(Conversation.type == "dm", ConversationMember.user_id == user.id)
            .all()
        )
        for convo in existing:
            member_ids = {m.user_id for m in convo.members} if convo.members else {
                m.user_id
                for m in db.query(ConversationMember).filter(
                    ConversationMember.conversation_id == convo.id
                )
            }
            if member_ids == {user.id, other.id}:
                convo = _load_convo(db, convo.id)
                return serialize_conversation(db, convo, user)
        convo = Conversation(type="dm", created_by=user.id)
        db.add(convo)
        db.flush()
        db.add_all(
            [
                ConversationMember(conversation_id=convo.id, user_id=user.id, role="admin"),
                ConversationMember(conversation_id=convo.id, user_id=other.id, role="admin"),
            ]
        )
        if not db.query(Contact).filter(Contact.owner_id == user.id, Contact.contact_user_id == other.id).first():
            db.add(Contact(owner_id=user.id, contact_user_id=other.id))
        db.flush()
        convo = _load_convo(db, convo.id)
        return serialize_conversation(db, convo, user)

    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Group name required")
    member_ids = list(dict.fromkeys([user.id, *body.member_ids]))
    for mid in member_ids:
        if not db.get(User, mid):
            raise HTTPException(status_code=404, detail=f"User {mid} not found")
    convo = Conversation(type="group", name=name, avatar_key=body.avatar_key, created_by=user.id)
    db.add(convo)
    db.flush()
    for mid in member_ids:
        db.add(
            ConversationMember(
                conversation_id=convo.id,
                user_id=mid,
                role="admin" if mid == user.id else "member",
            )
        )
    db.flush()
    convo = _load_convo(db, convo.id)
    payload = {"type": "group:updated", "conversation_id": convo.id}
    await manager.broadcast_users(member_ids, payload)
    return serialize_conversation(db, convo, user)


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationOut:
    _membership(db, conversation_id, user.id)
    convo = _load_convo(db, conversation_id)
    return serialize_conversation(db, convo, user)


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationOut:
    member = _membership(db, conversation_id, user.id)
    convo = _load_convo(db, conversation_id)
    if convo.type != "group":
        raise HTTPException(status_code=400, detail="Only groups can be updated")
    if member.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if body.name is not None:
        convo.name = body.name.strip()
    if body.avatar_key is not None:
        convo.avatar_key = body.avatar_key
    db.add(convo)
    db.flush()
    convo = _load_convo(db, conversation_id)
    await manager.broadcast_users(
        [m.user_id for m in convo.members],
        {"type": "group:updated", "conversation_id": convo.id},
    )
    return serialize_conversation(db, convo, user)


@router.post("/{conversation_id}/members", response_model=MemberOut)
async def add_member(
    conversation_id: str,
    body: MemberAdd,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MemberOut:
    member = _membership(db, conversation_id, user.id)
    convo = _load_convo(db, conversation_id)
    if convo.type != "group" or member.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    other = db.get(User, body.user_id)
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    if any(m.user_id == other.id for m in convo.members):
        raise HTTPException(status_code=400, detail="Already a member")
    new_member = ConversationMember(conversation_id=convo.id, user_id=other.id, role="member")
    db.add(new_member)
    db.flush()
    new_member.user = other
    await manager.broadcast_users(
        [m.user_id for m in convo.members] + [other.id],
        {"type": "group:updated", "conversation_id": convo.id},
    )
    return member_out(new_member)


@router.delete("/{conversation_id}/members/{user_id}")
async def remove_member(
    conversation_id: str,
    user_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    member = _membership(db, conversation_id, user.id)
    convo = _load_convo(db, conversation_id)
    if convo.type != "group":
        raise HTTPException(status_code=400, detail="Not a group")
    if user_id != user.id and member.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    target = next((m for m in convo.members if m.user_id == user_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.role == "admin" and user_id != user.id:
        admins = [m for m in convo.members if m.role == "admin"]
        if len(admins) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")
    ids = [m.user_id for m in convo.members]
    db.delete(target)
    db.flush()
    await manager.broadcast_users(ids, {"type": "group:updated", "conversation_id": convo.id})
    return {"ok": True}
