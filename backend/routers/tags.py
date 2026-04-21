from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import WIKI_DATA_DIR
from backend.lib.frontmatter import parse_frontmatter

router = APIRouter()


def _walk_articles(
    dir_path: Path,
    relative_path: str,
    collector: list[tuple[str, str]],
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
            _walk_articles(entry, rel_path, collector)
        elif entry.name.endswith(".md"):
            try:
                content = entry.read_text(encoding="utf-8")
                collector.append((rel_path, content))
            except OSError:
                pass


@router.get("/api/tags")
async def get_tags(request: Request) -> JSONResponse:
    filter_tag = request.query_params.get("tag")

    try:
        collected: list[tuple[str, str]] = []
        _walk_articles(WIKI_DATA_DIR, "", collected)

        tag_counts: dict[str, int] = {}
        articles: list[dict[str, Any]] = []

        for rel_path, content in collected:
            fm = parse_frontmatter(content)
            tags: list[str] = fm.get("tags", [])
            if not tags:
                continue

            display_path = re.sub(r"\.md$", "", rel_path)
            display_path = re.sub(r"/_index$", "", display_path)

            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            title = (
                title_match.group(1).strip()
                if title_match
                else (display_path.rsplit("/", 1)[-1] or "")
            )

            for tag in tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

            if filter_tag and filter_tag in tags:
                articles.append({"path": display_path, "title": title, "tags": tags})

        if filter_tag:
            return JSONResponse(
                {"ok": True, "data": {"tag": filter_tag, "articles": articles}}
            )

        tag_list = sorted(
            [{"tag": t, "count": c} for t, c in tag_counts.items()],
            key=lambda x: x["count"],
            reverse=True,
        )
        return JSONResponse({"ok": True, "data": tag_list})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )
