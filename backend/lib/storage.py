import asyncio
from pathlib import Path

from backend.config import WIKI_DATA_DIR
from backend.lib.wiki_cache import invalidate_wiki_cache

_migration_lock = asyncio.Lock()
_migration_done = False


def safe_path(*segments: str) -> Path:
    resolved = (WIKI_DATA_DIR / Path(*segments)).resolve()
    wiki_resolved = WIKI_DATA_DIR.resolve()
    if resolved != wiki_resolved and not str(resolved).startswith(str(wiki_resolved) + "/"):
        raise ValueError("路径不合法：禁止访问数据目录之外的位置")
    return resolved


async def _ensure_dir(dir_path: Path) -> None:
    await asyncio.to_thread(dir_path.mkdir, parents=True, exist_ok=True)


async def get_recursive_tree(
    dir_path: Path = WIKI_DATA_DIR,
    relative_path: str = "",
) -> list:
    global _migration_done
    if dir_path == WIKI_DATA_DIR and not _migration_done:
        async with _migration_lock:
            if not _migration_done:
                try:
                    await migrate_to_page_model()
                except Exception as e:
                    import logging
                    logging.warning("Page model migration failed: %s", e)
                _migration_done = True

    await _ensure_dir(dir_path)

    entries = await asyncio.to_thread(lambda: list(dir_path.iterdir()))
    item_map: dict[str, dict] = {}

    for entry in sorted(entries, key=lambda e: e.name):
        if entry.name.startswith(".") or entry.name == "_index.md":
            continue

        rel = f"{relative_path}/{entry.name}" if relative_path else entry.name

        if entry.is_dir():
            children = await get_recursive_tree(entry, rel)
            item_map[rel] = {"name": entry.name, "path": rel, "isFolder": True, "children": children}
        elif entry.name.endswith(".md"):
            doc_name = entry.name[:-3]
            doc_path = rel[:-3]
            if doc_path not in item_map:
                item_map[doc_path] = {"name": doc_name, "path": doc_path, "isFolder": False}

    items = list(item_map.values())
    items.sort(key=lambda x: (not x["isFolder"], x["name"]))
    return items


async def read_article(article_path: str) -> str:
    file_path = safe_path(f"{article_path}.md")
    try:
        return await asyncio.to_thread(file_path.read_text, "utf-8")
    except FileNotFoundError:
        index_path = safe_path(article_path, "_index.md")
        return await asyncio.to_thread(index_path.read_text, "utf-8")


async def write_article(article_path: str, content: str) -> None:
    dir_path = safe_path(article_path)
    try:
        stat = await asyncio.to_thread(dir_path.stat)
        if stat.st_mode & 0o040000:  # is directory
            index_path = dir_path / "_index.md"
            await asyncio.to_thread(index_path.write_text, content, "utf-8")
            invalidate_wiki_cache()
            return
    except FileNotFoundError:
        pass

    file_path = safe_path(f"{article_path}.md")
    parent_dir = file_path.parent
    await _ensure_dir(parent_dir)
    await asyncio.to_thread(file_path.write_text, content, "utf-8")

    wiki_resolved = WIKI_DATA_DIR.resolve()
    if parent_dir.resolve() != wiki_resolved:
        parent_index = parent_dir / "_index.md"
        if not parent_index.exists():
            dirname = parent_dir.name
            await asyncio.to_thread(parent_index.write_text, f"# {dirname}\n", "utf-8")

    invalidate_wiki_cache()


async def is_article(item_path: str) -> bool:
    try:
        p = safe_path(f"{item_path}.md")
        stat = await asyncio.to_thread(p.stat)
        return stat.st_mode & 0o100000 != 0
    except (FileNotFoundError, ValueError):
        pass
    try:
        p = safe_path(item_path, "_index.md")
        stat = await asyncio.to_thread(p.stat)
        return stat.st_mode & 0o100000 != 0
    except (FileNotFoundError, ValueError):
        return False


async def is_folder(item_path: str) -> bool:
    try:
        p = safe_path(item_path)
        stat = await asyncio.to_thread(p.stat)
        return bool(stat.st_mode & 0o040000)
    except (FileNotFoundError, ValueError):
        return False


async def is_folder_page(item_path: str) -> bool:
    try:
        dir_stat = await asyncio.to_thread(safe_path(item_path).stat)
        if not (dir_stat.st_mode & 0o040000):
            return False
        await asyncio.to_thread(safe_path(item_path, "_index.md").stat)
        return True
    except (FileNotFoundError, ValueError):
        return False


async def exists(item_path: str) -> bool:
    try:
        await asyncio.to_thread(safe_path(item_path).stat)
        return True
    except (FileNotFoundError, ValueError):
        pass
    try:
        await asyncio.to_thread(safe_path(f"{item_path}.md").stat)
        return True
    except (FileNotFoundError, ValueError):
        return False


async def delete_article(article_path: str) -> None:
    file_path = safe_path(f"{article_path}.md")
    await asyncio.to_thread(file_path.unlink)
    invalidate_wiki_cache()


async def delete_folder(folder_path: str) -> None:
    import shutil
    dir_path = safe_path(folder_path)
    await asyncio.to_thread(shutil.rmtree, str(dir_path))
    invalidate_wiki_cache()


async def create_folder(folder_path: str) -> None:
    dir_path = safe_path(folder_path)
    await _ensure_dir(dir_path)


async def rename_article(old_path: str, new_path: str) -> None:
    old_dir = safe_path(old_path)
    try:
        stat = await asyncio.to_thread(old_dir.stat)
        if stat.st_mode & 0o040000:
            new_dir = safe_path(new_path)
            await _ensure_dir(new_dir.parent)
            await asyncio.to_thread(old_dir.rename, new_dir)
            invalidate_wiki_cache()
            return
    except FileNotFoundError:
        pass

    old_file = safe_path(f"{old_path}.md")
    new_file = safe_path(f"{new_path}.md")
    await _ensure_dir(new_file.parent)
    await asyncio.to_thread(old_file.rename, new_file)
    invalidate_wiki_cache()


async def rename_folder(old_path: str, new_path: str) -> None:
    old_dir = safe_path(old_path)
    new_dir = safe_path(new_path)
    await _ensure_dir(new_dir.parent)
    await asyncio.to_thread(old_dir.rename, new_dir)


async def move_article(article_path: str, new_parent_path: str) -> str:
    name = article_path.split("/")[-1]
    new_path = f"{new_parent_path}/{name}" if new_parent_path else name

    old_dir = safe_path(article_path)
    try:
        stat = await asyncio.to_thread(old_dir.stat)
        if stat.st_mode & 0o040000:
            return await move_folder(article_path, new_parent_path)
    except FileNotFoundError:
        pass

    old_file = safe_path(f"{article_path}.md")
    new_file = safe_path(f"{new_path}.md")

    try:
        await asyncio.to_thread(new_file.stat)
        raise ValueError("目标位置已存在同名文章")
    except FileNotFoundError:
        pass

    await _ensure_dir(new_file.parent)
    await asyncio.to_thread(old_file.rename, new_file)
    invalidate_wiki_cache()
    return new_path


async def move_folder(folder_path: str, new_parent_path: str) -> str:
    name = folder_path.split("/")[-1]
    new_path = f"{new_parent_path}/{name}" if new_parent_path else name

    old_dir = safe_path(folder_path)
    new_dir = safe_path(new_path)

    try:
        await asyncio.to_thread(new_dir.stat)
        raise ValueError("目标位置已存在同名文件夹")
    except FileNotFoundError:
        pass

    if new_parent_path.startswith(folder_path + "/"):
        raise ValueError("不能将文件夹移动到自身子目录")

    await _ensure_dir(new_dir.parent)
    await asyncio.to_thread(old_dir.rename, new_dir)
    invalidate_wiki_cache()
    return new_path


async def promote_to_parent(article_path: str) -> None:
    file_path = safe_path(f"{article_path}.md")
    dir_path = safe_path(article_path)
    index_path = dir_path / "_index.md"

    content = await asyncio.to_thread(file_path.read_text, "utf-8")
    await _ensure_dir(dir_path)
    await asyncio.to_thread(index_path.write_text, content, "utf-8")
    await asyncio.to_thread(file_path.unlink)


async def promote_parent_if_needed(parent_path: str) -> None:
    file_path = safe_path(f"{parent_path}.md")
    try:
        await asyncio.to_thread(file_path.stat)
        await promote_to_parent(parent_path)
        return
    except FileNotFoundError:
        pass

    dir_path = safe_path(parent_path)
    try:
        stat = await asyncio.to_thread(dir_path.stat)
        if stat.st_mode & 0o040000:
            index_path = dir_path / "_index.md"
            if not index_path.exists():
                dirname = dir_path.name
                await asyncio.to_thread(index_path.write_text, f"# {dirname}\n", "utf-8")
    except FileNotFoundError:
        pass


async def get_folder_contents_detailed(folder_path: str) -> list:
    dir_path = safe_path(folder_path) if folder_path else WIKI_DATA_DIR
    await _ensure_dir(dir_path)

    entries = await asyncio.to_thread(lambda: list(dir_path.iterdir()))
    items: list[dict] = []

    for entry in entries:
        if entry.name.startswith(".") or entry.name == "_index.md":
            continue

        rel = f"{folder_path}/{entry.name}" if folder_path else entry.name

        if entry.is_dir():
            stat = await asyncio.to_thread(entry.stat)
            children = await asyncio.to_thread(lambda e=entry: [
                c.name for c in e.iterdir()
                if not c.name.startswith(".") and c.name != "_index.md"
            ])
            items.append({
                "name": entry.name,
                "path": rel,
                "isFolder": True,
                "updatedAt": _ts_to_iso(stat.st_mtime),
                "childCount": len(children),
            })
        elif entry.name.endswith(".md"):
            stat = await asyncio.to_thread(entry.stat)
            raw = await asyncio.to_thread(entry.read_text, "utf-8")
            first_line = ""
            for line in raw.split("\n"):
                if line.strip():
                    first_line = line
                    break
            import re
            title = re.sub(r"^#+\s*", "", first_line).strip() or entry.name[:-3]
            items.append({
                "name": entry.name[:-3],
                "path": rel[:-3] if rel.endswith(".md") else rel,
                "isFolder": False,
                "title": title,
                "updatedAt": _ts_to_iso(stat.st_mtime),
            })

    items.sort(key=lambda x: (not x["isFolder"], -(x.get("updatedAt") or "").__hash__()))
    # Sort: folders first, then by updatedAt descending
    items.sort(key=lambda x: (not x["isFolder"], x.get("updatedAt", "")), reverse=False)
    folders = [i for i in items if i["isFolder"]]
    files = [i for i in items if not i["isFolder"]]
    folders.sort(key=lambda x: x["name"])
    files.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
    return folders + files


async def migrate_to_page_model(
    dir_path: Path = WIKI_DATA_DIR,
    relative_path: str = "",
) -> None:
    try:
        entries = await asyncio.to_thread(lambda: list(dir_path.iterdir()))
    except OSError:
        return

    for entry in entries:
        if entry.name.startswith(".") or entry.name == "_index.md":
            continue
        if not entry.is_dir():
            continue

        index_path = entry / "_index.md"
        if not index_path.exists():
            await asyncio.to_thread(index_path.write_text, f"# {entry.name}\n", "utf-8")

        sub_rel = f"{relative_path}/{entry.name}" if relative_path else entry.name
        await migrate_to_page_model(entry, sub_rel)


def _ts_to_iso(ts: float) -> str:
    from datetime import datetime, timezone
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
