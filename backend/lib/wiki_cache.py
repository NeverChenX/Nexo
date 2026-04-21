import asyncio
import time
from pathlib import Path

from backend.config import WIKI_DATA_DIR
from backend.lib.frontmatter import parse_frontmatter
from backend.lib.doc_stats import compute_stats

_cached_docs: list[dict] | None = None
_cache_timestamp: float = 0
_CACHE_TTL = 5.0


def invalidate_wiki_cache() -> None:
    global _cached_docs, _cache_timestamp
    _cached_docs = None
    _cache_timestamp = 0


async def get_all_docs() -> list[dict]:
    global _cached_docs, _cache_timestamp
    now = time.time()
    if _cached_docs is not None and now - _cache_timestamp < _CACHE_TTL:
        return _cached_docs

    docs: list[dict] = []
    await _walk_dir(WIKI_DATA_DIR, "", docs)
    _cached_docs = docs
    _cache_timestamp = time.time()
    return docs


async def _walk_dir(dir_path: Path, relative_path: str, collector: list[dict]) -> None:
    try:
        entries = await asyncio.to_thread(lambda: list(dir_path.iterdir()))
    except OSError:
        return

    md_files: list[dict] = []
    subdirs: list[tuple[Path, str]] = []

    for entry in entries:
        if entry.name.startswith("."):
            continue
        rel_path = f"{relative_path}/{entry.name}" if relative_path else entry.name

        if entry.is_dir():
            subdirs.append((entry, rel_path))
        elif entry.name.endswith(".md"):
            md_files.append({
                "full_path": entry,
                "rel_path": rel_path,
                "name": entry.name,
                "is_index": entry.name == "_index.md",
            })

    for sub_path, sub_rel in subdirs:
        await _walk_dir(sub_path, sub_rel, collector)

    async def _read_one(f: dict) -> dict | None:
        try:
            content = await asyncio.to_thread(f["full_path"].read_text, "utf-8")
            stat = await asyncio.to_thread(f["full_path"].stat)
            return {**f, "content": content, "mtime": stat.st_mtime * 1000}
        except OSError:
            return None

    results = await asyncio.gather(*[_read_one(f) for f in md_files])

    for r in results:
        if r is None:
            continue
        import re
        display_path = re.sub(r"\.md$", "", r["rel_path"])
        display_path = re.sub(r"/_index$", "", display_path)

        title_match = re.search(r"^#\s+(.+)$", r["content"], re.MULTILINE)
        title = title_match.group(1).strip() if title_match else display_path.split("/")[-1]

        parsed = parse_frontmatter(r["content"])
        stats = compute_stats(r["content"])

        collector.append({
            "path": display_path,
            "title": title,
            "content": r["content"],
            "wordCount": stats["word_count"],
            "tags": parsed["frontmatter"].get("tags", []),
            "isFolder": r["is_index"],
            "mtime": r["mtime"],
        })
