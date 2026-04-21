import hashlib
import re

from backend.lib.storage import get_recursive_tree


def article_path_to_id(article_path: str) -> str:
    return hashlib.md5(article_path.encode("utf-8")).hexdigest()


def _collect_paths(items: list) -> list[str]:
    paths: list[str] = []
    for item in items:
        paths.append(item["path"])
        if item.get("children"):
            paths.extend(_collect_paths(item["children"]))
    return paths


async def find_article_path_by_id(id: str) -> str | None:
    if not re.match(r"^[a-f0-9]{32}$", id, re.IGNORECASE):
        return None
    tree = await get_recursive_tree()
    target = id.lower()
    for path in _collect_paths(tree):
        if article_path_to_id(path) == target:
            return path
    return None


async def find_article_path_by_path(input_path: str) -> str | None:
    tree = await get_recursive_tree()
    all_paths = _collect_paths(tree)

    if input_path in all_paths:
        return input_path

    suffix_matches = [p for p in all_paths if p == input_path or p.endswith("/" + input_path)]
    if len(suffix_matches) == 1:
        return suffix_matches[0]

    last_segment = input_path.split("/")[-1] if "/" in input_path else input_path
    if last_segment:
        name_matches = [p for p in all_paths if p.split("/")[-1] == last_segment]
        if len(name_matches) == 1:
            return name_matches[0]

    return None
