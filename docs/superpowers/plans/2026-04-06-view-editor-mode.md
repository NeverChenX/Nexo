# View/Editor Mode Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 默认进入预览模式（`/view`），顶部导航栏提供按钮在预览和编辑两种模式间切换，切换时保留当前文章。

**Architecture:** 保持 `/view` 和 `/editor` 两个独立页面。预览页补充 URL 参数支持，文章加载后将 id 写回 URL。两页各自头部加切换按钮，点击时携带当前文章 id 跳转对方路由。

**Tech Stack:** Next.js App Router, React, lucide-react, shadcn/ui Button

---

### Task 1: 根路由改为跳转到预览模式

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 修改跳转目标**

将 `app/page.tsx` 完整替换为：

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/view');
  }, [router]);

  return null;
}
```

- [ ] **Step 2: 验证**

启动开发服务器（`pnpm dev` 或 `npm run dev`），访问 `http://localhost:3000`，确认浏览器自动跳转到 `/view`。

- [ ] **Step 3: 提交**

```bash
git add app/page.tsx
git commit -m "feat: redirect root to /view as default mode"
```

---

### Task 2: 预览页支持 URL 参数并同步文章 id

**Files:**
- Modify: `app/view/page.tsx`

- [ ] **Step 1: 重写预览页，加入 URL 参数读取和 id 同步**

将 `app/view/page.tsx` 完整替换为：

```tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { Preview } from '@/components/Preview';

export default function ViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const latestLoadSeqRef = useRef(0);
  const currentArticleIdRef = useRef<string | null>(null);

  const loadArticle = useCallback(
    async (params: { path?: string; id?: string }) => {
      const requestSeq = ++latestLoadSeqRef.current;
      setLoading(true);
      try {
        const query = params.path
          ? `path=${encodeURIComponent(params.path)}`
          : `id=${encodeURIComponent(params.id || '')}`;
        const res = await fetch(`/api/articles?${query}`);
        const json = await res.json();
        if (requestSeq !== latestLoadSeqRef.current) return;
        if (json.ok) {
          currentArticleIdRef.current = json.data.id || null;
          setCurrentPath(json.data.path);
          setArticleId(json.data.id || null);
          setContent(json.data.content);
          if (json.data.id) {
            router.replace(`/view?id=${encodeURIComponent(json.data.id)}`);
          }
        }
      } catch (error) {
        if (requestSeq !== latestLoadSeqRef.current) return;
        console.error('Failed to load article:', error);
      } finally {
        if (requestSeq === latestLoadSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [router]
  );

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    const pathFromUrl = searchParams.get('path');
    if (idFromUrl && currentArticleIdRef.current === idFromUrl) return;
    if (pathFromUrl && pathFromUrl === currentPath) return;
    if (idFromUrl) {
      void loadArticle({ id: idFromUrl });
      return;
    }
    if (pathFromUrl) {
      void loadArticle({ path: pathFromUrl });
    }
  }, [searchParams, currentPath, loadArticle]);

  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      if (path === currentPath) return;
      void loadArticle({ path });
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <TreeMenu
        onSelectItem={handleSelectItem}
        onCreateArticle={() => {}}
        onCreateFolder={() => {}}
        selectedPath={currentPath}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 truncate">{currentPath || '未选择文章'}</p>
          </div>
          {loading && <span className="text-xs text-gray-400">加载中...</span>}
        </div>

        <div className="flex-1 overflow-auto">
          {content ? (
            <Preview content={content} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">选择一篇文章查看</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证 URL 参数加载**

访问 `http://localhost:3000/view`，点击左侧树形菜单中的某篇文章，确认：
- 文章内容正确展示
- 浏览器地址栏 URL 变为 `/view?id=xxx`

直接访问带 id 的 URL（如复制地址栏链接后刷新），确认文章能正常加载。

- [ ] **Step 3: 提交**

```bash
git add app/view/page.tsx
git commit -m "feat: add URL param support to view page with article id sync"
```

---

### Task 3: 预览页头部加"编辑"切换按钮

**Files:**
- Modify: `app/view/page.tsx`

- [ ] **Step 1: 在头部添加编辑按钮**

在 `app/view/page.tsx` 中，将头部 `<div className="h-14 ...">` 内容替换为包含切换按钮的版本。找到：

```tsx
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 truncate">{currentPath || '未选择文章'}</p>
          </div>
          {loading && <span className="text-xs text-gray-400">加载中...</span>}
        </div>
```

替换为：

```tsx
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 truncate">{currentPath || '未选择文章'}</p>
          </div>
          {loading && <span className="text-xs text-gray-400 flex-shrink-0">加载中...</span>}
          <Button
            onClick={() => router.push(articleId ? `/editor?id=${encodeURIComponent(articleId)}` : '/editor')}
            disabled={!articleId}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <Pencil className="h-4 w-4 mr-1" /> 编辑
          </Button>
        </div>
```

- [ ] **Step 2: 补充 import**

在文件顶部 import 区域加入：

```tsx
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
```

- [ ] **Step 3: 验证切换按钮**

访问 `/view` 并选中一篇文章：
- "编辑"按钮应变为可点击状态
- 点击后跳转到 `/editor?id=xxx`，且编辑器中展示同一篇文章

未选择文章时"编辑"按钮应为禁用状态（灰色）。

- [ ] **Step 4: 提交**

```bash
git add app/view/page.tsx
git commit -m "feat: add edit mode switch button to view page header"
```

---

### Task 4: 编辑页头部加"预览"切换按钮

**Files:**
- Modify: `app/editor/page.tsx`

- [ ] **Step 1: 在头部按钮组中加入预览按钮**

在 `app/editor/page.tsx` 中，找到头部按钮区域：

```tsx
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-xs whitespace-nowrap ${
                saveState === 'error' ? 'text-red-500' : 'text-gray-500'
              }`}
              title={saveError || '自动保存状态'}
            >
              {saveStatusText}
            </span>
            <Button
              onClick={() => setShareModalOpen(true)}
              disabled={!currentPath}
              variant="outline"
              size="sm"
            >
              <Share2 className="h-4 w-4 mr-1" /> 分享
            </Button>
```

在 `<Share2>` 按钮前插入预览按钮：

```tsx
            <Button
              onClick={() => router.push(articleData?.id ? `/view?id=${encodeURIComponent(articleData.id)}` : '/view')}
              disabled={!articleData}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-1" /> 预览
            </Button>
```

- [ ] **Step 2: 补充 import**

在文件顶部找到 lucide-react import 行：

```tsx
import { Trash2, Share2 } from 'lucide-react';
```

改为：

```tsx
import { Trash2, Share2, Eye } from 'lucide-react';
```

- [ ] **Step 3: 验证切换按钮**

访问 `/editor` 并打开一篇文章：
- "预览"按钮应变为可点击状态
- 点击后跳转到 `/view?id=xxx`，且预览页展示同一篇文章

未选择文章时"预览"按钮应为禁用状态。

- [ ] **Step 4: 提交**

```bash
git add app/editor/page.tsx
git commit -m "feat: add preview mode switch button to editor page header"
```
