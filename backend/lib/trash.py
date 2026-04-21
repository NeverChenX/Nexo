import asyncio
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from backend.config import WIKI_DATA_DIR, TRASH_DIR

_lock = asyncio.Lock()
_TRASH_META = TRASH_DIR / "meta.json"


async def _ensure_trash_dir() -> None:
    await asyncio.to_thread(TRASH_DIR.mkdir, parents=True, exist_ok=True)


async def _read_meta() -> list[dict]:
    try:
        raw = await asyncio.to_thread(lambda: _TRASH_META.read_text("utf-8"))
        return json.loads(raw)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


async def _write_meta(items: list[dict]) -> None:
    data = json.dumps(items, ensure_ascii=False, indent=2)
    await asyncio.to_thread(lambda: _TRASH_META.write_text(data, "utf-8"))


async def move_to_trash(article_path: str, is_folder: bool) -> dict:
    async with _lock:
        await _ensure_trash_dir()

        trash_id = os.urandom(8).hex()
        name = article_path.split("/")[-1] or article_path

        if is_folder:
            source = WIKI_DATA_DIR / article_path
        else:
            source = WIKI_DATA_DIR / (article_path + ".md")
            if not source.exists():
                source = WIKI_DATA_DIR / article_path / "_index.md"

        dest = TRASH_DIR / trash_id
        await asyncio.to_thread(source.rename, dest)

        item = {
            "id": trash_id,
            "originalPath": article_path,
            "isFolder": is_folder,
            "deletedAt": datetime.now(timezone.utc).isoformat(),
            "name": name,
        }

        meta = await _read_meta()
        meta.insert(0, item)
        await _write_meta(meta)
        return item


async def restore_from_trash(trash_id: str) -> bool:
    async with _lock:
        meta = await _read_meta()
        idx = next((i for i, m in enumerate(meta) if m["id"] == trash_id), -1)
        if idx == -1:
            return False

        item = meta[idx]
        trash_path = TRASH_DIR / item["id"]

        if item["isFolder"]:
            dest = WIKI_DATA_DIR / item["originalPath"]
        else:
            dest = WIKI_DATA_DIR / (item["originalPath"] + ".md")

        await asyncio.to_thread(dest.parent.mkdir, parents=True, exist_ok=True)

        if dest.exists():
            return False

        await asyncio.to_thread(trash_path.rename, dest)
        meta.pop(idx)
        await _write_meta(meta)
        return True


async def permanent_delete(trash_id: str) -> bool:
    async with _lock:
        meta = await _read_meta()
        idx = next((i for i, m in enumerate(meta) if m["id"] == trash_id), -1)
        if idx == -1:
            return False

        trash_path = TRASH_DIR / meta[idx]["id"]
        try:
            if trash_path.is_dir():
                await asyncio.to_thread(shutil.rmtree, str(trash_path))
            else:
                await asyncio.to_thread(trash_path.unlink)
        except FileNotFoundError:
            pass

        meta.pop(idx)
        await _write_meta(meta)
        return True


async def list_trash() -> list[dict]:
    await _ensure_trash_dir()
    return await _read_meta()


async def empty_trash() -> None:
    async with _lock:
        meta = await _read_meta()
        for item in meta:
            trash_path = TRASH_DIR / item["id"]
            try:
                if trash_path.is_dir():
                    await asyncio.to_thread(shutil.rmtree, str(trash_path))
                else:
                    await asyncio.to_thread(trash_path.unlink)
            except FileNotFoundError:
                pass
        await _write_meta([])
