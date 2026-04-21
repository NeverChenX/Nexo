from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import aiofiles

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

from backend.config import WIKI_DATA_DIR

router = APIRouter()


def _safe_path(article_path: str) -> Path:
    resolved = (WIKI_DATA_DIR / article_path).resolve()
    if not str(resolved).startswith(str(WIKI_DATA_DIR)):
        raise ValueError("Invalid path")
    return resolved


@router.post("/api/import")
async def import_files(
    files: list[UploadFile] = File(...),
    targetFolder: str = Form(""),
) -> JSONResponse:
    try:
        if not files:
            return JSONResponse(
                {"ok": False, "error": "No files provided"}, status_code=400
            )

        results: list[dict[str, Any]] = []

        for f in files:
            name = f.filename or ""
            if not name.endswith(".md"):
                results.append({"name": name, "path": "", "ok": False, "error": "Not a .md file"})
                continue

            content = (await f.read()).decode("utf-8")
            base_name = re.sub(r"\.md$", "", name)

            if re.search(r"[/\\]", base_name) or base_name in ("..", "."):
                results.append({"name": name, "path": "", "ok": False, "error": "Invalid filename"})
                continue

            article_path = f"{targetFolder}/{base_name}" if targetFolder else base_name
            file_path = _safe_path(article_path + ".md")

            final_path = file_path
            final_article_path = article_path
            counter = 1
            while final_path.exists():
                final_article_path = (
                    f"{targetFolder}/{base_name}-{counter}"
                    if targetFolder
                    else f"{base_name}-{counter}"
                )
                final_path = _safe_path(final_article_path + ".md")
                counter += 1

            try:
                final_path.parent.mkdir(parents=True, exist_ok=True)
                async with aiofiles.open(final_path, "w", encoding="utf-8") as out:
                    await out.write(content)
                results.append({"name": name, "path": final_article_path, "ok": True})
            except Exception as err:
                results.append({"name": name, "path": "", "ok": False, "error": str(err)})

        return JSONResponse({"ok": True, "data": results})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )
