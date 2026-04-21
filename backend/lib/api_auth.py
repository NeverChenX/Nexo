from fastapi import Request, HTTPException
from backend.config import WIKI_API_KEY


def verify_api_key(request: Request) -> None:
    if not WIKI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="服务端未配置 WIKI_API_KEY",
        )

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="缺少 Authorization 头，格式: Bearer <your-api-key>",
        )

    token = auth_header[7:]
    if token != WIKI_API_KEY:
        raise HTTPException(status_code=403, detail="API Key 无效")
