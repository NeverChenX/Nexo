from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.lib.share import (
    create_share_link,
    delete_share_link,
    get_all_shares,
    get_share_link,
)
from backend.lib.storage import exists, read_article, get_recursive_tree

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/share")
async def list_shares() -> JSONResponse:
    try:
        shares = await get_all_shares()
        return JSONResponse({"ok": True, "data": shares})
    except Exception:
        logger.exception("获取分享链接失败")
        return JSONResponse(
            {"ok": False, "error": "获取分享链接失败"}, status_code=500
        )


@router.post("/api/share")
async def create_share(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        path: str | None = body.get("path")
        share_type: str | None = body.get("type")

        if not path or not isinstance(path, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 path 参数"}, status_code=400
            )

        if share_type not in ("article", "folder"):
            return JSONResponse(
                {"ok": False, "error": "type 必须是 article 或 folder"},
                status_code=400,
            )

        if not await exists(path):
            return JSONResponse(
                {"ok": False, "error": "文件或文件夹不存在"}, status_code=404
            )

        token = await create_share_link(path, share_type)
        return JSONResponse(
            {"ok": True, "data": {"token": token, "path": path, "type": share_type}}
        )
    except Exception:
        logger.exception("创建分享链接失败")
        return JSONResponse(
            {"ok": False, "error": "创建分享链接失败"}, status_code=500
        )


@router.delete("/api/share")
async def remove_share(request: Request) -> JSONResponse:
    try:
        token = request.query_params.get("token")

        if not token:
            return JSONResponse(
                {"ok": False, "error": "缺少 token 参数"}, status_code=400
            )

        success = await delete_share_link(token)
        if not success:
            return JSONResponse(
                {"ok": False, "error": "分享链接不存在"}, status_code=404
            )

        return JSONResponse({"ok": True, "data": {"token": token}})
    except Exception:
        logger.exception("删除分享链接失败")
        return JSONResponse(
            {"ok": False, "error": "删除分享链接失败"}, status_code=500
        )


def _find_subtree(items: list[dict[str, Any]], target_path: str) -> list[dict[str, Any]] | None:
    for item in items:
        if item.get("path") == target_path:
            return item.get("children", [])
        children = item.get("children")
        if children and item.get("isFolder"):
            result = _find_subtree(children, target_path)
            if result is not None:
                return result
    return None


@router.get("/api/share/{token}")
async def get_share_content(token: str) -> JSONResponse:
    try:
        share_link = await get_share_link(token)

        if not share_link:
            return JSONResponse(
                {"ok": False, "error": "分享链接不存在或已过期"},
                status_code=404,
            )

        if share_link["type"] == "article":
            content = await read_article(share_link["path"])
            return JSONResponse(
                {
                    "ok": True,
                    "data": {
                        "type": "article",
                        "path": share_link["path"],
                        "content": content,
                    },
                }
            )
        elif share_link["type"] == "folder":
            tree = await get_recursive_tree()
            subtree = _find_subtree(tree, share_link["path"])
            return JSONResponse(
                {
                    "ok": True,
                    "data": {
                        "type": "folder",
                        "path": share_link["path"],
                        "contents": subtree or [],
                    },
                }
            )

        return JSONResponse(
            {"ok": False, "error": "未知的分享类型"}, status_code=500
        )
    except Exception:
        logger.exception("获取分享内容失败")
        return JSONResponse(
            {"ok": False, "error": "获取分享内容失败"}, status_code=500
        )
