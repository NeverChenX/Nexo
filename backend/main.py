from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.config import UPLOAD_DIR, WIKI_DATA_DIR

app = FastAPI(title="NeverWiki API", docs_url=None, redoc_url=None)

# ── CORS（允许 Next.js 前端访问） ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册所有 API 路由 ──
from backend.routers import (
    articles, folders, search, backlinks, graph, tags,
    home_stats, trash, share, comments, uploads,
    export_, import_, explain, sort_order, v1_pages,
    ai_write,
)

for module in [
    articles, folders, search, backlinks, graph, tags,
    home_stats, trash, share, comments, uploads,
    export_, import_, explain, sort_order, v1_pages,
    ai_write,
]:
    app.include_router(module.router)


# ── 确保必要目录存在 ──
@app.on_event("startup")
async def ensure_dirs():
    WIKI_DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── 静态资源：uploads ──
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
