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


def _require_s3() -> None:
    if not (settings.s3_bucket and settings.s3_access_key_id and settings.s3_secret_access_key):
        raise HTTPException(status_code=503, detail="Object storage is not configured")


def _client():
    _require_s3()
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


def media_url(key: str | None) -> str | None:
    if not key:
        return None
    if settings.s3_public_base_url:
        return f"{settings.s3_public_base_url.rstrip('/')}/{key}"
    client = _client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=3600,
    )
