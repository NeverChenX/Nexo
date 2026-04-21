import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WIKI_DATA_DIR = BASE_DIR / "wiki-data"
SHARE_LINKS_FILE = BASE_DIR / "share-links.json"
UPLOAD_DIR = BASE_DIR / "public" / "uploads"
FRONTEND_DIR = BASE_DIR / "frontend" / "out"
ORDER_FILE = WIKI_DATA_DIR / ".order.json"
TRASH_DIR = WIKI_DATA_DIR / ".trash"
COMMENTS_DIR = WIKI_DATA_DIR / ".comments"

WIKI_API_KEY = os.environ.get("WIKI_API_KEY", "")
OPENCLAW_GATEWAY_URL = os.environ.get("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:18789")
OPENCLAW_GATEWAY_TOKEN = os.environ.get("OPENCLAW_GATEWAY_TOKEN", "")

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
