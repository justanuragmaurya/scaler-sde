from datetime import timedelta

from sqlalchemy.orm import Session

from app.db import SessionLocal, engine
from app.models import (
    Base,
    Contact,
    Conversation,
    ConversationMember,
    Message,
    MessageReceipt,
    Reaction,
    User,
    utcnow,
)


SEED_USERS = [
    {"phone": "+15550000001", "display_name": "Alice Chen", "about": "Coffee, code, and long walks."},
    {"phone": "+15550000002", "display_name": "Bob Okonkwo", "about": "Designing things that feel quiet."},
    {"phone": "+15550000003", "display_name": "Carol Singh", "about": "Always down for a weekend hike."},
    {"phone": "+15550000004", "display_name": "Dave Patel", "about": "Music in the headphones, always."},
    {"phone": "+15550000005", "display_name": "Eve Romero", "about": "Building in public, slowly."},
]


def _msg(
    db: Session,
    convo: Conversation,
    sender: User,
    body: str,
    minutes_ago: int,
    **kwargs,
) -> Message:
    created = utcnow() - timedelta(minutes=minutes_ago)
    message = Message(
        conversation_id=convo.id,
        sender_id=sender.id,
        body=body,
        created_at=created,
        **kwargs,
    )
    db.add(message)
    db.flush()
    members = [m for m in convo.members]
    for member in members:
        if member.user_id == sender.id:
            continue
        db.add(
            MessageReceipt(
                message_id=message.id,
                user_id=member.user_id,
                delivered_at=created + timedelta(seconds=8),
                read_at=created + timedelta(minutes=2),
            )
        )
    return message


def seed(db: Session) -> None:
    if db.query(User).count():
        return

    users = [User(**row) for row in SEED_USERS]
    db.add_all(users)
    db.flush()
    alice, bob, carol, dave, eve = users

    for owner in users:
        for other in users:
            if owner.id == other.id:
                continue
            db.add(Contact(owner_id=owner.id, contact_user_id=other.id))

    def dm(a: User, b: User) -> Conversation:
        convo = Conversation(type="dm", created_by=a.id)
        db.add(convo)
        db.flush()
        db.add_all(
            [
                ConversationMember(conversation_id=convo.id, user_id=a.id, role="admin"),
                ConversationMember(conversation_id=convo.id, user_id=b.id, role="admin"),
            ]
        )
        db.flush()
        convo.members = (
            db.query(ConversationMember).filter(ConversationMember.conversation_id == convo.id).all()
        )
        return convo

    ab = dm(alice, bob)
    ac = dm(alice, carol)
    ad = dm(alice, dave)
    be = dm(bob, eve)

    _msg(db, ab, bob, "Hey — you still up for the 10am call?", 240)
    _msg(db, ab, alice, "Yep. I’ll send the notes in a minute.", 220)
    m = _msg(db, ab, bob, "Perfect. Also, did you see the new mockups?", 200)
    _msg(db, ab, alice, "They’re clean. I’d simplify the header though.", 180, reply_to_id=m.id)
    last_ab = _msg(db, ab, bob, "Agreed. I’ll push a revision tonight.", 12)

    _msg(db, ac, carol, "Trail was packed this morning 😅", 90)
    _msg(db, ac, alice, "Worth it though — those views.", 80)
    last_ac = _msg(db, ac, carol, "Same time Saturday?", 25)

    _msg(db, ad, dave, "Sent you the playlist.", 400)
    last_ad = _msg(db, ad, alice, "This is actually really good.", 30)

    last_be = _msg(db, be, eve, "Ship it. We can polish later.", 5)

    group = Conversation(type="group", name="Weekend crew", created_by=alice.id)
    db.add(group)
    db.flush()
    for user, role in ((alice, "admin"), (bob, "member"), (carol, "member"), (dave, "member")):
        db.add(ConversationMember(conversation_id=group.id, user_id=user.id, role=role))
    db.flush()
    group.members = (
        db.query(ConversationMember).filter(ConversationMember.conversation_id == group.id).all()
    )
    _msg(db, group, alice, "Anyone free for dinner Friday?", 70)
    _msg(db, group, bob, "I’m in. That new place on 5th?", 65)
    _msg(db, group, carol, "Yes! I can book a table.", 60)
    last_g = _msg(db, group, dave, "Count me in — 7:30 works.", 18)
    db.add(Reaction(message_id=last_g.id, user_id=alice.id, emoji="👍"))
    db.add(Reaction(message_id=last_g.id, user_id=bob.id, emoji="👍"))
    db.add(Reaction(message_id=last_ab.id, user_id=alice.id, emoji="❤️"))

    for convo, last, reader in (
        (ab, last_ab, alice),
        (ad, last_ad, alice),
        (be, last_be, bob),
        (group, last_g, alice),
    ):
        member = next(m for m in convo.members if m.user_id == reader.id)
        member.last_read_message_id = last.id

    db.flush()


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
