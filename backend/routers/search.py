from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.lib.search import search_articles

router = APIRouter()


@router.get("/api/search")
async def search(request: Request) -> JSONResponse:
    q = request.query_params.get("q", "")
    raw_limit = request.query_params.get("limit", "20")
    try:
        limit = min(50, max(1, int(raw_limit)))
    except ValueError:
        limit = 20

    if not q.strip():
        return JSONResponse({"ok": True, "data": []})

    try:
        results = await search_articles(q, limit)
        return JSONResponse({"ok": True, "data": results})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )
