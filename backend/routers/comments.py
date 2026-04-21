from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.lib.comments import get_comments, add_comment, delete_comment

router = APIRouter()


@router.get("/api/comments")
async def get_comments_endpoint(request: Request) -> JSONResponse:
    article_path = request.query_params.get("path", "")
    if not article_path:
        return JSONResponse(
            {"ok": False, "error": "Missing path"}, status_code=400
        )

    try:
        comments = await get_comments(article_path)
        return JSONResponse({"ok": True, "data": comments})
    except Exception:
        return JSONResponse(
            {"ok": False, "error": "Failed to load comments"}, status_code=500
        )


@router.post("/api/comments")
async def add_comment_endpoint(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        article_path: str | None = body.get("path")
        text: str | None = body.get("text")

        if not article_path or not text or not text.strip():
            return JSONResponse(
                {"ok": False, "error": "Missing path or text"}, status_code=400
            )

        comment = await add_comment(article_path, text.strip())
        return JSONResponse({"ok": True, "data": comment})
    except Exception:
        return JSONResponse(
            {"ok": False, "error": "Failed to add comment"}, status_code=500
        )


@router.delete("/api/comments")
async def delete_comment_endpoint(request: Request) -> JSONResponse:
    article_path = request.query_params.get("path", "")
    comment_id = request.query_params.get("id", "")

    if not article_path or not comment_id:
        return JSONResponse(
            {"ok": False, "error": "Missing path or id"}, status_code=400
        )

    try:
        ok = await delete_comment(article_path, comment_id)
        if not ok:
            return JSONResponse(
                {"ok": False, "error": "Comment not found"}, status_code=404
            )
        return JSONResponse({"ok": True})
    except Exception:
        return JSONResponse(
            {"ok": False, "error": "Failed to delete comment"}, status_code=500
        )
