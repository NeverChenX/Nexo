#!/usr/bin/env bash
# ── never_wiki 生产模式启动脚本 ──
# 先 build 再 start，加载速度比 dev 模式快 10 倍以上
# 用法: ./scripts/prod.sh [port]

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-3000}"
HOST="0.0.0.0"

cd "$PROJECT_DIR"

echo "[prod] 构建 Next.js 生产包..."
npx next build

echo "[prod] 启动生产服务器 (port=$PORT)..."
exec npx next start -p "$PORT" -H "$HOST"
