from __future__ import annotations

import logging
import secrets
import time

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse

from backend.config import UPLOAD_DIR, MAX_UPLOAD_SIZE

logger = logging.getLogger(__name__)

router = APIRouter()

MIME_EXT: dict[str, str] = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}

ATTACHMENT_MIME_EXT: dict[str, str] = {
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/csv": "csv",
}


def _get_image_ext(content_type: str) -> str:
    return MIME_EXT.get(content_type, "png")


def _unique_filename(ext: str) -> str:
    return f"{int(time.time() * 1000)}-{secrets.token_hex(4)}.{ext}"


@router.post("/api/uploads")
async def upload_file(
    image: UploadFile | None = File(None),
    file: UploadFile | None = File(None),
) -> JSONResponse:
    try:
        # 附件上传
        if file is not None:
            ext = ATTACHMENT_MIME_EXT.get(file.content_type or "")
            if not ext:
                return JSONResponse(
                    {"ok": False, "error": "Unsupported file type"}, status_code=400
                )
            data = await file.read()
            if len(data) > MAX_UPLOAD_SIZE:
                return JSONResponse(
                    {"ok": False, "error": "File too large (max 10MB)"},
                    status_code=400,
                )
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            filename = _unique_filename(ext)
            (UPLOAD_DIR / filename).write_bytes(data)
            return JSONResponse(
                {
                    "ok": True,
                    "data": {"url": f"/uploads/{filename}", "name": file.filename},
                }
            )

        # 图片上传
        if image is not None:
            content_type = image.content_type or ""
            if not content_type.startswith("image/"):
                return JSONResponse(
                    {"ok": False, "error": "Only image files supported"},
                    status_code=400,
                )
            data = await image.read()
            if len(data) > MAX_UPLOAD_SIZE:
                return JSONResponse(
                    {"ok": False, "error": "File too large (max 10MB)"},
                    status_code=400,
                )
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            ext = _get_image_ext(content_type)
            filename = _unique_filename(ext)
            (UPLOAD_DIR / filename).write_bytes(data)
            return JSONResponse(
                {"ok": True, "data": {"url": f"/uploads/{filename}"}}
            )

        return JSONResponse(
            {"ok": False, "error": "Missing file"}, status_code=400
        )
    except Exception:
        logger.exception("上传失败")
        return JSONResponse({"ok": False, "error": "上传失败"}, status_code=500)
