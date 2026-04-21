from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.lib.wiki_cache import get_all_docs

router = APIRouter()


@router.get("/api/home-stats")
async def get_home_stats() -> JSONResponse:
    try:
        docs = await get_all_docs()

        total_words = 0
        tag_set: set[str] = set()
        folder_set: set[str] = set()

        for doc in docs:
            total_words += doc.get("wordCount", 0)
            for tag in doc.get("tags", []):
                tag_set.add(tag)
            parts = doc["path"].split("/")
            if len(parts) > 1:
                for i in range(1, len(parts)):
                    folder_set.add("/".join(parts[:i]))

        sorted_docs = sorted(docs, key=lambda d: d.get("mtime", 0), reverse=True)
        recently_updated = [
            {
                "path": d["path"],
                "title": d["title"],
                "wordCount": d.get("wordCount", 0),
                "updatedAt": datetime.fromtimestamp(
                    d["mtime"] / 1000, tz=timezone.utc
                ).isoformat()
                if d.get("mtime")
                else None,
            }
            for d in sorted_docs[:10]
        ]

        now = datetime.now(tz=timezone.utc)
        now_ts = now.timestamp() * 1000
        thirty_days_ago = now_ts - 30 * 24 * 60 * 60 * 1000

        daily_map: dict[str, int] = {}
        for i in range(30):
            d = now - timedelta(days=i)
            daily_map[d.strftime("%Y-%m-%d")] = 0

        for doc in docs:
            mtime = doc.get("mtime", 0)
            if mtime >= thirty_days_ago:
                date_key = datetime.fromtimestamp(
                    mtime / 1000, tz=timezone.utc
                ).strftime("%Y-%m-%d")
                if date_key in daily_map:
                    daily_map[date_key] += 1

        daily_activity = sorted(
            [{"date": k, "count": v} for k, v in daily_map.items()],
            key=lambda x: x["date"],
        )

        return JSONResponse(
            {
                "ok": True,
                "data": {
                    "totalDocs": len(docs),
                    "totalWords": total_words,
                    "totalTags": len(tag_set),
                    "totalFolders": len(folder_set),
                    "recentlyUpdated": recently_updated,
                    "dailyActivity": daily_activity,
                },
            }
        )
    except Exception as exc:
        return JSONResponse(
            {"ok": False, "error": str(exc)}, status_code=500
        )
