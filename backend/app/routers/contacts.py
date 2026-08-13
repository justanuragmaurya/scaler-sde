from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, normalize_phone
from app.db import get_db
from app.models import Contact, User
from app.schemas import ContactCreate, ContactOut, UserPublic
from app.serializers import user_public

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactOut])
def list_contacts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContactOut]:
    rows = (
        db.query(Contact)
        .options(joinedload(Contact.contact_user))
        .filter(Contact.owner_id == user.id)
        .order_by(Contact.created_at.desc())
        .all()
    )
    return [
        ContactOut(id=row.id, nickname=row.nickname, user=user_public(row.contact_user))
        for row in rows
    ]


@router.get("/search", response_model=list[UserPublic])
def search_users(
    q: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UserPublic]:
    query = q.strip()
    if len(query) < 2:
        return []
    phone = normalize_phone(query) if any(ch.isdigit() for ch in query) else None
    filters = [User.display_name.ilike(f"%{query}%"), User.phone.ilike(f"%{query}%")]
    if phone:
        filters.append(User.phone == phone)
    users = (
        db.query(User)
        .filter(User.id != user.id)
        .filter(or_(*filters))
        .limit(20)
        .all()
    )
    return [user_public(u) for u in users]


@router.post("", response_model=ContactOut)
def add_contact(
    body: ContactCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContactOut:
    phone = normalize_phone(body.phone)
    other = db.query(User).filter(User.phone == phone).first()
    if not other:
        raise HTTPException(status_code=404, detail="No Signal user with that number")
    if other.id == user.id:
        raise HTTPException(status_code=400, detail="You cannot add yourself")
    existing = (
        db.query(Contact)
        .filter(Contact.owner_id == user.id, Contact.contact_user_id == other.id)
        .first()
    )
    if existing:
        existing.nickname = body.nickname or existing.nickname
        db.add(existing)
        db.flush()
        return ContactOut(id=existing.id, nickname=existing.nickname, user=user_public(other))
    contact = Contact(owner_id=user.id, contact_user_id=other.id, nickname=body.nickname)
    db.add(contact)
    db.flush()
    return ContactOut(id=contact.id, nickname=contact.nickname, user=user_public(other))
