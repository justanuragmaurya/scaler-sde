from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    issue_refresh_token,
    normalize_phone,
    revoke_refresh_token,
    rotate_refresh_token,
)
from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import AuthResponse, PhoneBody, VerifyOtpBody
from app.serializers import user_public

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, raw: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        raw,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
        max_age=settings.refresh_token_days * 86400,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/api/auth")


@router.post("/request-otp")
def request_otp(body: PhoneBody) -> dict:
    phone = normalize_phone(body.phone)
    if len(phone) < 8:
        raise HTTPException(status_code=400, detail="Enter a valid phone number")
    return {"ok": True, "phone": phone, "hint": f"Use OTP {settings.mock_otp}"}


@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(body: VerifyOtpBody, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    if body.code != settings.mock_otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    phone = normalize_phone(body.phone)
    user = db.query(User).filter(User.phone == phone).first()
    is_new = user is None
    if is_new:
        user = User(phone=phone, display_name="Signal User")
        db.add(user)
        db.flush()
    raw_refresh = issue_refresh_token(db, user.id)
    _set_refresh_cookie(response, raw_refresh)
    return AuthResponse(
        access_token=create_access_token(user.id),
        is_new=is_new,
        user=user_public(user),
    )


@router.post("/refresh", response_model=AuthResponse)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> AuthResponse:
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    user, new_raw = rotate_refresh_token(db, refresh_token)
    _set_refresh_cookie(response, new_raw)
    return AuthResponse(access_token=create_access_token(user.id), is_new=False, user=user_public(user))


@router.post("/logout")
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if refresh_token:
        revoke_refresh_token(db, refresh_token)
    _clear_refresh_cookie(response)
    return {"ok": True}
