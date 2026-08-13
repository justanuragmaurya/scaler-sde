# Signal Clone

A Signal Desktop-style messenger : real-time chats, groups, receipts, and a privacy-focused UI. Encryption is mocked.

## Tech stack

- **Frontend:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Zustand
- **Backend:** FastAPI, SQLAlchemy 2.0, SQLite, WebSockets
- **Auth:** Phone + mock OTP (`123456`), JWT access token in `localStorage`, rotating refresh tokens hashed in SQLite (httpOnly cookie)
- **Uploads:** Cloudflare R2 / AWS S3 via presigned URLs only

## Architecture

```
Browser (Next.js)
  REST  →  FastAPI /api/*
  WS    →  FastAPI /ws?token=...
  PUT   →  R2/S3 (presigned)
FastAPI
  SQLite (users, contacts, conversations, messages, receipts, reactions, refresh_tokens)
```

In local development, Next.js rewrites `/api/*` to the FastAPI server so cookies stay same-origin.

## Setup

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

The API creates tables and seeds demo users on first boot.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional env files:

- `backend/.env` — copy from `backend/.env.example`
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` for production

## Seeded accounts

OTP for every number: **123456**

| Phone | Name |
| --- | --- |
| +15550000001 | Alice Chen |
| +15550000002 | Bob Okonkwo |
| +15550000003 | Carol Singh |
| +15550000004 | Dave Patel |
| +15550000005 | Eve Romero |

Log in as Alice in one browser and Bob in another (or a private window) to try live messaging.

## Database schema

- `users` — phone, display name, avatar key, about, last seen
- `refresh_tokens` — hashed refresh tokens, expiry, revocation
- `contacts` — owner → other user
- `conversations` — `dm` or `group`
- `conversation_members` — role (`admin`/`member`), `last_read_message_id`
- `messages` — body, reply-to, attachment key/type/size/name
- `message_receipts` — delivered_at / read_at
- `reactions` — unique (message, user, emoji)

Alembic lives in `backend/alembic/` (initial migration `001_initial`). Startup also runs `create_all` so a fresh SQLite file works without a manual migrate.

## API overview

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/request-otp` | Always succeeds for a valid phone |
| POST | `/api/auth/verify-otp` | Issues access JWT + refresh cookie |
| POST | `/api/auth/refresh` | Rotates refresh token |
| POST | `/api/auth/logout` | Revokes refresh token |
| GET/PATCH | `/api/users/me` | Profile |
| GET/POST | `/api/contacts` | List / add by phone |
| GET | `/api/contacts/search` | Name or phone |
| GET/POST | `/api/conversations` | List / create DM or group |
| GET/PATCH | `/api/conversations/{id}` | |
| POST/DELETE | `/api/conversations/{id}/members` | Admin add/remove |
| GET/POST | `/api/conversations/{id}/messages` | History / send |
| POST | `/api/conversations/{id}/read` | Read receipts |
| POST | `/api/messages/{id}/reactions` | Toggle emoji |
| POST | `/api/uploads/presign` | S3/R2 presigned upload URL |
| WS | `/ws?token=` | `message:new`, `message:status`, `typing`, `presence`, `reaction`, `group:updated` |

## Object storage

Set these for R2 or S3:

```
S3_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com   # omit for AWS
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto
S3_PUBLIC_BASE_URL=https://pub-xxx.r2.dev   # optional public CDN
```

The client requests a presigned PUT, uploads the file directly, then sends a message with `attachment_key`. Allow PUT from the frontend origin in the bucket CORS policy. S3/R2 env vars are required.

## Deploy

- **Frontend:** `https://scaler-sde.anuragmaurya.com` — set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` (see env below).
- **Backend:** `https://scaler-backend.anuragmaurya.com` — CORS allows the frontend origin. Use `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` so the refresh cookie works across subdomains.

## Assumptions

- Phone verification is mocked; OTP is always `123456`.
- End-to-end encryption, calls, stories, and linked devices are placeholders.
- Online / last-seen is based on WebSocket connections.
- SQLite is the assignment database; WAL mode is enabled for concurrent reads.
