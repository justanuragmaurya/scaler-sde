from datetime import datetime

from pydantic import BaseModel, Field


class PhoneBody(BaseModel):
    phone: str = Field(min_length=6, max_length=32)


class VerifyOtpBody(BaseModel):
    phone: str = Field(min_length=6, max_length=32)
    code: str = Field(min_length=4, max_length=8)


class UserPublic(BaseModel):
    id: str
    phone: str
    display_name: str
    avatar_url: str | None = None
    about: str | None = None
    last_seen_at: datetime | None = None
    created_at: datetime
    online: bool = False

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new: bool
    user: UserPublic


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    about: str | None = Field(default=None, max_length=280)
    avatar_key: str | None = None


class ContactCreate(BaseModel):
    phone: str = Field(min_length=6, max_length=32)
    nickname: str | None = Field(default=None, max_length=80)


class ContactOut(BaseModel):
    id: str
    nickname: str | None
    user: UserPublic


class ConversationCreate(BaseModel):
    type: str = Field(pattern="^(dm|group)$")
    user_id: str | None = None
    name: str | None = Field(default=None, max_length=80)
    member_ids: list[str] = Field(default_factory=list)
    avatar_key: str | None = None


class ConversationUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    avatar_key: str | None = None


class MemberAdd(BaseModel):
    user_id: str


class MemberOut(BaseModel):
    user: UserPublic
    role: str
    joined_at: datetime


class ReplyPreview(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    body: str | None
    attachment_name: str | None = None


class ReactionOut(BaseModel):
    emoji: str
    count: int
    mine: bool
    user_ids: list[str]


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_avatar_url: str | None = None
    body: str | None
    reply_to: ReplyPreview | None = None
    attachment_url: str | None = None
    attachment_type: str | None = None
    attachment_size: int | None = None
    attachment_name: str | None = None
    created_at: datetime
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    status: str = "sent"
    reactions: list[ReactionOut] = Field(default_factory=list)


class MessageCreate(BaseModel):
    body: str | None = Field(default=None, max_length=8000)
    reply_to_id: str | None = None
    attachment_key: str | None = None
    attachment_type: str | None = None
    attachment_size: int | None = None
    attachment_name: str | None = None


class LastMessagePreview(BaseModel):
    id: str
    body: str | None
    sender_id: str
    created_at: datetime
    attachment_name: str | None = None


class ConversationOut(BaseModel):
    id: str
    type: str
    name: str | None
    avatar_url: str | None = None
    created_at: datetime
    unread_count: int = 0
    last_message: LastMessagePreview | None = None
    members: list[MemberOut] = Field(default_factory=list)
    other_user: UserPublic | None = None


class MarkReadBody(BaseModel):
    message_id: str


class ReactionBody(BaseModel):
    emoji: str = Field(min_length=1, max_length=16)


class PresignBody(BaseModel):
    filename: str
    content_type: str
    size: int
    kind: str = Field(pattern="^(avatar|attachment)$")


class PresignOut(BaseModel):
    key: str
    upload_url: str
    headers: dict[str, str] = Field(default_factory=dict)
    public_url: str | None = None
