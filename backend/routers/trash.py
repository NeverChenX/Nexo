from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.lib.trash import (
    list_trash,
    restore_from_trash,
    permanent_delete,
    empty_trash,
    move_to_trash,
)

router = APIRouter()


@router.get("/api/trash")
async def get_trash() -> JSONResponse:
    try:
        items = await list_trash()
        return JSONResponse({"ok": True, "data": items})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )


@router.post("/api/trash")
async def restore_trash(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        item_id: str | None = body.get("id")
        if not item_id:
            return JSONResponse(
                {"ok": False, "error": "Missing id"}, status_code=400
            )
        ok = await restore_from_trash(item_id)
        if not ok:
            return JSONResponse(
                {"ok": False, "error": "Restore failed or target exists"},
                status_code=400,
            )
        return JSONResponse({"ok": True})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )


@router.delete("/api/trash")
async def delete_trash(request: Request) -> JSONResponse:
    try:
        item_id = request.query_params.get("id")
        if item_id == "all":
            await empty_trash()
            return JSONResponse({"ok": True})
        if item_id:
            ok = await permanent_delete(item_id)
            if not ok:
                return JSONResponse(
                    {"ok": False, "error": "Item not found"}, status_code=404
                )
            return JSONResponse({"ok": True})
        return JSONResponse(
            {"ok": False, "error": "Missing id"}, status_code=400
        )
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )


@router.post("/api/trash-move")
async def trash_move(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        article_path: str | None = body.get("path")
        is_folder: bool = bool(body.get("isFolder"))

        if not article_path:
            return JSONResponse(
                {"ok": False, "error": "Missing path"}, status_code=400
            )

        item = await move_to_trash(article_path, is_folder)
        return JSONResponse({"ok": True, "data": item})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )
