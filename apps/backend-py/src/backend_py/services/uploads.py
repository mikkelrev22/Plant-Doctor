"""Store plant photo uploads on disk (temporary until Node owns uploads)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image

from backend_py.config import config

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}

EXTENSION_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
}

DISPLAY_MAX_DIMENSION = 1024
DISPLAY_JPEG_QUALITY = 85
THUMB_MAX_DIMENSION = 160
THUMB_JPEG_QUALITY = 80


@dataclass
class ImageVariant:
    image_url: str
    storage_key: str
    mime_type: str
    buffer: bytes
    width: int
    height: int


@dataclass
class ThumbnailVariant:
    image_url: str
    storage_key: str
    width: int
    height: int


@dataclass
class StoredUpload:
    image_url: str
    storage_key: str
    mime_type: str
    width: int | None
    height: int | None
    buffer: bytes
    display: ImageVariant
    thumbnail: ThumbnailVariant


def _upload_root() -> Path:
    root = Path(config.upload_dir)
    if not root.is_absolute():
        root = config.workspace_root / root
    return root


def _public_url(storage_key: str) -> str:
    base = config.public_api_url.rstrip("/")
    return f"{base}/uploads/plant-photos/{storage_key}"


def _resize_jpeg(
    source: Image.Image, max_dim: int, quality: int
) -> tuple[bytes, int, int]:
    image = source.convert("RGB")
    image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    return buffer.getvalue(), image.width, image.height


async def store_plant_photo(file: UploadFile) -> StoredUpload:
    mime_type = file.content_type or "application/octet-stream"
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    original_name = file.filename or ""
    extension = Path(original_name).suffix.lower() or EXTENSION_BY_MIME.get(mime_type, "")
    date_segment = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    file_id = str(uuid.uuid4())
    storage_key = f"{date_segment}/{file_id}{extension}"
    display_key = f"{date_segment}/{file_id}-1024.jpg"
    thumb_key = f"{date_segment}/{file_id}-thumb.jpg"

    buffer = await file.read()
    if not buffer:
        raise HTTPException(status_code=400, detail="A plant image is required")

    try:
        with Image.open(BytesIO(buffer)) as source:
            width, height = source.size
            display_bytes, display_w, display_h = _resize_jpeg(
                source, DISPLAY_MAX_DIMENSION, DISPLAY_JPEG_QUALITY
            )
            thumb_bytes, thumb_w, thumb_h = _resize_jpeg(
                source, THUMB_MAX_DIMENSION, THUMB_JPEG_QUALITY
            )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid image file") from exc

    upload_root = _upload_root()
    absolute = upload_root / storage_key
    display_path = upload_root / display_key
    thumb_path = upload_root / thumb_key
    absolute.parent.mkdir(parents=True, exist_ok=True)

    written: list[Path] = []
    try:
        absolute.write_bytes(buffer)
        written.append(absolute)
        display_path.write_bytes(display_bytes)
        written.append(display_path)
        thumb_path.write_bytes(thumb_bytes)
        written.append(thumb_path)
    except Exception:
        for path in written:
            path.unlink(missing_ok=True)
        raise

    return StoredUpload(
        image_url=_public_url(storage_key),
        storage_key=storage_key,
        mime_type=mime_type,
        width=width,
        height=height,
        buffer=buffer,
        display=ImageVariant(
            image_url=_public_url(display_key),
            storage_key=display_key,
            mime_type="image/jpeg",
            buffer=display_bytes,
            width=display_w,
            height=display_h,
        ),
        thumbnail=ThumbnailVariant(
            image_url=_public_url(thumb_key),
            storage_key=thumb_key,
            width=thumb_w,
            height=thumb_h,
        ),
    )
