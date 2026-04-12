# AI 解释说明追加功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击 AI 面板"解释说明"按钮，调用本地 openclaw main_agent 解释选中文本，并自动追加到当前文章末尾保存。

**Architecture:** 前端调用新建的 `/api/explain` Next.js 路由，该路由服务端向 openclaw gateway（port 18789）发起请求，拿到解释文本后前端用 `PUT /api/articles` 将内容更新到磁盘。网关 token 存于 `.env.local` 不进 git。

**Tech Stack:** Next.js 15, TypeScript, openclaw gateway REST API (`/v1/responses`)

---

### Task 1: 添加 .env.local 并更新 .gitignore

**Files:**
- Create: `.env.local`
- Modify: `.gitignore`

- [ ] **Step 1: 创建 `.env.local`**

```
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=***REDACTED-OPENCLAW-TOKEN***
```

- [ ] **Step 2: 确认 `.gitignore` 中含 `.env.local`**

运行：`grep '\.env' .gitignore`

若没有则在 `.gitignore` 中追加：
```
.env.local
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ensure .env.local is gitignored"
```

（`.env.local` 不加入 git）

---

### Task 2: 新建 `/api/explain` 后端路由

**Files:**
- Create: `app/api/explain/route.ts`

- [ ] **Step 1: 创建文件**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, articlePath } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ ok: false, error: '缺少 text 参数' }, { status: 400 });
    }
    if (!articlePath || typeof articlePath !== 'string') {
      return NextResponse.json({ ok: false, error: '缺少 articlePath 参数' }, { status: 400 });
    }

    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL ?? 'http://127.0.0.1:18789';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN ?? '';

    const res = await fetch(`${gatewayUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: 'openclaw/main',
        input: `请解释以下内容（简明扼要）：\n\n${text}`,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `openclaw 响应错误: ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    const explanation: string =
      json?.output?.[0]?.content?.[0]?.text ?? json?.output?.[0]?.content ?? '';

    if (!explanation) {
      return NextResponse.json({ ok: false, error: 'openclaw 未返回解释内容' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, data: { explanation } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ ok: false, error: `调用 openclaw 失败: ${message}` }, { status: 500 });
  }
}
```

- [ ] **Step 2: 手动验证接口可用**

启动开发服务器后运行：
```bash
curl -s -X POST http://localhost:3002/api/explain \
  -H "Content-Type: application/json" \
  -d '{"text":"mb-3 是 Tailwind CSS 的间距类","articlePath":"test/doc.md"}'
```

预期：返回含 `explanation` 的 JSON，`ok: true`

- [ ] **Step 3: Commit**

```bash
git add app/api/explain/route.ts
git commit -m "feat: add /api/explain route proxying to openclaw main_agent"
```

---

### Task 3: 在 view 页面接线"解释说明"按钮

**Files:**
- Modify: `app/view/page.tsx`

仅修改以下两处：

**A. 在已有 state 声明区（约第 31 行之后）添加 loading state：**

```typescript
const [explainLoading, setExplainLoading] = useState(false);
```

**B. 在 `handleDelete` 之后、`handleSelectItem` 之前添加 `handleExplain` 函数：**

```typescript
const handleExplain = async () => {
  if (!selectedText || !currentPath || !articleId) return;
  setExplainLoading(true);
  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selectedText, articlePath: currentPath }),
    });
    const json = await res.json();
    if (!json.ok) {
      alert('解释失败: ' + json.error);
      return;
    }

    const snippet = selectedText.length > 100 ? selectedText.slice(0, 100) + '…' : selectedText;
    const appendBlock = `\n\n---\n\n> **📝 AI 解释**\n>\n> **选中内容：** ${snippet}\n>\n> ${json.data.explanation.replace(/\n/g, '\n> ')}`;
    const newContent = content + appendBlock;

    const saveRes = await fetch('/api/articles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath, content: newContent }),
    });
    const saveJson = await saveRes.json();
    if (!saveJson.ok) {
      alert('保存失败: ' + saveJson.error);
      return;
    }

    setContent(newContent);
    setShowAIPanel(false);
    setSelectedText('');
  } catch (error) {
    alert('解释说明出错: ' + error);
  } finally {
    setExplainLoading(false);
  }
};
```

**C. 将"解释说明"按钮从静态改为可点击（约第 368-372 行）：**

将：
```tsx
<button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
  <BookOpen className="h-4 w-4 text-blue-500" />
  解释说明
</button>
```

改为：
```tsx
<button
  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
  onClick={handleExplain}
  disabled={explainLoading || !articleId}
>
  <BookOpen className="h-4 w-4 text-blue-500" />
  {explainLoading ? '解释中...' : '解释说明'}
</button>
```

- [ ] **Step 1: 添加 `explainLoading` state**（位置：第 31 行附近，其他 state 声明处）

- [ ] **Step 2: 添加 `handleExplain` 函数**（位置：`handleDelete` 之后）

- [ ] **Step 3: 更新"解释说明"按钮**（约第 368-372 行）

- [ ] **Step 4: 验证页面编译无报错**

```bash
cd /home/Neverchen/project/never_wiki && npx tsc --noEmit 2>&1 | head -20
```

预期：无错误输出

- [ ] **Step 5: 手动测试**

1. 启动开发服务器（已有则跳过）
2. 打开 `/view`，选择一篇文章
3. 用鼠标选中文章中一段文字
4. 右侧浮动面板出现，点击"解释说明"
5. 按钮变为"解释中..."
6. 等待约 5-15 秒
7. 验证文章末尾出现 `---` 分割线 + AI 解释块
8. 刷新页面，验证内容已持久化

- [ ] **Step 6: Commit**

```bash
git add app/view/page.tsx
git commit -m "feat: wire up 解释说明 button to openclaw main_agent and append to article"
```
