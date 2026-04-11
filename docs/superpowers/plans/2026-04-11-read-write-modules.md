# /write + /read 模块实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `/write`（无干扰编辑）和 `/read`（最优阅读体验）两个独立路由模块

**Architecture:** `/write` 复用现有 `Editor.tsx` + `TreeMenu.tsx`，布局极简，侧栏默认隐藏；`/read` 新增 `ReadTOC.tsx` 组件，三栏布局（侧栏+内容+目录），三级响应式，复用 `Preview.tsx` 渲染 markdown。

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, EasyMDE, ReactMarkdown, Tailwind CSS, Lucide React

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/write/page.tsx` | 新建 | 无干扰编辑页 |
| `app/read/page.tsx` | 新建 | 阅读模式主页 |
| `components/ReadTOC.tsx` | 新建 | 文章目录（标题提取+跳转） |
| `app/globals.css` | 修改 | 添加阅读模式排版样式 |

---

## Task 1: 阅读排版 CSS 样式

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 在 globals.css 末尾追加阅读排版样式**

打开 `app/globals.css`，在文件末尾添加：

```css
/* ====== /read 阅读模式排版 ====== */

.read-content {
  font-size: 18px;
  line-height: 1.9;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
}

.read-content h1,
.read-content h2,
.read-content h3,
.read-content h4 {
  font-family: Georgia, 'Times New Roman', serif;
  color: #111;
  margin-top: 2em;
  margin-bottom: 0.6em;
  line-height: 1.4;
}

.read-content h1 { font-size: 2em; font-weight: 700; }
.read-content h2 { font-size: 1.5em; font-weight: 600; }
.read-content h3 { font-size: 1.25em; font-weight: 600; }

.read-content p {
  margin-bottom: 1.2em;
}

.read-content ul,
.read-content ol {
  padding-left: 1.5em;
  margin-bottom: 1.2em;
}

.read-content li {
  margin-bottom: 0.4em;
}

.read-content blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 1em;
  color: #6b7280;
  margin: 1.5em 0;
  font-style: italic;
}

.read-content code {
  background: #f3f4f6;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.85em;
  color: #e11d48;
}

.read-content pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 1.2em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
}

.read-content pre code {
  background: none;
  color: inherit;
  font-size: 0.9em;
  padding: 0;
}

.read-content a {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.read-content a:hover {
  color: #1d4ed8;
}

.read-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 0.95em;
}

.read-content th,
.read-content td {
  border: 1px solid #e5e7eb;
  padding: 0.5em 0.75em;
  text-align: left;
}

.read-content th {
  background: #f9fafb;
  font-weight: 600;
}

.read-content hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 2em 0;
}

.read-content img {
  max-width: 100%;
  border-radius: 6px;
  margin: 1em 0;
}

/* 移动端字体缩小 */
@media (max-width: 768px) {
  .read-content {
    font-size: 16px;
  }
}
```

- [ ] **Step 2: 验证 CSS 无语法错误**

```bash
cd /home/Neverchen/project/never_wiki && npx tsc --noEmit 2>&1 | head -20
```

期望输出：无错误（tsc 不检查 CSS，但确认项目整体编译正常）

- [ ] **Step 3: Commit**

```bash
cd /home/Neverchen/project/never_wiki
git add app/globals.css
git commit -m "feat: add read-mode typography styles"
```

---

## Task 2: ReadTOC 组件

**Files:**
- Create: `components/ReadTOC.tsx`

- [ ] **Step 1: 创建 ReadTOC.tsx**

新建文件 `components/ReadTOC.tsx`，完整内容如下：

```tsx
'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  level: number;
  text: string;
  id: string;
}

interface ReadTOCProps {
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parseHeadings(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  const seenIds = new Map<string, number>();

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    let id = slugify(text);
    if (!id) id = 'heading';

    // 处理重复 id
    const count = seenIds.get(id) ?? 0;
    seenIds.set(id, count + 1);
    const finalId = count === 0 ? id : `${id}-${count}`;

    items.push({ level, text, id: finalId });
  }

  return items;
}

export function ReadTOC({ content }: ReadTOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const items = parseHeadings(content);

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0% -70% 0%', threshold: 0 }
    );

    // 观察所有标题元素
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [content, items.length]);

  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">目录</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={`${item.id}-${item.level}`}
            style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
          >
            <button
              onClick={() => handleClick(item.id)}
              className={`text-left w-full leading-snug py-0.5 transition-colors ${
                activeId === item.id
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: 验证类型检查**

```bash
cd /home/Neverchen/project/never_wiki && npx tsc --noEmit 2>&1 | head -30
```

期望输出：无 TS 错误

- [ ] **Step 3: Commit**

```bash
cd /home/Neverchen/project/never_wiki
git add components/ReadTOC.tsx
git commit -m "feat: add ReadTOC component for reading mode"
```

---

## Task 3: /write 无干扰编辑页

**Files:**
- Create: `app/write/page.tsx`

**背景：** 编辑页逻辑参考 `app/editor/page.tsx`。主要 API 调用：
- `GET /api/articles?path=xxx` → `{ ok: true, data: { path, id, content, isFolder } }`
- `PUT /api/articles?path=xxx` body `{ content }` → 保存文章

- [ ] **Step 1: 创建 app/write/ 目录并新建 page.tsx**

新建文件 `app/write/page.tsx`，完整内容如下：

```tsx
'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TreeMenu } from '@/components/TreeMenu';
import { ArrowLeft, PanelLeft, PanelLeftClose } from 'lucide-react';

const Editor = dynamic(() => import('@/components/Editor').then(m => ({ default: m.Editor })), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center text-gray-400">加载编辑器...</div>,
});

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

function WritePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const contentRef = useRef(content);
  const pathRef = useRef(currentPath);
  const savingRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载文章
  const loadArticle = useCallback(async (path: string) => {
    if (!path) return;
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`);
      const json = await res.json() as { ok: boolean; data?: { content: string; path: string } };
      if (json.ok && json.data) {
        setContent(json.data.content);
        contentRef.current = json.data.content;
        setSaveState('saved');
      }
    } catch {
      // 加载失败静默处理
    }
  }, []);

  // 初始化：从 URL 参数读取 path
  useEffect(() => {
    const path = searchParams.get('path') ?? '';
    setCurrentPath(path);
    pathRef.current = path;
    void loadArticle(path);
  }, [searchParams, loadArticle]);

  // 保存
  const saveArticle = useCallback(async () => {
    const path = pathRef.current;
    if (!path || savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentRef.current }),
      });
      const json = await res.json() as { ok: boolean };
      setSaveState(json.ok ? 'saved' : 'error');
    } catch {
      setSaveState('error');
    } finally {
      savingRef.current = false;
    }
  }, []);

  // 内容变更：标记 dirty + 自动保存（2s 防抖）
  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    contentRef.current = val;
    setSaveState('dirty');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void saveArticle();
    }, 2000);
  }, [saveArticle]);

  // Ctrl+S 手动保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        void saveArticle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveArticle]);

  // 选择侧栏文章
  const handleSelectItem = (itemPath: string, _isFolder: boolean) => {
    if (itemPath === currentPath) return;
    setCurrentPath(itemPath);
    pathRef.current = itemPath;
    void loadArticle(itemPath);
    // 更新 URL（不跳转）
    const url = new URL(window.location.href);
    url.searchParams.set('path', itemPath);
    window.history.replaceState(null, '', url.toString());
  };

  const saveLabel = {
    saved: '已保存',
    dirty: '未保存',
    saving: '保存中...',
    error: '保存失败',
  }[saveState];

  const saveColor = {
    saved: 'text-green-600',
    dirty: 'text-gray-400',
    saving: 'text-blue-500',
    error: 'text-red-500',
  }[saveState];

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 侧栏 Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-full z-40 w-60 bg-[#f7f6f3] border-r border-gray-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-600">文章列表</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-200 text-gray-500"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TreeMenu
            onSelectItem={handleSelectItem}
            onCreateArticle={() => {}}
            selectedPath={currentPath}
            refreshKey={refreshKey}
          />
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between px-4 h-10 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(currentPath ? `/editor?path=${encodeURIComponent(currentPath)}` : '/editor')}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              title="返回编辑器"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              title="打开侧栏"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-400 truncate max-w-xs">
              {currentPath || '未选择文章'}
            </span>
          </div>
          <span className={`text-xs ${saveColor}`}>{saveLabel}</span>
        </header>

        {/* 编辑器区域 */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 mx-auto w-full" style={{ maxWidth: '860px' }}>
            <Editor
              content={content}
              onChange={handleContentChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">加载中...</div>}>
      <WritePageInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: 验证类型检查**

```bash
cd /home/Neverchen/project/never_wiki && npx tsc --noEmit 2>&1 | head -30
```

期望输出：无 TS 错误

- [ ] **Step 3: 启动开发服务器并手动验证**

```bash
cd /home/Neverchen/project/never_wiki && npm run dev &
sleep 5
curl -s "http://localhost:3000/write" | head -5
```

期望：返回 HTML（不是 404 或错误页）

验证清单（手动在浏览器打开 `http://localhost:3000/write?path=xxx`）：
- [ ] 页面加载，顶部栏显示路径和"已保存"
- [ ] 编辑器全屏，无多余元素
- [ ] 点击左上角 Panel 图标，侧栏从左滑出
- [ ] 点击侧栏外部区域，侧栏关闭
- [ ] 修改内容，状态变为"未保存"→2秒后变为"已保存"
- [ ] Ctrl+S 立即保存

- [ ] **Step 4: Commit**

```bash
cd /home/Neverchen/project/never_wiki
git add app/write/page.tsx
git commit -m "feat: add /write distraction-free editor page"
```

---

## Task 4: /read 阅读模式主页

**Files:**
- Create: `app/read/page.tsx`

**背景：** 布局三栏（侧栏240px + 内容区 + TOC200px），响应式三级断点。
- 桌面（≥1024px）：三栏全显
- iPad（768-1023px）：侧栏+内容，无右侧TOC
- 手机（<768px）：仅内容，侧栏为overlay抽屉

需要给 markdown 标题加 id（TOC 锚点跳转）。使用 `rehype-slug` 自动为标题加 id。先检查是否已安装：

```bash
cat /home/Neverchen/project/never_wiki/package.json | grep rehype
```

若无 `rehype-slug`，安装：

```bash
cd /home/Neverchen/project/never_wiki && npm install rehype-slug
```

- [ ] **Step 1: 安装 rehype-slug（如未安装）**

```bash
cd /home/Neverchen/project/never_wiki
npm install rehype-slug
```

验证安装：
```bash
cat package.json | grep rehype-slug
```
期望：显示版本号

- [ ] **Step 2: 创建 app/read/page.tsx**

新建文件 `app/read/page.tsx`：

```tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { TreeMenu } from '@/components/TreeMenu';
import { ReadTOC } from '@/components/ReadTOC';
import { Menu, X, PenLine, ChevronLeft, ChevronRight } from 'lucide-react';

function ReadPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('请选择一篇文章');
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshKey] = useState(0);

  const loadArticle = useCallback(async (path: string) => {
    if (!path) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`);
      const json = await res.json() as { ok: boolean; data?: { content: string; path: string } };
      if (json.ok && json.data) {
        setContent(json.data.content);
        // 从路径提取标题
        const parts = path.split('/');
        const filename = parts[parts.length - 1].replace(/\.md$/, '').replace(/_index$/, parts[parts.length - 2] ?? '');
        setTitle(filename);
      }
    } catch {
      // 加载失败静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const path = searchParams.get('path') ?? '';
    setCurrentPath(path);
    if (path) void loadArticle(path);
  }, [searchParams, loadArticle]);

  const handleSelectItem = (itemPath: string, _isFolder: boolean) => {
    setCurrentPath(itemPath);
    void loadArticle(itemPath);
    // 更新 URL
    const url = new URL(window.location.href);
    url.searchParams.set('path', itemPath);
    window.history.replaceState(null, '', url.toString());
    // 手机端：关闭侧栏
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 手机端侧栏遮罩 */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 左侧栏 */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          flex flex-col bg-[#f7f6f3] border-r border-gray-200
          transition-all duration-200
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-4' : 'w-60'}
        `}
      >
        {/* 桌面端折叠按钮 */}
        {!sidebarCollapsed && (
          <div className="hidden lg:flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">文章</span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded hover:bg-gray-200 text-gray-400"
              title="折叠侧栏"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 折叠状态：细条 + 展开按钮 */}
        {sidebarCollapsed && (
          <div className="hidden lg:flex flex-col items-center py-3 flex-1">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-1 rounded hover:bg-gray-200 text-gray-400"
              title="展开侧栏"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 手机端关闭按钮 */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">文章</span>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-200 text-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 文章树 */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto">
            <TreeMenu
              onSelectItem={handleSelectItem}
              onCreateArticle={() => {}}
              selectedPath={currentPath}
              refreshKey={refreshKey}
            />
          </div>
        )}
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* 顶部栏（手机端 + iPad） */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-gray-100 flex-shrink-0 bg-white lg:hidden">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{title}</span>
          <button
            onClick={() => router.push(currentPath ? `/editor?path=${encodeURIComponent(currentPath)}` : '/editor')}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            title="编辑"
          >
            <PenLine className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 文章内容 */}
          <article className="flex-1 min-w-0 overflow-y-auto px-6 py-10 lg:py-12">
            <div className="mx-auto" style={{ maxWidth: '700px' }}>
              {/* 桌面端操作栏 */}
              <div className="hidden lg:flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {currentPath && (
                    <span className="truncate max-w-sm">{currentPath}</span>
                  )}
                </div>
                <button
                  onClick={() => router.push(currentPath ? `/editor?path=${encodeURIComponent(currentPath)}` : '/editor')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  编辑
                </button>
              </div>

              {loading && (
                <div className="text-gray-400 text-sm">加载中...</div>
              )}

              {!loading && !content && (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg mb-2">选择一篇文章开始阅读</p>
                  <p className="text-sm">从左侧目录中选择文章</p>
                </div>
              )}

              {!loading && content && (
                <div className="read-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSlug]}
                    urlTransform={(url: string) => {
                      const next = url.trim();
                      if (!next) return '';
                      if (next.toLowerCase().startsWith('javascript:')) return '';
                      return next;
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </article>

          {/* 右侧目录（仅桌面端） */}
          {content && (
            <aside className="hidden xl:block w-52 flex-shrink-0 overflow-y-auto px-4 py-12 border-l border-gray-100">
              <div className="sticky top-12">
                <ReadTOC content={content} />
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">加载中...</div>}>
      <ReadPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: 验证类型检查**

```bash
cd /home/Neverchen/project/never_wiki && npx tsc --noEmit 2>&1 | head -30
```

期望输出：无 TS 错误（若有 rehype-slug 类型错误，安装 `@types/rehype-slug` 或检查 import 方式）

若有类型错误（rehype-slug 无类型声明），修改 import：

```tsx
// 将 import rehypeSlug from 'rehype-slug' 替换为：
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rehypeSlug = require('rehype-slug') as import('unified').Plugin;
```

- [ ] **Step 4: 手动验证功能**

```bash
curl -s "http://localhost:3000/read" | head -5
```

期望：返回 HTML

验证清单（手动在浏览器打开 `http://localhost:3000/read`）：
- [ ] 页面加载，左侧显示文章树
- [ ] 点击一篇文章，右侧显示内容，字体18px，行高宽松
- [ ] 标题使用衬线字体
- [ ] 桌面端（宽屏）右侧显示目录
- [ ] 点击目录项，页面滚动到对应标题
- [ ] 折叠侧栏（点击 ◀ 图标），侧栏缩小为细条
- [ ] 展开侧栏（点击细条上的 ▶），恢复正常
- [ ] 点击"编辑"按钮，跳转到 `/editor?path=xxx`

- [ ] **Step 5: Commit**

```bash
cd /home/Neverchen/project/never_wiki
git add app/read/page.tsx package.json package-lock.json
git commit -m "feat: add /read reading mode page"
```

---

## Task 5: 构建验证 + 整体测试

**Files:** 无新文件

- [ ] **Step 1: 全量构建验证**

```bash
cd /home/Neverchen/project/never_wiki && npm run build 2>&1 | tail -30
```

期望输出：
```
✓ Compiled successfully
Route (app)                    Size     First Load JS
├ ○ /read                      ...
├ ○ /write                     ...
```

若有构建错误，按错误信息修复。

- [ ] **Step 2: 类型检查**

```bash
cd /home/Neverchen/project/never_wiki && npx tsc --noEmit 2>&1
```

期望：无错误输出

- [ ] **Step 3: 验证现有功能未受影响**

```bash
# 确认编辑器页仍正常
curl -s "http://localhost:3000/editor" | head -5
# 确认视图页仍正常
curl -s "http://localhost:3000/view" | head -5
```

- [ ] **Step 4: Final commit**

```bash
cd /home/Neverchen/project/never_wiki
git add -A
git status  # 确认无多余文件
git commit -m "chore: verify build passes for /write + /read modules"
```

---

## 自审结果

**Spec 覆盖检查：**
- ✅ /write 无干扰编辑：Task 3
- ✅ /write 侧栏默认隐藏 overlay：Task 3
- ✅ /write 顶部栏（路径+保存状态+返回）：Task 3
- ✅ /write Ctrl+S 保存：Task 3
- ✅ /read 左侧树（可折叠）：Task 4
- ✅ /read 700px 内容宽度：Task 4
- ✅ /read 18px + 行高1.9：Task 1 CSS
- ✅ /read 衬线标题字体：Task 1 CSS
- ✅ /read 右侧TOC（桌面）：Task 2 + Task 4
- ✅ /read 三级响应式：Task 4
- ✅ /read 手机端抽屉侧栏：Task 4
- ✅ /read 编辑按钮跳回 /editor：Task 4

**类型一致性：**
- `ReadTOC` 接收 `content: string`，在 Task 4 中使用 `<ReadTOC content={content} />`，一致 ✅
- `handleSelectItem(itemPath: string, _isFolder: boolean)` 签名与 `TreeMenu` 的 `onSelectItem` 一致 ✅
- `SaveState` 类型在 Task 3 内部定义使用，不跨任务 ✅
