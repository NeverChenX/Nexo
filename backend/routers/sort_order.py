from __future__ import annotations

import asyncio
import json
import logging

import aiofiles
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import ORDER_FILE

logger = logging.getLogger(__name__)

router = APIRouter()

_lock = asyncio.Lock()


async def _read_orders() -> dict[str, list[str]]:
    try:
        async with aiofiles.open(ORDER_FILE, "r", encoding="utf-8") as f:
            raw = await f.read()
        return json.loads(raw)
    except (OSError, json.JSONDecodeError):
        return {}


@router.get("/api/sort-order")
async def get_sort_order() -> JSONResponse:
    orders = await _read_orders()
    return JSONResponse({"ok": True, "data": orders})


@router.post("/api/sort-order")
async def set_sort_order(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        parent_path = body.get("parentPath")
        order = body.get("order")

        if not isinstance(parent_path, str):
            return JSONResponse(
                {"ok": False, "error": "parentPath 必须是字符串"},
                status_code=400,
            )
        if not isinstance(order, list):
            return JSONResponse(
                {"ok": False, "error": "无效的排序数据"}, status_code=400
            )

        async with _lock:
            orders = await _read_orders()
            orders[parent_path] = order
            ORDER_FILE.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(ORDER_FILE, "w", encoding="utf-8") as f:
                await f.write(json.dumps(orders, indent=2, ensure_ascii=False))

        return JSONResponse({"ok": True})
    except Exception:
        logger.exception("保存排序失败")
        return JSONResponse({"ok": False, "error": "保存排序失败"}, status_code=500)
