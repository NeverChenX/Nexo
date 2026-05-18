#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# scripts/verify.sh — 交付前强制成型验证
#
# 用途：每次说"修完了"之前过这一道，确保
#   1. 生产 build 通过（lint + tsc 隐式跑）
#   2. 关键 API 端到端通（POST / PATCH / DELETE 不被 rewrite 拦截）
#   3. Reader 核心交互 smoke（选区 → 划线 → DOM wrap 命中选中文本）
#
# 用法：
#   ./scripts/verify.sh          # 完整四步
#   ./scripts/verify.sh --quick  # 跳过 build，只跑 API + smoke
#   ./scripts/verify.sh --build  # 只跑 build
#
# 退出码：0 成功；非零给出失败步骤
# ──────────────────────────────────────────────────────────────────────
set -uo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
PORT="${VERIFY_PORT:-3000}"
BASE_URL="http://127.0.0.1:${PORT}"
QUICK=0
ONLY_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    --build) ONLY_BUILD=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
  esac
done

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
gray()  { printf '\033[90m%s\033[0m\n' "$*"; }

step() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }

# ──── 1. build ─────────────────────────────────────────────────────────
if [[ $QUICK -eq 0 ]]; then
  step "1/4 npm run build"
  if ! npm run build 2>&1 | tail -25; then
    red "✗ build 失败"; exit 1
  fi
  green "✓ build OK"
  if [[ $ONLY_BUILD -eq 1 ]]; then exit 0; fi
fi

# ──── 2. 服务必须在跑 ──────────────────────────────────────────────────
step "2/4 服务可达性"
if ! curl -sS --max-time 3 "${BASE_URL}/" -o /dev/null; then
  red "✗ ${BASE_URL} 不可达，先 systemctl --user restart never-wiki.service"
  exit 2
fi
green "✓ ${BASE_URL} 在线"

# ──── 3. 关键 API 链路（防 rewrite 拦截 / 防静默 404）──────────────────
step "3/4 关键 API 链路（POST → PATCH → DELETE）"

ARTICLE_ID="$(curl -sS "${BASE_URL}/api/articles/list" | \
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["data"][0]["id"])' 2>/dev/null || true)"

if [[ -z "${ARTICLE_ID}" ]]; then
  red "✗ /api/articles/list 拿不到任何文章"; exit 3
fi
gray "  test articleId = ${ARTICLE_ID}"

PROBE_JSON="$(cat <<EOF
{"articleId":"${ARTICLE_ID}","anchor":{"startOffset":0,"endOffset":4,"quote":"verify-probe","selected":"verify-probe","prefix":"","suffix":""},"color":"yellow"}
EOF
)"
CREATE_RESP="$(curl -sS -X POST "${BASE_URL}/api/reader/marks" \
  -H 'content-type: application/json' -d "${PROBE_JSON}")"
MARK_ID="$(echo "${CREATE_RESP}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["id"])' 2>/dev/null || true)"
if [[ -z "${MARK_ID}" ]]; then
  red "✗ POST /api/reader/marks 失败：${CREATE_RESP}"; exit 3
fi
gray "  POST  ok → ${MARK_ID}"

PATCH_HEADERS="$(curl -sS -D - -o /tmp/verify_patch.json -X PATCH \
  "${BASE_URL}/api/reader/marks/${MARK_ID}" \
  -H 'content-type: application/json' -d '{"color":"red"}')"
PATCH_STATUS="$(echo "${PATCH_HEADERS}" | head -1 | awk '{print $2}')"
PATCH_COLOR="$(python3 -c 'import json; print(json.load(open("/tmp/verify_patch.json")).get("data",{}).get("color",""))' 2>/dev/null || true)"
if [[ "${PATCH_STATUS}" != "200" || "${PATCH_COLOR}" != "red" ]]; then
  red "✗ PATCH 失败 status=${PATCH_STATUS} color=${PATCH_COLOR}"
  red "  → 大概率 next.config.js 的 rewrites 又把动态路由代理给后端了"
  exit 3
fi
if echo "${PATCH_HEADERS}" | grep -qiE '^server:[[:space:]]*uvicorn'; then
  red "✗ PATCH 被代理给了 uvicorn，rewrites 形式错了"
  exit 3
fi
gray "  PATCH ok (color=red, served by Next.js)"

DELETE_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
  "${BASE_URL}/api/reader/marks/${MARK_ID}")"
if [[ "${DELETE_STATUS}" != "200" ]]; then
  red "✗ DELETE 失败 status=${DELETE_STATUS}"; exit 3
fi
gray "  DELETE ok"

green "✓ Marks PATCH/DELETE 链路通"

# ──── 4. 浏览器 smoke：选区 → 划线 → DOM 命中 ───────────────────────────
step "4/4 Puppeteer smoke：选区 → 划线 → wrap 命中选中文本"

if ! command -v node >/dev/null; then
  gray "  跳过：未找到 node"; exit 0
fi
if [[ ! -d /tmp/node_modules/puppeteer-core ]]; then
  gray "  跳过：未找到 /tmp/node_modules/puppeteer-core（开发机临时依赖）"
  exit 0
fi
if [[ ! -x /usr/bin/google-chrome ]]; then
  gray "  跳过：未找到 /usr/bin/google-chrome"
  exit 0
fi

# 把 JS 写到独立文件避免 heredoc bash 变量插值问题；参数走 env
SMOKE_JS="$(mktemp -t verify_smoke_XXXX.mjs)"
trap 'rm -f "${SMOKE_JS}" /tmp/verify_patch.json' EXIT
cat > "${SMOKE_JS}" <<'NODEEOF'
const puppeteer = await import('/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').then((m) => m.default);
const BASE = process.env.BASE_URL;
const aid = process.env.ARTICLE_ID;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let ok = false;
let detail = '';
try {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto(`${BASE}/read/${aid}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForSelector('.rd-content-root p, .rd-content-root li', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1500));
  const before = await p.evaluate(() => document.querySelectorAll('.rd-content-root .rd-mark').length);
  const sel = await p.evaluate(() => {
    const para = document.querySelector('.rd-content-root p');
    if (!para) return null;
    const t = document.createTreeWalker(para, NodeFilter.SHOW_TEXT).nextNode();
    if (!t || t.data.length < 10) return null;
    const r = document.createRange();
    r.setStart(t, 3); r.setEnd(t, 9);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    return r.toString();
  });
  if (!sel) { detail = 'NO_SELECTION'; throw new Error(detail); }
  const tb = await p.waitForSelector('.rd-seltoolbar', { timeout: 5000 }).catch(() => null);
  if (!tb) { detail = 'NO_TOOLBAR'; throw new Error(detail); }
  await p.evaluate(() => {
    const btn = document.querySelector('.rd-seltoolbar__btn--mark');
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
    btn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
  const got = await p.evaluate(() => {
    const m = Array.from(document.querySelectorAll('.rd-content-root .rd-mark'));
    return { count: m.length, texts: m.map((x) => x.textContent) };
  });
  // 清理：删掉刚刚插进去的探针 mark（用 selected 反查）
  await p.evaluate(async (aid, needle) => {
    const r = await fetch('/api/reader/marks?articleId=' + aid).then((r) => r.json());
    const item = (r.data || []).find((m) => m.anchor && m.anchor.selected === needle);
    if (item) await fetch('/api/reader/marks/' + item.id, { method: 'DELETE' });
  }, aid, sel);
  const hit = got.texts.some((t) => t === sel);
  if (got.count > before && hit) {
    ok = true;
    detail = `OK selected=${JSON.stringify(sel)}`;
  } else {
    detail = `FAIL selected=${JSON.stringify(sel)} marks=${JSON.stringify(got)}`;
  }
} catch (e) {
  detail = detail || ('ERR ' + e.message);
} finally {
  await b.close();
  console.log(detail);
  process.exit(ok ? 0 : 1);
}
NODEEOF

if BASE_URL="${BASE_URL}" ARTICLE_ID="${ARTICLE_ID}" node "${SMOKE_JS}"; then
  green "✓ 选区→划线→DOM wrap 命中（textContent 锚点正确）"
else
  red "✗ smoke 失败"; exit 4
fi

echo
green "════════════ ALL VERIFY PASSED ════════════"
