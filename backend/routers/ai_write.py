from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import OPENCLAW_GATEWAY_URL, OPENCLAW_GATEWAY_TOKEN

logger = logging.getLogger(__name__)

router = APIRouter()

ACTION_PROMPTS: dict[str, str] = {
    "summarize": "请用简洁的几句话总结以下内容，保留核心要点：\n\n{text}",
    "expand": "请扩展以下内容，添加更多细节和解释，保持原文风格：\n\n{text}",
    "rewrite": "请改写以下内容，使其更加清晰流畅，保持原意不变：\n\n{text}",
    "continue": "请基于以下内容继续往下写，保持风格和主题一致：\n\n{text}",
    "fix_grammar": "请修正以下内容中的语法和拼写错误，保持原意不变，只修正错误：\n\n{text}",
    "translate_zh": "请将以下内容翻译为中文，保持专业术语准确：\n\n{text}",
    "translate_en": "请将以下内容翻译为英文，保持专业术语准确：\n\n{text}",
    "simplify": "请简化以下内容，使其更易于理解，去除不必要的复杂表达：\n\n{text}",
    "formal": "请将以下内容改写为正式的书面语风格：\n\n{text}",
    "bullet_points": "请将以下内容转换为简洁的要点列表格式：\n\n{text}",
}


@router.post("/api/ai-write")
async def ai_write(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        text: str | None = body.get("text")
        action: str | None = body.get("action")

        if not text or not isinstance(text, str):
            return JSONResponse(
                {"ok": False, "error": "缺少 text 参数"}, status_code=400
            )
        if not action or action not in ACTION_PROMPTS:
            valid = ", ".join(ACTION_PROMPTS.keys())
            return JSONResponse(
                {"ok": False, "error": f"无效的 action，可选: {valid}"},
                status_code=400,
            )

        prompt = ACTION_PROMPTS[action].format(text=text)

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OPENCLAW_GATEWAY_URL}/v1/responses",
                json={
                    "model": "openclaw/main",
                    "input": prompt,
                },
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENCLAW_GATEWAY_TOKEN}",
                },
            )

        if resp.status_code != 200:
            return JSONResponse(
                {"ok": False, "error": f"AI 服务响应错误: {resp.status_code}"},
                status_code=502,
            )

        data = resp.json()
        result: str = ""
        output = data.get("output", [])
        if output:
            content = output[0].get("content", "")
            if isinstance(content, list) and content:
                result = content[0].get("text", "")
            elif isinstance(content, str):
                result = content

        if not result:
            return JSONResponse(
                {"ok": False, "error": "AI 未返回结果"},
                status_code=502,
            )

        return JSONResponse({"ok": True, "data": {"result": result}})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": f"AI 调用失败: {exc}"},
            status_code=500,
        )
