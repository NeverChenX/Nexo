from __future__ import annotations

import logging
from urllib.parse import unquote

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.lib.storage import (
    create_folder,
    get_folder_contents_detailed,
    get_recursive_tree,
    exists,
    is_folder,
    rename_folder,
    move_folder,
    delete_folder,
    promote_parent_if_needed,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/folders")
async def get_folders(request: Request) -> JSONResponse:
    try:
        folder_path = request.query_params.get("path", "")
        include_tree = request.query_params.get("tree") == "true"

        if include_tree:
            tree = await get_recursive_tree()
            return JSONResponse({"ok": True, "data": tree})
        else:
            contents = await get_folder_contents_detailed(folder_path)
            return JSONResponse({"ok": True, "data": contents})
    except Exception:
        logger.exception("获取文件夹内容失败")
        return JSONResponse(
            {"ok": False, "error": "获取文件夹内容失败"}, status_code=500
        )


@router.post("/api/folders")
async def create_folder_endpoint(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        path: str | None = body.get("path")

        if not path or not isinstance(path, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 path 参数"}, status_code=400
            )

        if await exists(path):
            return JSONResponse(
                {"ok": False, "error": "文件夹已存在"}, status_code=400
            )

        await create_folder(path)
        return JSONResponse({"ok": True, "data": {"path": path}})
    except Exception:
        logger.exception("创建文件夹失败")
        return JSONResponse({"ok": False, "error": "创建文件夹失败"}, status_code=500)


@router.put("/api/folders")
async def rename_or_move_folder(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        old_path: str | None = body.get("oldPath")
        new_path: str | None = body.get("newPath")
        new_parent_path = body.get("newParentPath")

        # 移动操作
        if old_path and new_parent_path is not None:
            if not await exists(old_path) or not await is_folder(old_path):
                return JSONResponse(
                    {"ok": False, "error": "原文件夹不存在"}, status_code=404
                )

            if new_parent_path:
                await promote_parent_if_needed(new_parent_path)

            result_path = await move_folder(old_path, new_parent_path)
            return JSONResponse(
                {
                    "ok": True,
                    "data": {
                        "oldPath": old_path,
                        "newPath": result_path,
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

        if not await exists(old_path) or not await is_folder(old_path):
            return JSONResponse(
                {"ok": False, "error": "原文件夹不存在"}, status_code=404
            )

        if await exists(new_path):
            return JSONResponse(
                {"ok": False, "error": "目标名称已存在"}, status_code=400
            )

        await rename_folder(old_path, new_path)
        return JSONResponse(
            {"ok": True, "data": {"oldPath": old_path, "newPath": new_path}}
        )
    except Exception:
        logger.exception("重命名/移动文件夹失败")
        return JSONResponse(
            {"ok": False, "error": "重命名/移动文件夹失败"}, status_code=500
        )


@router.delete("/api/folders/{folder_id:path}")
async def delete_folder_endpoint(folder_id: str) -> JSONResponse:
    try:
        folder_path = unquote(folder_id)

        if not await exists(folder_path) or not await is_folder(folder_path):
            return JSONResponse(
                {"ok": False, "error": "文件夹不存在"}, status_code=404
            )

        await delete_folder(folder_path)
        return JSONResponse({"ok": True, "data": {"path": folder_path}})
    except Exception:
        logger.exception("删除文件夹失败")
        return JSONResponse({"ok": False, "error": "删除文件夹失败"}, status_code=500)
