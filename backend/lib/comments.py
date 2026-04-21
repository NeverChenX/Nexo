import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone

from backend.config import COMMENTS_DIR


def _comments_file(article_path: str) -> str:
    h = hashlib.md5(article_path.encode("utf-8")).hexdigest()
    return str(COMMENTS_DIR / f"{h}.json")


async def _ensure_dir() -> None:
    await asyncio.to_thread(COMMENTS_DIR.mkdir, parents=True, exist_ok=True)


async def get_comments(article_path: str) -> list[dict]:
    await _ensure_dir()
    fpath = _comments_file(article_path)
    try:
        raw = await asyncio.to_thread(lambda: open(fpath, "r", encoding="utf-8").read())
        return json.loads(raw)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


async def add_comment(article_path: str, text: str) -> dict:
    await _ensure_dir()
    comments = await get_comments(article_path)
    comment = {
        "id": os.urandom(8).hex(),
        "text": text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    comments.append(comment)
    fpath = _comments_file(article_path)
    data = json.dumps(comments, ensure_ascii=False, indent=2)
    await asyncio.to_thread(lambda: open(fpath, "w", encoding="utf-8").write(data))
    return comment


async def delete_comment(article_path: str, comment_id: str) -> bool:
    await _ensure_dir()
    comments = await get_comments(article_path)
    idx = next((i for i, c in enumerate(comments) if c["id"] == comment_id), -1)
    if idx == -1:
        return False
    comments.pop(idx)
    fpath = _comments_file(article_path)
    data = json.dumps(comments, ensure_ascii=False, indent=2)
    await asyncio.to_thread(lambda: open(fpath, "w", encoding="utf-8").write(data))
    return True
