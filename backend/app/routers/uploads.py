from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.models import User
from app.schemas import PresignBody, PresignOut
from app.storage import presign_put

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/presign", response_model=PresignOut)
def presign(body: PresignBody, _user: User = Depends(get_current_user)) -> PresignOut:
    return PresignOut(**presign_put(body.kind, body.filename, body.content_type, body.size))
