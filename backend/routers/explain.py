from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import OPENCLAW_GATEWAY_URL, OPENCLAW_GATEWAY_TOKEN

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/explain")
async def explain(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        text: str | None = body.get("text")
        article_path: str | None = body.get("articlePath")

        if not text or not isinstance(text, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 text 参数"}, status_code=400
            )
        if not article_path or not isinstance(article_path, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 articlePath 参数"}, status_code=400
            )

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OPENCLAW_GATEWAY_URL}/v1/responses",
                json={
                    "model": "openclaw/main",
                    "input": f"请解释以下内容（简明扼要）：\n\n{text}",
                },
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENCLAW_GATEWAY_TOKEN}",
                },
            )

        if resp.status_code != 200:
            return JSONResponse(
                {"ok": False, "error": f"openclaw 响应错误: {resp.status_code}"},
                status_code=502,
            )

        data = resp.json()
        explanation: str = ""
        output = data.get("output", [])
        if output:
            content = output[0].get("content", "")
            if isinstance(content, list) and content:
                explanation = content[0].get("text", "")
            elif isinstance(content, str):
                explanation = content

        if not explanation:
            return JSONResponse(
                {"ok": False, "error": "openclaw 未返回解释内容"},
                status_code=502,
            )

        return JSONResponse({"ok": True, "data": {"explanation": explanation}})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": f"调用 openclaw 失败: {exc}"},
            status_code=500,
        )
