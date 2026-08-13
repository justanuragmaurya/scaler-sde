import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import RefreshToken, User, as_utc, utcnow

bearer = HTTPBearer(auto_error=False)


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
    if not digits.startswith("+"):
        digits = "+" + digits
    return digits


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def create_access_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode(
        {"sub": user_id, "exp": exp},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return str(user_id)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def issue_refresh_token(db: Session, user_id: str) -> str:
    raw = secrets.token_urlsafe(48)
    expires = utcnow() + timedelta(days=settings.refresh_token_days)
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw),
            expires_at=expires,
        )
    )
    db.flush()
    return raw


def rotate_refresh_token(db: Session, raw: str) -> tuple[User, str]:
    token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_token(raw), RefreshToken.revoked_at.is_(None))
        .first()
    )
    if not token or as_utc(token.expires_at).timestamp() < as_utc(utcnow()).timestamp():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    token.revoked_at = utcnow()
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    new_raw = issue_refresh_token(db, user.id)
    return user, new_raw


def revoke_refresh_token(db: Session, raw: str) -> None:
    token = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(raw)).first()
    if token and token.revoked_at is None:
        token.revoked_at = utcnow()


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_access_token(creds.credentials)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
