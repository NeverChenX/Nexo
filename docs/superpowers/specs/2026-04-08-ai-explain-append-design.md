# AI 解释说明 → 追加到文档 设计规范

## 背景

View 页面已有 AI 浮动面板，选中文本后显示"解释说明"按钮，但无功能。本次实现：点击后调用本地 openclaw main_agent，将解释内容直接追加到当前文章末尾并保存。

## 调用链

```
前端: 解释说明按钮点击 (selectedText + currentPath)
  → POST /api/explain { text, articlePath }
    → 服务端请求 http://127.0.0.1:18789/v1/responses
       model: "openclaw/main"
       input: "请解释以下内容：\n\n${text}"
    → 返回 { ok, explanation }
  → 追加 markdown 块到 content
  → PUT /api/articles { path, content: newContent }
  → 更新前端 content 状态 + 关闭 AI 面板
```

## 文件变更

### 1. 新建 `.env.local`
```
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=***REDACTED-OPENCLAW-TOKEN***
```

### 2. 新建 `app/api/explain/route.ts`
- POST handler
- 验证 text、articlePath 非空
- 调用 openclaw `/v1/responses`，超时 30s
- 从 `output[0].content[0].text` 提取解释文本
- 返回 `{ ok: true, data: { explanation } }`

### 3. 修改 `app/view/page.tsx`
- 添加 `explainLoading: boolean` state
- "解释说明"按钮：onClick 触发 handleExplain
- `handleExplain`：
  1. 设置 loading
  2. 调用 `/api/explain`
  3. 构建追加块（见下方格式）
  4. PUT /api/articles 保存
  5. 更新 content state
  6. 关闭 AI 面板，清除 loading

## 追加内容格式（markdown）

```markdown

---

> **📝 AI 解释**
>
> **选中内容：** {selectedText 截断至 100 字符}
>
> {explanation}
```

## 错误处理

- openclaw 调用失败 → 返回 500，前端 alert 提示
- 文章保存失败 → alert 提示，不更新 content state

## 约束

- 网关 token 存 `.env.local`，不进 git（已在 .gitignore 中添加 .env.local）
- 按钮 loading 时禁用，防止重复调用
