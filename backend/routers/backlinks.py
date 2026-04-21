from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import TypedDict

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import WIKI_DATA_DIR

logger = logging.getLogger(__name__)

router = APIRouter()


class Backlink(TypedDict):
    path: str
    title: str


async def _walk_and_find_links(
    dir_path: Path,
    relative_path: str,
    target_path: str,
    results: list[Backlink],
) -> None:
    try:
        entries = sorted(dir_path.iterdir())
    except OSError:
        return

    for entry in entries:
        if entry.name.startswith("."):
            continue

        rel_path = f"{relative_path}/{entry.name}" if relative_path else entry.name

        if entry.is_dir():
            await _walk_and_find_links(entry, rel_path, target_path, results)
        elif entry.name.endswith(".md"):
            try:
                content = entry.read_text(encoding="utf-8")
            except OSError:
                continue

            display_path = re.sub(r"\.md$", "", rel_path)
            display_path = re.sub(r"/_index$", "", display_path)

            if display_path == target_path:
                continue

            has_page_link = (
                f'"pagePath":"{target_path}"' in content
                or f'"pagePath": "{target_path}"' in content
            )
            has_markdown_link = (
                f"]({target_path})" in content
                or f"](/{target_path})" in content
            )

            if has_page_link or has_markdown_link:
                title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
                title = (
                    title_match.group(1).strip()
                    if title_match
                    else (display_path.rsplit("/", 1)[-1] or "")
                )
                results.append({"path": display_path, "title": title})


@router.get("/api/backlinks")
async def get_backlinks(request: Request) -> JSONResponse:
    article_path = request.query_params.get("path", "")

    if not article_path:
        return JSONResponse(
            {"ok": False, "error": "Missing path"}, status_code=400
        )

    try:
        results: list[Backlink] = []
        await _walk_and_find_links(WIKI_DATA_DIR, "", article_path, results)
        return JSONResponse({"ok": True, "data": results})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )
