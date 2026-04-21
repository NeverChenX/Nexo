from __future__ import annotations

import re

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.lib.wiki_cache import get_all_docs

router = APIRouter()


@router.get("/api/graph")
async def get_graph() -> JSONResponse:
    try:
        docs = await get_all_docs()
        path_set = {d["path"] for d in docs}

        nodes = [
            {
                "id": d["path"],
                "title": d["title"],
                "wordCount": d["wordCount"],
                "tags": d["tags"],
                "isFolder": d["isFolder"],
            }
            for d in docs
        ]

        edges: list[dict[str, str]] = []
        edge_set: set[str] = set()

        def add_edge(source: str, target: str) -> None:
            key = f"{source}->{target}"
            if key not in edge_set:
                edge_set.add(key)
                edges.append({"source": source, "target": target})

        page_link_re = re.compile(r'"pagePath"\s*:\s*"([^"]+)"')
        md_link_re = re.compile(r"\]\(([^)]+)\)")

        for doc in docs:
            content = doc.get("content", "")

            for m in page_link_re.finditer(content):
                target = m.group(1)
                if target != doc["path"] and target in path_set:
                    add_edge(doc["path"], target)

            for m in md_link_re.finditer(content):
                target = m.group(1)
                if target.startswith(("http", "#", "mailto:")):
                    continue
                target = target.lstrip("/").removesuffix(".md")
                if target != doc["path"] and target in path_set:
                    add_edge(doc["path"], target)

            if "/" in doc["path"]:
                parent_path = "/".join(doc["path"].split("/")[:-1])
                if parent_path and parent_path in path_set:
                    add_edge(parent_path, doc["path"])

        return JSONResponse({"ok": True, "data": {"nodes": nodes, "edges": edges}})
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )
