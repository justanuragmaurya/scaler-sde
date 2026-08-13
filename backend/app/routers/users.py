from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import User
from app.schemas import ProfileUpdate, UserPublic
from app.serializers import user_public

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)) -> UserPublic:
    return user_public(user)


@router.patch("/me", response_model=UserPublic)
def update_me(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPublic:
    if body.display_name is not None:
        user.display_name = body.display_name.strip()
    if body.about is not None:
        user.about = body.about
    if body.avatar_key is not None:
        user.avatar_key = body.avatar_key
    db.add(user)
    db.flush()
    return user_public(user)
