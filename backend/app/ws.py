from collections import defaultdict

from fastapi import WebSocket

from app.models import utcnow


class ConnectionManager:
    def __init__(self) -> None:
        self.by_user: dict[str, set[WebSocket]] = defaultdict(set)
        self.typing: dict[str, set[str]] = defaultdict(set)

    def is_online(self, user_id: str) -> bool:
        return bool(self.by_user.get(user_id))

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.by_user[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        sockets = self.by_user.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self.by_user.pop(user_id, None)
            self.typing.pop(user_id, None)

    async def send_user(self, user_id: str, payload: dict) -> None:
        for socket in list(self.by_user.get(user_id, ())):
            try:
                await socket.send_json(payload)
            except Exception:
                self.disconnect(user_id, socket)

    async def broadcast_users(self, user_ids: list[str], payload: dict, exclude: str | None = None) -> None:
        seen: set[str] = set()
        for user_id in user_ids:
            if user_id == exclude or user_id in seen:
                continue
            seen.add(user_id)
            await self.send_user(user_id, payload)

    async def presence(self, user_id: str, online: bool) -> None:
        await self.broadcast_all(
            {
                "type": "presence",
                "user_id": user_id,
                "online": online,
                "last_seen_at": None if online else utcnow().isoformat(),
            }
        )

    async def broadcast_all(self, payload: dict) -> None:
        for user_id in list(self.by_user):
            await self.send_user(user_id, payload)


manager = ConnectionManager()
