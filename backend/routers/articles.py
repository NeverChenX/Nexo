from __future__ import annotations

import logging
from urllib.parse import unquote

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.lib.storage import (
    read_article,
    write_article,
    is_article,
    is_folder,
    is_folder_page,
    promote_parent_if_needed,
    rename_article,
    move_article,
    delete_article,
    delete_folder,
)
from backend.lib.article_id import (
    article_path_to_id,
    find_article_path_by_id,
    find_article_path_by_path,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/articles")
async def get_article(request: Request) -> JSONResponse:
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

        if not await is_article(article_path):
            fuzzy_path = await find_article_path_by_path(article_path)
            if fuzzy_path and await is_article(fuzzy_path):
                article_path = fuzzy_path
            else:
                return JSONResponse(
                    {"ok": False, "error": "文章不存在"}, status_code=404
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
        logger.exception("读取文章失败")
        return JSONResponse({"ok": False, "error": "读取文章失败"}, status_code=500)


@router.post("/api/articles")
async def create_article(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        article_path: str | None = body.get("path")
        content: str = body.get("content", "")

        if not article_path or not isinstance(article_path, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 path 参数"}, status_code=400
            )

        last_slash = article_path.rfind("/")
        if last_slash > 0:
            parent_path = article_path[:last_slash]
            await promote_parent_if_needed(parent_path)

        if await is_article(article_path):
            return JSONResponse(
                {"ok": False, "error": "文章已存在"}, status_code=400
            )

        await write_article(article_path, content)
        return JSONResponse(
            {
                "ok": True,
                "data": {
                    "path": article_path,
                    "id": article_path_to_id(article_path),
                    "content": content,
                },
            }
        )
    except Exception:
        logger.exception("创建文章失败")
        return JSONResponse({"ok": False, "error": "创建文章失败"}, status_code=500)


@router.put("/api/articles")
async def update_article(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        path: str | None = body.get("path")
        content: str | None = body.get("content")

        if not path or not isinstance(path, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 path 参数"}, status_code=400
            )

        if content is None or not isinstance(content, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 content 参数"}, status_code=400
            )

        if not await is_article(path):
            return JSONResponse(
                {"ok": False, "error": "文章不存在"}, status_code=404
            )

        await write_article(path, content)
        return JSONResponse(
            {
                "ok": True,
                "data": {
                    "path": path,
                    "id": article_path_to_id(path),
                    "content": content,
                },
            }
        )
    except Exception:
        logger.exception("更新文章失败")
        return JSONResponse({"ok": False, "error": "更新文章失败"}, status_code=500)


@router.patch("/api/articles")
async def rename_or_move_article(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        old_path: str | None = body.get("oldPath")
        new_path: str | None = body.get("newPath")
        new_parent_path = body.get("newParentPath")

        # 移动操作
        if old_path and new_parent_path is not None:
            if not await is_article(old_path):
                return JSONResponse(
                    {"ok": False, "error": "原文章不存在"}, status_code=404
                )

            if new_parent_path:
                await promote_parent_if_needed(new_parent_path)

            result_path = await move_article(old_path, new_parent_path)
            return JSONResponse(
                {
                    "ok": True,
                    "data": {
                        "oldPath": old_path,
                        "oldId": article_path_to_id(old_path),
                        "newPath": result_path,
                        "newId": article_path_to_id(result_path),
                        "newParentPath": new_parent_path,
                    },
                }
            )

        # 重命名操作
        if not old_path or not new_path:
            return JSONResponse(
                {"ok": False, "error": "缺少 oldPath 或 newPath 参数"},
                status_code=400,
            )

        if not await is_article(old_path):
            return JSONResponse(
                {"ok": False, "error": "原文章不存在"}, status_code=404
            )

        if await is_article(new_path):
            return JSONResponse(
                {"ok": False, "error": "目标名称已存在"}, status_code=400
            )

        await rename_article(old_path, new_path)
        return JSONResponse(
            {
                "ok": True,
                "data": {
                    "oldPath": old_path,
                    "oldId": article_path_to_id(old_path),
                    "newPath": new_path,
                    "newId": article_path_to_id(new_path),
                },
            }
        )
    except Exception:
        logger.exception("重命名/移动文章失败")
        return JSONResponse(
            {"ok": False, "error": "重命名/移动文章失败"}, status_code=500
        )


@router.delete("/api/articles/{article_id:path}")
async def delete_article_endpoint(article_id: str) -> JSONResponse:
    try:
        article_path = unquote(article_id)

        if await is_folder_page(article_path):
            await delete_folder(article_path)
            return JSONResponse({"ok": True, "data": {"path": article_path}})

        if not await is_article(article_path):
            return JSONResponse(
                {"ok": False, "error": "文章不存在"}, status_code=404
            )

        await delete_article(article_path)
        return JSONResponse({"ok": True, "data": {"path": article_path}})
    except Exception:
        logger.exception("删除文章失败")
        return JSONResponse({"ok": False, "error": "删除失败"}, status_code=500)
