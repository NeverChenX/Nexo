#!/usr/bin/env bash
# ── never_wiki 重新构建并重启 ──
# 改了源码后运行此脚本即可
# 用法: ./scripts/restart.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo "[rebuild] 重新构建..."
npx next build

echo "[rebuild] 重启服务..."
systemctl --user restart never-wiki.service

echo "[rebuild] 完成！"
