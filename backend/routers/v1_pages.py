from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.lib.storage import (
    read_article,
    write_article,
    is_article,
    is_folder,
    is_folder_page,
    delete_article,
    delete_folder,
    promote_parent_if_needed,
    get_recursive_tree,
)
from backend.lib.article_id import article_path_to_id, find_article_path_by_id
from backend.lib.api_auth import verify_api_key

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/v1/pages")
async def get_page(request: Request) -> JSONResponse:
    auth_error = verify_api_key(request)
    if auth_error:
        return auth_error

    try:
        action = request.query_params.get("action", "read")

        if action == "tree":
            tree = await get_recursive_tree()
            return JSONResponse({"ok": True, "data": tree})

        raw_path = request.query_params.get("path")
        article_id = request.query_params.get("id")
        article_path = raw_path

        if not article_path and article_id:
            article_path = await find_article_path_by_id(article_id)

        if not article_path:
            return JSONResponse(
                {"ok": False, "error": "缺少 path 或 id 参数。获取页面树请传 ?action=tree"},
                status_code=400,
            )

        if not await is_article(article_path):
            return JSONResponse(
                {"ok": False, "error": "页面不存在"}, status_code=404
            )

        content = await read_article(article_path)
        folder_page = await is_folder(article_path)

        return JSONResponse(
            {
                "ok": True,
                "data": {
                    "path": article_path,
                    "id": article_path_to_id(article_path),
                    "content": content,
                    "isFolder": folder_page,
                },
            }
        )
    except Exception:
        logger.exception("[v1/pages GET]")
        return JSONResponse({"ok": False, "error": "读取失败"}, status_code=500)


@router.post("/api/v1/pages")
async def create_page(request: Request) -> JSONResponse:
    auth_error = verify_api_key(request)
    if auth_error:
        return auth_error

    try:
        body = await request.json()
        article_path: str | None = body.get("path")
        content: str = body.get("content", "")
        overwrite: bool = body.get("overwrite", False)

        if not article_path or not isinstance(article_path, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 path 参数"}, status_code=400
            )

        last_slash = article_path.rfind("/")
        if last_slash > 0:
            parent_path = article_path[:last_slash]
            await promote_parent_if_needed(parent_path)

        article_exists = await is_article(article_path)

        if article_exists and not overwrite:
            return JSONResponse(
                {"ok": False, "error": "页面已存在。如需覆盖请传 overwrite: true"},
                status_code=409,
            )

        await write_article(article_path, content)
        return JSONResponse(
            {
                "ok": True,
                "data": {
                    "path": article_path,
                    "id": article_path_to_id(article_path),
                    "content": content,
                    "created": not article_exists,
                    "updated": article_exists,
                },
            }
        )
    except Exception:
        logger.exception("[v1/pages POST]")
        return JSONResponse({"ok": False, "error": "创建失败"}, status_code=500)


@router.put("/api/v1/pages")
async def update_page(request: Request) -> JSONResponse:
    auth_error = verify_api_key(request)
    if auth_error:
        return auth_error

    try:
        body = await request.json()
        article_path: str | None = body.get("path")
        article_id: str | None = body.get("id")
        content: str | None = body.get("content")

        resolved_path = article_path
        if not resolved_path and article_id:
            resolved_path = await find_article_path_by_id(article_id)

        if not resolved_path or not isinstance(resolved_path, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 path 或 id 参数"}, status_code=400
            )

        if content is None or not isinstance(content, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 content 参数"}, status_code=400
            )

        if not await is_article(resolved_path):
            return JSONResponse(
                {"ok": False, "error": "页面不存在"}, status_code=404
            )

        await write_article(resolved_path, content)
        return JSONResponse(
            {
                "ok": True,
                "data": {
                    "path": resolved_path,
                    "id": article_path_to_id(resolved_path),
                    "content": content,
                },
            }
        )
    except Exception:
        logger.exception("[v1/pages PUT]")
        return JSONResponse({"ok": False, "error": "更新失败"}, status_code=500)


@router.delete("/api/v1/pages")
async def delete_page(request: Request) -> JSONResponse:
    auth_error = verify_api_key(request)
    if auth_error:
        return auth_error

    try:
        raw_path = request.query_params.get("path")
        article_id = request.query_params.get("id")
        article_path = raw_path

        if not article_path and article_id:
            article_path = await find_article_path_by_id(article_id)

        if not article_path:
            return JSONResponse(
                {"ok": False, "error": "缺少 path 或 id 参数"}, status_code=400
            )

        if await is_folder_page(article_path):
            await delete_folder(article_path)
            return JSONResponse(
                {
                    "ok": True,
                    "data": {
                        "path": article_path,
                        "id": article_path_to_id(article_path),
                    },
                }
            )

        if not await is_article(article_path):
            return JSONResponse(
                {"ok": False, "error": "页面不存在"}, status_code=404
            )

        await delete_article(article_path)
        return JSONResponse(
            {
                "ok": True,
                "data": {
                    "path": article_path,
                    "id": article_path_to_id(article_path),
                },
            }
        )
    except Exception:
        logger.exception("[v1/pages DELETE]")
        return JSONResponse({"ok": False, "error": "删除失败"}, status_code=500)
