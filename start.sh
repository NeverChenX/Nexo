#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# 1. Python 虚拟环境
if [ ! -d "backend/.venv" ]; then
    echo "Creating Python venv..."
    python3 -m venv backend/.venv
fi
source backend/.venv/bin/activate
pip install -q -r backend/requirements.txt

# 2. 确保 uploads 目录存在
mkdir -p public/uploads

# 3. 启动 Python API 后端（后台）
echo "Starting Python API on :8000..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info &
API_PID=$!

# 4. 启动 Next.js 前端
echo "Starting Next.js on :3000..."
npm run dev -- -p 3000 -H 0.0.0.0 &
NEXT_PID=$!

# 5. 等待任一进程退出
trap "kill $API_PID $NEXT_PID 2>/dev/null" EXIT
wait -n
