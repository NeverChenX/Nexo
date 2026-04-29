# Phase 3 · 章节导航 + 进度持久化 + Toast

**Goal:** 文章末尾两端线（上/下一篇 + "完"），自动跳回上次位置，进度 Toast，完成判定。所有数据走 `/api/reader/history`（先 mock，phase-5 实装真实持久化）。

**Depends on:** Phase 1, 2 完成。

**Architecture:** `chapter-nav.ts` 纯函数解析兄弟文章；`useReaderProgress` 管 scroll/进度/滚动恢复；`ReaderEndCard` 渲染章末；`ReaderProgressToast` 顶部 toast；mock 客户端 `lib/reader/storage-client.ts` 在 phase-5 替换实现，但接口先冻结。

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 创建 | `lib/reader/chapter-nav.ts` | 上/下一篇解析（纯函数） |
| 创建 | `lib/reader/__tests__/chapter-nav.test.ts` | 单测 |
| 创建 | `lib/reader/reading-time.ts` | 字数 + 分钟估算 |
| 创建 | `lib/reader/__tests__/reading-time.test.ts` | 单测 |
| 创建 | `lib/reader/storage-client.ts` | 客户端 fetch 包装（先 mock） |
| 创建 | `app/api/articles/list/route.ts` | 用于章节导航的兄弟列表 API |
| 创建 | `app/read/_reader/hooks/useReaderProgress.ts` | scroll/progress/恢复 |
| 创建 | `app/read/_reader/hooks/useChapterNav.ts` | hook 包装 chapter-nav |
| 创建 | `app/read/_reader/ReaderEndCard.tsx` | 章末两端线 |
| 创建 | `app/read/_reader/ReaderProgressToast.tsx` | 顶部进度 toast |
| 修改 | `app/read/_reader/ReaderShell.tsx` | 集成上述 |

---

### Task 1: `lib/reader/chapter-nav.ts` (TDD)

**Files:**
- Create: `lib/reader/chapter-nav.ts`
- Test: `lib/reader/__tests__/chapter-nav.test.ts`

#### 接口契约

```ts
export interface ArticleNode {
  id: string;
  idChain: string;
  title: string;
  path: string;
  parentPath: string;     // '' for root
  order: number;          // 在父目录里的索引
}

export interface ChapterNavResult {
  prev?: { id: string; idChain: string; title: string; path: string };
  next?: { id: string; idChain: string; title: string; path: string };
}

/**
 * 给定全文章列表 + 当前 articleId，解析上/下一篇。
 * 优先级：frontmatter prev/next > 同父目录兄弟 > 跨父目录回退 > undefined。
 */
export function resolveChapterNav(
  current: ArticleNode,
  all: readonly ArticleNode[],
  override?: { prev?: string; next?: string },  // article id 或 idChain 或 path
): ChapterNavResult;
```

- [ ] **Step 1: 测试**

```ts
import { describe, it, expect } from 'vitest';
import { resolveChapterNav, type ArticleNode } from '../chapter-nav';

const make = (id: string, parentPath: string, order: number, title = id): ArticleNode => ({
  id,
  idChain: parentPath ? `${parentPath}/${id}` : id,
  title,
  path: parentPath ? `${parentPath}/${title}` : title,
  parentPath,
  order,
});

describe('resolveChapterNav', () => {
  it('returns next sibling in same folder', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const c = make('c3', 'root', 2);
    const r = resolveChapterNav(b, [a, b, c]);
    expect(r.prev?.id).toBe('a1');
    expect(r.next?.id).toBe('c3');
  });

  it('first article has no prev (within tree)', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const r = resolveChapterNav(a, [a, b]);
    expect(r.prev).toBeUndefined();
    expect(r.next?.id).toBe('b2');
  });

  it('last article has no next (within tree)', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const r = resolveChapterNav(b, [a, b]);
    expect(r.prev?.id).toBe('a1');
    expect(r.next).toBeUndefined();
  });

  it('frontmatter override by id', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const c = make('c3', 'other', 0);
    const r = resolveChapterNav(a, [a, b, c], { next: 'c3' });
    expect(r.next?.id).toBe('c3');
  });

  it('frontmatter override by path', () => {
    const a = make('a1', 'root', 0, 'Alpha');
    const c = make('c3', 'other', 0, 'Charlie');
    const r = resolveChapterNav(a, [a, c], { next: 'other/Charlie' });
    expect(r.next?.id).toBe('c3');
  });

  it('override missing → fall back to default', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const r = resolveChapterNav(a, [a, b], { next: 'missing' });
    expect(r.next?.id).toBe('b2');
  });

  it('siblings sorted by order asc', () => {
    const a = make('a1', 'root', 5);
    const b = make('b2', 'root', 1);
    const c = make('c3', 'root', 3);
    // current = c (order 3), prev order 1 = b, next order 5 = a
    const r = resolveChapterNav(c, [a, b, c]);
    expect(r.prev?.id).toBe('b2');
    expect(r.next?.id).toBe('a1');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm test -- chapter-nav
```

- [ ] **Step 3: 实现**

```ts
export interface ArticleNode {
  id: string;
  idChain: string;
  title: string;
  path: string;
  parentPath: string;
  order: number;
}

export interface ChapterNavLink {
  id: string;
  idChain: string;
  title: string;
  path: string;
}

export interface ChapterNavResult {
  prev?: ChapterNavLink;
  next?: ChapterNavLink;
}

function findOverride(token: string, all: readonly ArticleNode[]): ArticleNode | undefined {
  return (
    all.find((n) => n.id === token) ||
    all.find((n) => n.idChain === token) ||
    all.find((n) => n.path === token)
  );
}

function toLink(n: ArticleNode): ChapterNavLink {
  return { id: n.id, idChain: n.idChain, title: n.title, path: n.path };
}

export function resolveChapterNav(
  current: ArticleNode,
  all: readonly ArticleNode[],
  override?: { prev?: string; next?: string },
): ChapterNavResult {
  const result: ChapterNavResult = {};

  // 1) Override first
  if (override?.prev) {
    const o = findOverride(override.prev, all);
    if (o) result.prev = toLink(o);
  }
  if (override?.next) {
    const o = findOverride(override.next, all);
    if (o) result.next = toLink(o);
  }

  // 2) Same-folder siblings (sorted by order)
  if (!result.prev || !result.next) {
    const siblings = all
      .filter((n) => n.parentPath === current.parentPath)
      .slice()
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((n) => n.id === current.id);
    if (idx >= 0) {
      if (!result.prev && idx > 0) result.prev = toLink(siblings[idx - 1]);
      if (!result.next && idx < siblings.length - 1) result.next = toLink(siblings[idx + 1]);
    }
  }

  return result;
}
```

- [ ] **Step 4: 测试通过**

```bash
npm test -- chapter-nav
```
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/reader/chapter-nav.ts lib/reader/__tests__/chapter-nav.test.ts
git commit -m "feat(reader): chapter-nav resolver with override + sibling fallback (TDD)"
```

---

### Task 2: `lib/reader/reading-time.ts` (TDD)

**Files:**
- Create: `lib/reader/reading-time.ts`
- Test: `lib/reader/__tests__/reading-time.test.ts`

- [ ] **Step 1: 测试**

```ts
import { describe, it, expect } from 'vitest';
import { countWords, estimateMinutes } from '../reading-time';

describe('reading-time', () => {
  it('counts pure CJK chars', () => {
    expect(countWords('你好世界')).toBe(4);
  });
  it('counts pure English words', () => {
    expect(countWords('hello world foo bar')).toBe(4);
  });
  it('mixed CJK + English', () => {
    expect(countWords('你好 hello 世界')).toBe(2 + 1 + 2);
  });
  it('strips markdown code fences when stripCode=true', () => {
    const md = 'hello ```\nlots of code\n``` world';
    expect(countWords(md, { stripCode: true })).toBe(2);
  });
  it('estimateMinutes uses 350 wpm baseline', () => {
    expect(estimateMinutes(0)).toBe(1);
    expect(estimateMinutes(350)).toBe(1);
    expect(estimateMinutes(351)).toBe(2);
    expect(estimateMinutes(700)).toBe(2);
    expect(estimateMinutes(1050)).toBe(3);
  });
});
```

- [ ] **Step 2: 跑确认 fail**

```bash
npm test -- reading-time
```

- [ ] **Step 3: 实现**

```ts
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
const FENCE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]+`/g;

export function countWords(text: string, opts?: { stripCode?: boolean }): number {
  let t = text;
  if (opts?.stripCode) {
    t = t.replace(FENCE_RE, '').replace(INLINE_CODE_RE, '');
  }
  const cjkCount = (t.match(CJK_RE) || []).length;
  const stripped = t.replace(CJK_RE, ' ');
  const words = stripped.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)).length;
  return cjkCount + words;
}

export function estimateMinutes(words: number, wpm = 350): number {
  return Math.max(1, Math.ceil(words / wpm));
}
```

- [ ] **Step 4: pass**

```bash
npm test -- reading-time
```

- [ ] **Step 5: Commit**

```bash
git add lib/reader/reading-time.ts lib/reader/__tests__/reading-time.test.ts
git commit -m "feat(reader): reading-time word count + minutes estimator (TDD)"
```

---

### Task 3: `/api/articles/list` 路由（章节导航需要全文章列表）

**Files:** Create `app/api/articles/list/route.ts`

- [ ] **Step 1: 检查现有 storage 接口**

```bash
grep -n "export" lib/storage.ts | head -20
```

- [ ] **Step 2: 实现 API 返回扁平 ArticleNode 列表**

`app/api/articles/list/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { listAllArticles } from '@/lib/storage';

export async function GET() {
  try {
    const all = await listAllArticles();
    return NextResponse.json({ ok: true, data: all });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
```

> **注意:** 如果 `lib/storage.ts` 没有 `listAllArticles` 导出，按现有结构添加 —— 它应返回 `ArticleNode[]`：每篇文章的 `id / idChain / title / path / parentPath / order`。
> 复用现有 `loadTreeData()` / `getArticleTree()` 等函数生成扁平列表。

- [ ] **Step 3: 如需要，在 lib/storage.ts 添加 helper**

```ts
// lib/storage.ts （示意 —— 实际按现有 API 调整）
import type { ArticleNode } from './reader/chapter-nav';

export async function listAllArticles(): Promise<ArticleNode[]> {
  const tree = await getArticleTree(); // 现有函数
  const out: ArticleNode[] = [];
  const walk = (nodes: TreeNode[], parentPath = '', parentChain = '') => {
    nodes.forEach((n, i) => {
      if (n.type === 'file') {
        out.push({
          id: n.id,
          idChain: parentChain ? `${parentChain}/${n.id}` : n.id,
          title: n.title || n.name,
          path: parentPath ? `${parentPath}/${n.name}` : n.name,
          parentPath,
          order: i,
        });
      }
      if (n.children) {
        walk(
          n.children,
          parentPath ? `${parentPath}/${n.name}` : n.name,
          parentChain ? `${parentChain}/${n.id}` : n.id,
        );
      }
    });
  };
  walk(tree);
  return out;
}
```

- [ ] **Step 4: 验证**

```bash
npm run build && curl -s http://localhost:3000/api/articles/list | head -100
```

- [ ] **Step 5: Commit**

```bash
git add app/api/articles/list/route.ts lib/storage.ts
git commit -m "feat(reader): /api/articles/list returns flat ArticleNode[] for chapter nav"
```

---

### Task 4: `useChapterNav` hook

**Files:** Create `app/read/_reader/hooks/useChapterNav.ts`

- [ ] **Step 1: 实现**

```ts
'use client';

import { useEffect, useState } from 'react';
import {
  resolveChapterNav,
  type ArticleNode,
  type ChapterNavResult,
} from '@/lib/reader/chapter-nav';

let cache: ArticleNode[] | null = null;
let cachePromise: Promise<ArticleNode[]> | null = null;

async function loadAll(): Promise<ArticleNode[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = fetch('/api/articles/list')
    .then((r) => r.json())
    .then((j) => {
      const data = (j?.data || []) as ArticleNode[];
      cache = data;
      return data;
    })
    .finally(() => {
      cachePromise = null;
    });
  return cachePromise;
}

export function invalidateChapterNavCache() {
  cache = null;
}

export function useChapterNav(
  currentId: string | undefined,
  override?: { prev?: string; next?: string },
): ChapterNavResult {
  const [result, setResult] = useState<ChapterNavResult>({});
  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    loadAll().then((all) => {
      const cur = all.find((n) => n.id === currentId);
      if (!cur) return;
      if (!cancelled) setResult(resolveChapterNav(cur, all, override));
    });
    return () => {
      cancelled = true;
    };
  }, [currentId, override?.prev, override?.next]);
  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useChapterNav.ts
git commit -m "feat(reader): useChapterNav with cached article list"
```

---

### Task 5: `lib/reader/storage-client.ts` (mock for now)

**Files:** Create `lib/reader/storage-client.ts`

> Phase 5 会替换为真 fetch；这里先内存 mock 让 phase-3 的 progress 持久化能跑。

- [ ] **Step 1: 实现接口（内存版 + localStorage 兜底）**

```ts
'use client';

export interface HistoryEntry {
  articleId: string;
  lastReadAt: number;
  lastReadProgress: number; // 0..1
  scrollPos: number;
  completedAt?: number;
  reads: number;
}

const HIST_KEY = 'never-wiki.reader.history';

function readMap(): Record<string, HistoryEntry> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeMap(m: Record<string, HistoryEntry>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(HIST_KEY, JSON.stringify(m));
}

export async function getHistoryEntry(articleId: string): Promise<HistoryEntry | null> {
  return readMap()[articleId] || null;
}

export async function upsertHistoryEntry(
  articleId: string,
  patch: Partial<Omit<HistoryEntry, 'articleId'>>,
): Promise<HistoryEntry> {
  const m = readMap();
  const prev = m[articleId] || {
    articleId,
    lastReadAt: 0,
    lastReadProgress: 0,
    scrollPos: 0,
    reads: 0,
  };
  const next: HistoryEntry = { ...prev, ...patch, articleId };
  m[articleId] = next;
  writeMap(m);
  return next;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  return Object.values(readMap()).sort((a, b) => b.lastReadAt - a.lastReadAt);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/reader/storage-client.ts
git commit -m "feat(reader): storage-client mock (localStorage) — replaced in phase 5"
```

---

### Task 6: `useReaderProgress` hook

**Files:** Create `app/read/_reader/hooks/useReaderProgress.ts`

- [ ] **Step 1: 实现**

```ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getHistoryEntry,
  upsertHistoryEntry,
  type HistoryEntry,
} from '@/lib/reader/storage-client';

export interface UseReaderProgressOptions {
  articleId: string | null;
  articleReady: boolean;
  scrollEl: HTMLElement | null;
  endSentinel: HTMLElement | null;
}

export interface UseReaderProgressResult {
  progress: number;        // 0..1, live
  prevEntry: HistoryEntry | null;
  showResumeToast: boolean;
  dismissToast: () => void;
  resumeToTop: () => void;
}

export function useReaderProgress({
  articleId,
  articleReady,
  scrollEl,
  endSentinel,
}: UseReaderProgressOptions): UseReaderProgressResult {
  const [progress, setProgress] = useState(0);
  const [prevEntry, setPrevEntry] = useState<HistoryEntry | null>(null);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const lastWriteRef = useRef(0);
  const resumedRef = useRef(false);

  // 1) Load prev entry & schedule resume
  useEffect(() => {
    resumedRef.current = false;
    setShowResumeToast(false);
    setPrevEntry(null);
    if (!articleId) return;
    let cancelled = false;
    getHistoryEntry(articleId).then((e) => {
      if (cancelled) return;
      setPrevEntry(e);
      // accumulate read counter
      void upsertHistoryEntry(articleId, {
        lastReadAt: Date.now(),
        reads: (e?.reads ?? 0) + 1,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // 2) Restore scroll once article is ready
  useEffect(() => {
    if (!articleReady || resumedRef.current) return;
    if (!scrollEl || !prevEntry) {
      resumedRef.current = true;
      return;
    }
    const { lastReadProgress, scrollPos } = prevEntry;
    if (lastReadProgress >= 0.05 && lastReadProgress < 0.95) {
      requestAnimationFrame(() => {
        scrollEl.scrollTo({ top: scrollPos, behavior: 'auto' });
        setShowResumeToast(true);
        window.setTimeout(() => setShowResumeToast(false), 3000);
      });
    }
    resumedRef.current = true;
  }, [articleReady, scrollEl, prevEntry]);

  // 3) Track scroll → throttled history write
  useEffect(() => {
    if (!articleId || !scrollEl) return;
    const onScroll = () => {
      const max = scrollEl.scrollHeight - scrollEl.clientHeight;
      const pr = max > 0 ? scrollEl.scrollTop / max : 0;
      setProgress(pr);
      const now = Date.now();
      if (now - lastWriteRef.current > 5000) {
        lastWriteRef.current = now;
        void upsertHistoryEntry(articleId, {
          lastReadAt: now,
          lastReadProgress: pr,
          scrollPos: scrollEl.scrollTop,
        });
      }
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [articleId, scrollEl]);

  // 4) End sentinel triggers completion
  useEffect(() => {
    if (!articleId || !endSentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void upsertHistoryEntry(articleId, {
            completedAt: Date.now(),
            lastReadProgress: 1,
          });
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(endSentinel);
    return () => obs.disconnect();
  }, [articleId, endSentinel]);

  const dismissToast = useCallback(() => setShowResumeToast(false), []);
  const resumeToTop = useCallback(() => {
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
    setShowResumeToast(false);
  }, [scrollEl]);

  return { progress, prevEntry, showResumeToast, dismissToast, resumeToTop };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useReaderProgress.ts
git commit -m "feat(reader): useReaderProgress with resume + completion + throttled writes"
```

---

### Task 7: `ReaderEndCard`

**Files:** Create `app/read/_reader/ReaderEndCard.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { forwardRef } from 'react';
import { useChapterNav } from './hooks/useChapterNav';

interface Props {
  articleId: string;
  override?: { prev?: string; next?: string };
  onNavigate: (idChain: string) => void;
}

export const ReaderEndCard = forwardRef<HTMLDivElement, Props>(function ReaderEndCard(
  { articleId, override, onNavigate },
  ref,
) {
  const { prev, next } = useChapterNav(articleId, override);

  return (
    <div ref={ref} className="rd-endcard">
      <div className="rd-endcard__divider" />
      <div className="rd-endcard__row">
        {prev ? (
          <button
            type="button"
            className="rd-endcard__link rd-endcard__link--prev"
            onClick={() => onNavigate(prev.idChain)}
          >
            <span className="rd-endcard__arrow">←</span>
            <span className="rd-endcard__label">上一章</span>
            <span className="rd-endcard__title">{prev.title}</span>
          </button>
        ) : (
          <span className="rd-endcard__placeholder" />
        )}
        {next ? (
          <button
            type="button"
            className="rd-endcard__link rd-endcard__link--next"
            onClick={() => onNavigate(next.idChain)}
          >
            <span className="rd-endcard__title">{next.title}</span>
            <span className="rd-endcard__label">下一章</span>
            <span className="rd-endcard__arrow">→</span>
          </button>
        ) : (
          <span className="rd-endcard__placeholder" />
        )}
      </div>
      <div className="rd-endcard__finis">— 完 —</div>
    </div>
  );
});
```

- [ ] **Step 2: 加 endcard CSS（追加到 reader.module.css）**

```css
:global(.rd-endcard) {
  margin-top: 64px;
  margin-bottom: 32px;
  text-align: center;
}
:global(.rd-endcard__divider) {
  height: 1px;
  background: var(--rd-border);
  margin: 0 0 22px;
}
:global(.rd-endcard__row) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}
:global(.rd-endcard__link) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--rd-text-dim);
  font: inherit;
}
:global(.rd-endcard__link:hover) { color: var(--rd-link); }
:global(.rd-endcard__link--prev) { text-align: left; }
:global(.rd-endcard__link--next) { text-align: right; color: var(--rd-link); }
:global(.rd-endcard__label) { font-size: 11px; color: var(--rd-text-dim); }
:global(.rd-endcard__title) { color: var(--rd-text-strong); }
:global(.rd-endcard__placeholder) { width: 1px; }
:global(.rd-endcard__finis) {
  margin-top: 18px;
  font-size: 11px;
  letter-spacing: 6px;
  color: var(--rd-text-dim);
}
@media (max-width: 767px) {
  :global(.rd-endcard__row) { flex-direction: column; gap: 12px; }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/ReaderEndCard.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): ReaderEndCard (prev/next + 完, mobile stacks vertically)"
```

---

### Task 8: `ReaderProgressToast`

**Files:** Create `app/read/_reader/ReaderProgressToast.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

interface Props {
  progress: number;
  visible: boolean;
  onDismiss: () => void;
  onResumeToTop: () => void;
}

export function ReaderProgressToast({ progress, visible, onDismiss, onResumeToTop }: Props) {
  if (!visible) return null;
  const pct = Math.round(progress * 100);
  return (
    <div className="rd-resume-toast" role="status" aria-live="polite">
      <span className="rd-resume-toast__text">↩ 上次读到 {pct}%</span>
      <button
        type="button"
        className="rd-resume-toast__action"
        onClick={onResumeToTop}
      >
        从头开始
      </button>
      <button
        type="button"
        className="rd-resume-toast__close"
        aria-label="dismiss"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 2: CSS（追加到 reader.module.css）**

```css
:global(.rd-resume-toast) {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  color: var(--rd-text);
  padding: 8px 12px;
  border-radius: 999px;
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  z-index: 100;
  animation: rd-toast-in 200ms ease;
}
@keyframes rd-toast-in {
  from { opacity: 0; transform: translate(-50%, -8px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
:global(.rd-resume-toast__action) {
  background: transparent;
  border: none;
  color: var(--rd-link);
  cursor: pointer;
  font: inherit;
}
:global(.rd-resume-toast__close) {
  background: transparent;
  border: none;
  color: var(--rd-text-dim);
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/ReaderProgressToast.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): ReaderProgressToast pill with resume-to-top action"
```

---

### Task 9: 集成到 `ReaderShell`

**Files:** Modify `app/read/_reader/ReaderShell.tsx`

- [ ] **Step 1: 重写 shell**

```tsx
'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderPrefs } from './hooks/useReaderPrefs';
import { useArticle } from './hooks/useArticle';
import { useReaderProgress } from './hooks/useReaderProgress';
import { ReaderContent } from './ReaderContent';
import { ReaderEndCard } from './ReaderEndCard';
import { ReaderProgressToast } from './ReaderProgressToast';
import styles from './reader.module.css';

export function ReaderShell({ ids }: { ids: string[] | undefined }) {
  const { prefs } = useReaderPrefs();
  const { data, loading, error } = useArticle(ids);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [endEl, setEndEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setScrollEl(scrollRef.current);
    setEndEl(endRef.current);
  }, [data?.id]);

  const { progress, prevEntry, showResumeToast, dismissToast, resumeToTop } = useReaderProgress({
    articleId: data?.id ?? null,
    articleReady: !loading && !!data,
    scrollEl,
    endSentinel: endEl,
  });

  const onInternalLink = useCallback(
    (path: string) => router.push(`/read/${encodeURIComponent(path)}`),
    [router],
  );

  const onChapterJump = useCallback(
    (idChain: string) => router.push(`/read/${idChain}`),
    [router],
  );

  return (
    <div
      className={`${styles.shell} ${styles[`theme-${prefs.theme}`]}`}
      data-font={prefs.font}
      style={{
        ['--rd-font-size' as never]: `${prefs.fontSize}px`,
        ['--rd-line-height' as never]: prefs.lineHeight,
      }}
    >
      <ReaderProgressToast
        progress={prevEntry?.lastReadProgress ?? 0}
        visible={showResumeToast}
        onDismiss={dismissToast}
        onResumeToTop={resumeToTop}
      />
      <div ref={scrollRef} className={styles.scroller}>
        <main
          className={styles.column}
          data-width={prefs.width}
          data-indent={prefs.indent ? 'true' : 'false'}
        >
          {loading && (
            <div style={{ color: 'var(--rd-text-dim)', fontSize: 14, padding: '40px 0' }}>
              加载中…
            </div>
          )}
          {!loading && error && (
            <div style={{ color: '#f87171', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
              {error}
            </div>
          )}
          {!loading && !data && !error && (
            <div style={{ color: 'var(--rd-text-dim)', textAlign: 'center', padding: '80px 0' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>请选择一篇文章</p>
            </div>
          )}
          {!loading && data && (
            <>
              <ReaderContent
                content={data.content}
                currentPath={data.path}
                onInternalLink={onInternalLink}
              />
              <ReaderEndCard
                articleId={data.id}
                onNavigate={onChapterJump}
              />
            </>
          )}
          <div ref={endRef} aria-hidden style={{ height: 1 }} />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 加 scroller CSS（追加 reader.module.css）**

```css
.scroller {
  height: 100vh;
  overflow-y: auto;
  scroll-behavior: smooth;
}
```

> **重要：** 之前 `.shell` 的 `overflow-x: hidden`/容器规则不变；现在滚动容器是内层 `.scroller`。

- [ ] **Step 3: build + restart 验证**

```bash
npm run build && npm run restart
```

打开同一文章两次：
- 第一次滚到 30% 后离开
- 第二次打开 → 顶部出现 toast「↩ 上次读到 30%」3s 自动消失，已经定位在 30%

- [ ] **Step 4: 验证完成判定**

滚到底（章末区域进入视口）→ 检查 localStorage `never-wiki.reader.history` 中该 articleId 的 `completedAt` 字段已写入。

- [ ] **Step 5: Commit**

```bash
git add app/read/_reader/ReaderShell.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): wire progress + resume toast + end card into ReaderShell"
```

---

### Task 10: 验收 phase-3

- [ ] **Step 1: 跑全部测试**

```bash
npm test
```
Expected: prefs (8) + chapter-nav (7) + reading-time (5) = 20 passed.

- [ ] **Step 2: tag**

```bash
git tag reader/phase-3-chapter-nav
```

---

## Phase-3 验收标准

- [ ] chapter-nav 单测 7 个 pass
- [ ] reading-time 单测 5 个 pass
- [ ] `/api/articles/list` 返回扁平 ArticleNode 数组
- [ ] 章末两端线渲染：上一章 + 下一章 + 居中"完"
- [ ] 桌面横向；手机端自动堆叠为上下两行
- [ ] 进度自动跳回上次位置（5%–95% 之间）+ 顶部 Toast 3s 自动消失
- [ ] 进度条 `progress` 实时更新（DevTools 可查 state）
- [ ] 滚到章末 → localStorage 写入 `completedAt`
- [ ] 节流 5s 写入 history（不爆 IO）
- [ ] frontmatter `prev/next` 覆盖生效（手动塞一个 frontmatter 验证）
