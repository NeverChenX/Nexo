import asyncio
import json
import os
from datetime import datetime, timezone

from backend.config import SHARE_LINKS_FILE

_lock = asyncio.Lock()


async def _init_file() -> None:
    if not SHARE_LINKS_FILE.exists():
        await asyncio.to_thread(lambda: SHARE_LINKS_FILE.write_text("{}", "utf-8"))


async def _read_all() -> dict:
    await _init_file()
    raw = await asyncio.to_thread(lambda: SHARE_LINKS_FILE.read_text("utf-8"))
    return json.loads(raw or "{}")


async def _save_all(links: dict) -> None:
    data = json.dumps(links, ensure_ascii=False, indent=2)
    await asyncio.to_thread(lambda: SHARE_LINKS_FILE.write_text(data, "utf-8"))


async def create_share_link(item_path: str, link_type: str) -> str:
    async with _lock:
        links = await _read_all()
        while True:
            token = os.urandom(16).hex()
            if token not in links:
                break

        links[token] = {
            "path": item_path,
            "type": link_type,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        await _save_all(links)
        return token


async def delete_share_link(token: str) -> bool:
    async with _lock:
        links = await _read_all()
        if token not in links:
            return False
        del links[token]
        await _save_all(links)
        return True


async def get_share_link(token: str) -> dict | None:
    links = await _read_all()
    return links.get(token)


async def get_all_shares() -> list[dict]:
    links = await _read_all()
    return [{"token": token, **link} for token, link in links.items()]
