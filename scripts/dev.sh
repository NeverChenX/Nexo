#!/usr/bin/env bash
# ── never_wiki 开发服务器启动脚本 ──
# 自动清除 .next 缓存，确保每次启动都是干净状态
# 用法: ./scripts/dev.sh [port]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${1:-3000}"
HOST="0.0.0.0"
PIDFILE="$PROJECT_DIR/.next-dev.pid"
LOGFILE="$PROJECT_DIR/scripts/dev-server.log"

cd "$PROJECT_DIR"

# ── 1. 杀掉已有的 Next.js 开发服务器 ──
cleanup_old_processes() {
  # 通过 PID 文件
  if [ -f "$PIDFILE" ]; then
    local old_pid
    old_pid=$(cat "$PIDFILE" 2>/dev/null || true)
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      echo "[dev] 杀掉旧进程 PID=$old_pid"
      kill -TERM "$old_pid" 2>/dev/null || true
      sleep 1
      kill -9 "$old_pid" 2>/dev/null || true
    fi
    rm -f "$PIDFILE"
  fi

  # 通过端口查找残余进程
  local pids
  pids=$(lsof -ti ":$PORT" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "[dev] 端口 $PORT 被占用，清理进程: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

# ── 2. 清除 Next.js 缓存 ──
clear_cache() {
  echo "[dev] 清除 .next 缓存目录..."
  rm -rf "$PROJECT_DIR/.next"
  echo "[dev] 缓存已清除"
}

# ── 3. 启动开发服务器 ──
start_server() {
  echo "[dev] 启动 Next.js 开发服务器 (port=$PORT, host=$HOST)..."
  npx next dev -p "$PORT" -H "$HOST" >> "$LOGFILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PIDFILE"
  echo "[dev] 服务器已启动, PID=$pid, 日志: $LOGFILE"

  # 等待服务器就绪
  echo -n "[dev] 等待服务器就绪"
  for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "" "http://localhost:$PORT" 2>/dev/null; then
      echo ""
      echo "[dev] 服务器就绪! http://localhost:$PORT"
      return 0
    fi
    echo -n "."
    sleep 1
  done
  echo ""
  echo "[dev] 警告: 30秒内未检测到服务器就绪，请检查日志"
}

# ── 4. 信号处理：优雅退出 ──
trap_handler() {
  echo ""
  echo "[dev] 收到终止信号，清理中..."
  if [ -f "$PIDFILE" ]; then
    local pid
    pid=$(cat "$PIDFILE" 2>/dev/null || true)
    if [ -n "$pid" ]; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
    rm -f "$PIDFILE"
  fi
  exit 0
}
trap trap_handler SIGINT SIGTERM

# ── 执行 ──
cleanup_old_processes
clear_cache
start_server

# 前台保持运行，tail 日志
echo "[dev] 按 Ctrl+C 停止服务器"
tail -f "$LOGFILE"
