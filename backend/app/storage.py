from pathlib import Path
from uuid import uuid4

import boto3
from botocore.config import Config
from fastapi import HTTPException

from app.config import settings

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "video/mp4",
}

LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


def _s3_enabled() -> bool:
    return bool(settings.s3_bucket and settings.s3_access_key_id and settings.s3_secret_access_key)


def _client():
    kwargs: dict = {
        "service_name": "s3",
        "aws_access_key_id": settings.s3_access_key_id,
        "aws_secret_access_key": settings.s3_secret_access_key,
        "region_name": settings.s3_region,
        "config": Config(signature_version="s3v4"),
    }
    if settings.s3_endpoint_url:
        kwargs["endpoint_url"] = settings.s3_endpoint_url
    return boto3.client(**kwargs)


def object_key(kind: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()[:8]
    return f"{kind}/{uuid4().hex}{ext}"


def presign_put(kind: str, filename: str, content_type: str, size: int) -> dict:
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    if size <= 0 or size > settings.upload_max_bytes:
        raise HTTPException(status_code=400, detail="File too large")
    key = object_key(kind, filename)
    if _s3_enabled():
        client = _client()
        upload_url = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.s3_bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=300,
        )
        public_url = None
        if settings.s3_public_base_url:
            public_url = f"{settings.s3_public_base_url.rstrip('/')}/{key}"
        return {
            "key": key,
            "upload_url": upload_url,
            "headers": {"Content-Type": content_type},
            "public_url": public_url,
        }
    LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return {
        "key": key,
        "upload_url": f"/api/uploads/local/{key}",
        "headers": {"Content-Type": content_type},
        "public_url": media_url(key),
    }


def save_local(key: str, data: bytes) -> None:
    dest = LOCAL_UPLOAD_DIR / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


def media_url(key: str | None) -> str | None:
    if not key:
        return None
    if _s3_enabled():
        if settings.s3_public_base_url:
            return f"{settings.s3_public_base_url.rstrip('/')}/{key}"
        client = _client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": key},
            ExpiresIn=3600,
        )
    return f"/api/uploads/files/{key}"


def local_path(key: str) -> Path:
    path = (LOCAL_UPLOAD_DIR / key).resolve()
    if not str(path).startswith(str(LOCAL_UPLOAD_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid key")
    return path
