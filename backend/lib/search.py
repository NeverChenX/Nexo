import asyncio
import re
from pathlib import Path

from backend.config import WIKI_DATA_DIR


async def search_articles(query: str, limit: int = 20) -> list[dict]:
    if not query.strip():
        return []

    q = query.lower()
    results: list[dict] = []
    await _walk_and_search(WIKI_DATA_DIR, "", q, results)

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]


async def _walk_and_search(
    dir_path: Path, relative_path: str, query: str, results: list[dict]
) -> None:
    try:
        entries = await asyncio.to_thread(lambda: list(dir_path.iterdir()))
    except OSError:
        return

    for entry in entries:
        if entry.name.startswith("."):
            continue

        rel = f"{relative_path}/{entry.name}" if relative_path else entry.name

        if entry.is_dir():
            await _walk_and_search(entry, rel, query, results)
        elif entry.name.endswith(".md"):
            try:
                content = await asyncio.to_thread(entry.read_text, "utf-8")
                result = _match_article(rel, content, query)
                if result:
                    results.append(result)
            except OSError:
                pass


def _match_article(article_path: str, content: str, query: str) -> dict | None:
    title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    display_path = re.sub(r"\.md$", "", article_path)
    display_path = re.sub(r"/_index$", "", display_path)
    title = title_match.group(1).strip() if title_match else display_path.split("/")[-1]

    lower_title = title.lower()
    lower_content = content.lower()

    score = 0
    match_context = ""

    if query in lower_title:
        score += 100
        match_context = title

    if query in display_path.lower():
        score += 50

    content_index = lower_content.find(query)
    if content_index >= 0:
        score += 10
        if not match_context:
            start = max(0, content_index - 40)
            end = min(len(content), content_index + len(query) + 60)
            snippet = content[start:end].replace("\n", " ").strip()
            if start > 0:
                snippet = "..." + snippet
            if end < len(content):
                snippet = snippet + "..."
            match_context = snippet

    if score == 0:
        return None

    return {"path": display_path, "title": title, "matchContext": match_context, "score": score}
