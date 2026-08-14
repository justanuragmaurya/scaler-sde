# Signal Clone

A chat app that looks and works like Signal Desktop. You can sign in, add people, send live messages, and make groups.

Live app: [https://scaler-sde.anuragmaurya.com](https://scaler-sde.anuragmaurya.com/)

Real phone checks and real encryption are not built. The login code is always `123456`. Calls, stories, and linked devices are "coming soon" screens.

## What it is made of

- Website: Next.js
- Server: Python (FastAPI)
- Database: SQLite
- Live chat: a socket connection to the server
- Photos and files: S3-style cloud storage (Cloudflare R2)

## Run it on your machine

Server:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Copy `backend/.env.example` to `backend/.env` and fill in the storage keys.

Website:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run with Docker

Needs Docker Engine and Compose v2. From the repo root:

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). The API is on [http://localhost:8000](http://localhost:8000).

| Service | Image | Port | Notes |
| --- | --- | --- | --- |
| `frontend` | `signal-frontend:latest` | 3000 | Next.js standalone. Waits until the API health check passes. |
| `backend` | `signal-backend:latest` | 8000 | FastAPI + SQLite. Health: `GET /api/health`. |

Compose reads `backend/.env` if it exists (`required: false`), then overrides a few values so the containers talk to each other:

```
DATABASE_URL=sqlite:////data/signal.db
FRONTEND_ORIGIN=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

SQLite is stored at `/data/signal.db` inside the backend container, on the named volume `backend-data`, so chats survive `docker compose down`. Avatars and attachments still need the S3/R2 keys in `backend/.env`.

The website bakes in API URLs at **build** time (Next.js `NEXT_PUBLIC_*`). Compose defaults:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

Change those, then rebuild the frontend image (`docker compose up --build`).

Useful commands:

```bash
docker compose up --build          # foreground
docker compose up -d --build       # background
docker compose logs -f             # both services
docker compose logs -f backend
docker compose down                # stop, keep the database volume
docker compose down -v             # stop and wipe SQLite (re-seeds on next start)
```

To run only the API:

```bash
docker compose up --build backend
```

## Try it

Login code for every number: `123456`

| Phone | Name |
| --- | --- |
| +15550000001 | Alice Chen |
| +15550000002 | Bob Okonkwo |
| +15550000003 | Carol Singh |
| +15550000004 | Dave Patel |
| +15550000005 | Eve Romero |

Open Alice in one browser and Bob in a private window to see messages arrive live.

## Deployment

### Website (Vercel)

Hosted on Vercel.

URL: [https://scaler-sde.anuragmaurya.com](https://scaler-sde.anuragmaurya.com/)

Project folder: `frontend/`

Env vars on Vercel:

```
NEXT_PUBLIC_API_URL=https://scaler-backend.anuragmaurya.com
NEXT_PUBLIC_WS_URL=wss://scaler-backend.anuragmaurya.com/ws
```

These are baked in at build time. Change them, then redeploy.

### Server (AWS EC2)

Hosted on an EC2 instance.

URL: [https://scaler-backend.anuragmaurya.com](https://scaler-backend.anuragmaurya.com/)

Project folder: `backend/`

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Put a reverse proxy (nginx or similar) in front for HTTPS. Keep the SQLite file on disk so it survives restarts.

Env vars on the EC2 box:

```
DATABASE_URL=sqlite:///./signal.db
JWT_SECRET=<long random string>
FRONTEND_ORIGIN=https://scaler-sde.anuragmaurya.com
FRONTEND_ORIGINS=http://localhost:3000,https://scaler-sde.anuragmaurya.com
COOKIE_SECURE=true
COOKIE_SAMESITE=none
MOCK_OTP=123456
```

`COOKIE_SECURE` and `COOKIE_SAMESITE=none` are needed because the site and the API are on different hosts.

### Photos and files (S3)

Images and attachments are not saved on the EC2 disk. The browser uploads them straight to S3-compatible storage (Cloudflare R2 bucket `scaler-sde`).

Env vars on the server:

```
S3_ENDPOINT_URL=https://bd57f70b4e6b19220cb3f9972bb6ba8d.r2.cloudflarestorage.com
S3_BUCKET=scaler-sde
S3_ACCESS_KEY_ID=<from Cloudflare R2 API token>
S3_SECRET_ACCESS_KEY=<from Cloudflare R2 API token>
S3_REGION=auto
```

On the R2 bucket, allow the website origin in CORS (`GET` and `PUT` from `https://scaler-sde.anuragmaurya.com` and `http://localhost:3000`).

## What is stored

- Users, contacts, chats, messages
- Who has seen a message
- Emoji reactions
- Login refresh tokens

The first time the server starts, it creates the tables and fills in the demo users above.

## What is fake / unfinished

- Login code is always `123456`
- Messages are not really encrypted
- Voice/video calls, stories, and linked devices are placeholders
- Online / last seen only works while the person has the app open
