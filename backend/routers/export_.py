from __future__ import annotations

import html
from pathlib import Path
from urllib.parse import quote

import aiofiles

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from backend.config import WIKI_DATA_DIR

router = APIRouter()


def _safe_path(article_path: str) -> Path:
    resolved = (WIKI_DATA_DIR / article_path).resolve()
    if not str(resolved).startswith(str(WIKI_DATA_DIR)):
        raise ValueError("Invalid path")
    return resolved


@router.get("/api/export")
async def export_article(request: Request) -> Response:
    article_path = request.query_params.get("path", "")
    fmt = request.query_params.get("format", "md")

    if not article_path:
        return JSONResponse(
            {"ok": False, "error": "Missing path"}, status_code=400
        )

    try:
        file_path = _safe_path(article_path + ".md")
        try:
            async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                content = await f.read()
        except OSError:
            file_path = _safe_path(article_path + "/_index.md")
            async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                content = await f.read()

        filename = article_path.rsplit("/", 1)[-1] or "document"

        if fmt == "html":
            import re

            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            title = title_match.group(1) if title_match else filename
            html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<style>
body {{ font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 20px; color: rgba(0,0,0,0.95); line-height: 1.7; }}
h1 {{ font-size: 1.875em; font-weight: 700; margin-top: 40px; letter-spacing: -0.03em; }}
h2 {{ font-size: 1.375em; font-weight: 700; margin-top: 32px; letter-spacing: -0.02em; }}
h3 {{ font-size: 1.15em; font-weight: 700; margin-top: 26px; letter-spacing: -0.01em; }}
code {{ background: #f7f6f3; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.875em; }}
pre {{ background: #f7f6f3; padding: 1.2em; border-radius: 8px; overflow-x: auto; }}
pre code {{ background: none; padding: 0; font-size: 0.9em; }}
blockquote {{ border-left: 3px solid rgba(0,0,0,0.1); padding: 4px 0 4px 16px; margin: 8px 0; color: #615d59; }}
table {{ border-collapse: collapse; width: 100%; margin: 4px 0; font-size: 14px; }}
th, td {{ border: 1px solid rgba(0,0,0,0.1); padding: 8px 10px; text-align: left; }}
th {{ background: #f6f5f4; font-weight: 500; }}
img {{ max-width: 100%; }}
hr {{ border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 24px 0; }}
a {{ color: rgba(0,0,0,0.95); text-decoration: underline; }}
</style>
</head>
<body>
<pre style="white-space: pre-wrap; background: none; padding: 0; font-family: inherit;">{html.escape(content)}</pre>
</body>
</html>"""
            return Response(
                content=html_content,
                media_type="text/html; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="{quote(filename)}.html"',
                },
            )

        # 默认 Markdown
        return Response(
            content=content,
            media_type="text/markdown; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{quote(filename)}.md"',
            },
        )
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=404
        )
