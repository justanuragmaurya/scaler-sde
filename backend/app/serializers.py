from app.models import ConversationMember, Message, MessageReceipt, Reaction, User, utcnow
from app.schemas import (
    LastMessagePreview,
    MemberOut,
    MessageOut,
    ReactionOut,
    ReplyPreview,
    UserPublic,
)
from app.storage import media_url
from app.ws import manager


def user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        phone=user.phone,
        display_name=user.display_name,
        avatar_url=media_url(user.avatar_key),
        about=user.about,
        last_seen_at=user.last_seen_at,
        created_at=user.created_at,
        online=manager.is_online(user.id),
    )


def member_out(member: ConversationMember) -> MemberOut:
    return MemberOut(user=user_public(member.user), role=member.role, joined_at=member.joined_at)


def message_status(message: Message, viewer_id: str) -> str:
    if message.sender_id != viewer_id:
        return "sent"
    receipts = [r for r in message.receipts if r.user_id != message.sender_id]
    if receipts and all(r.read_at for r in receipts):
        return "read"
    if receipts and all(r.delivered_at for r in receipts):
        return "delivered"
    return "sent"


def serialize_message(message: Message, viewer_id: str) -> MessageOut:
    reply = None
    if message.reply_to:
        reply = ReplyPreview(
            id=message.reply_to.id,
            sender_id=message.reply_to.sender_id,
            sender_name=message.reply_to.sender.display_name if message.reply_to.sender else "Unknown",
            body=None if message.reply_to.deleted_at else message.reply_to.body,
            attachment_name=message.reply_to.attachment_name,
        )
    grouped: dict[str, list[Reaction]] = {}
    for reaction in message.reactions:
        grouped.setdefault(reaction.emoji, []).append(reaction)
    reactions = [
        ReactionOut(
            emoji=emoji,
            count=len(items),
            mine=any(item.user_id == viewer_id for item in items),
            user_ids=[item.user_id for item in items],
        )
        for emoji, items in grouped.items()
    ]
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=message.sender.display_name if message.sender else "Unknown",
        sender_avatar_url=media_url(message.sender.avatar_key) if message.sender else None,
        body=None if message.deleted_at else message.body,
        reply_to=reply,
        attachment_url=None if message.deleted_at else media_url(message.attachment_key),
        attachment_type=None if message.deleted_at else message.attachment_type,
        attachment_size=None if message.deleted_at else message.attachment_size,
        attachment_name=None if message.deleted_at else message.attachment_name,
        created_at=message.created_at,
        edited_at=message.edited_at,
        deleted_at=message.deleted_at,
        status=message_status(message, viewer_id),
        reactions=reactions,
    )


def last_preview(message: Message | None) -> LastMessagePreview | None:
    if not message:
        return None
    return LastMessagePreview(
        id=message.id,
        body=None if message.deleted_at else message.body,
        sender_id=message.sender_id,
        created_at=message.created_at,
        attachment_name=None if message.deleted_at else message.attachment_name,
    )


def ensure_receipts(message: Message, member_ids: list[str]) -> None:
    existing = {r.user_id for r in message.receipts}
    now = utcnow()
    for user_id in member_ids:
        if user_id == message.sender_id or user_id in existing:
            continue
        delivered = now if manager.is_online(user_id) else None
        message.receipts.append(
            MessageReceipt(user_id=user_id, delivered_at=delivered)
        )
