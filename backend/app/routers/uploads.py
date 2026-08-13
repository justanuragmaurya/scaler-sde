from fastapi import HTTPException, Request

from app.auth import get_current_user
from app.models import User
from app.schemas import PresignBody, PresignOut
from app.storage import local_path, media_url, presign_put, save_local
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/presign", response_model=PresignOut)
def presign(body: PresignBody, _user: User = Depends(get_current_user)) -> PresignOut:
    data = presign_put(body.kind, body.filename, body.content_type, body.size)
    return PresignOut(**data)


@router.put("/local/{key:path}")
async def local_put(key: str, request: Request) -> dict:
    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    save_local(key, data)
    return {"ok": True, "url": media_url(key)}


@router.get("/files/{key:path}")
def local_get(key: str) -> FileResponse:
    path = local_path(key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)
