# Phase 4 · 唤出 / 顶底 bar / 抽屉骨架 / 键盘 / 手势

**Goal:** 实装"极简禅模式 + 点击中部唤出 chrome"。打通顶 bar、底 bar、左抽屉（目录/书房/最近 三 tab，**书房 tab phase-7 实装**）、右抽屉（大纲 + 字数+反链占位）、桌面键盘快捷键、触屏手势。

**Depends on:** Phase 1, 2, 3 完成。

**Architecture:** 加一个 `ReaderUIContext` 管 chrome / drawers 的开关状态。`useChromeToggle` 处理点击中部 + 滚动自动隐藏。键盘走 `useReaderHotkeys`，手势走 `useReaderGestures`（监听 touch 事件，<35px 边缘 swipe）。

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 创建 | `app/read/_reader/ReaderUIContext.tsx` | chrome / drawer 状态 + 调用入口 |
| 创建 | `app/read/_reader/hooks/useChromeToggle.ts` | 点击中部唤出/收起 |
| 创建 | `app/read/_reader/hooks/useReaderHotkeys.ts` | 键盘快捷键 |
| 创建 | `app/read/_reader/hooks/useReaderGestures.ts` | 触屏边缘滑动 |
| 创建 | `app/read/_reader/ReaderTopBar.tsx` | 顶 bar |
| 创建 | `app/read/_reader/ReaderBottomBar.tsx` | 底 bar |
| 创建 | `app/read/_reader/drawers/Drawer.tsx` | 抽屉通用容器（左右共用） |
| 创建 | `app/read/_reader/drawers/LeftDrawer.tsx` | 文章树 / 书房占位 / 最近 三 tab |
| 创建 | `app/read/_reader/drawers/RightDrawer.tsx` | 大纲 + 字数 + 反链占位 |
| 创建 | `app/read/_reader/drawers/TreeTab.tsx` | 文章树 tab（暗色版） |
| 创建 | `app/read/_reader/drawers/RecentTab.tsx` | 最近阅读 |
| 创建 | `app/read/_reader/drawers/OutlineTab.tsx` | 大纲（IntersectionObserver） |
| 修改 | `app/read/_reader/ReaderShell.tsx` | 接入 context + 触发器 |
| 修改 | `app/read/_reader/reader.module.css` | bar / drawer 样式 |

---

### Task 1: `ReaderUIContext`

**Files:** Create `app/read/_reader/ReaderUIContext.tsx`

- [ ] **Step 1: 实现 context**

```tsx
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DrawerSide = 'left' | 'right';
export type LeftTab = 'tree' | 'library' | 'recent';

interface UIState {
  chromeVisible: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  leftTab: LeftTab;
  cmdkOpen: boolean;
  settingsOpen: boolean;
}

interface UIActions {
  toggleChrome: () => void;
  setChromeVisible: (v: boolean) => void;
  openLeft: (tab?: LeftTab) => void;
  closeLeft: () => void;
  toggleLeft: () => void;
  setLeftTab: (tab: LeftTab) => void;
  openRight: () => void;
  closeRight: () => void;
  toggleRight: () => void;
  closeAll: () => void;
  openCmdk: () => void;
  closeCmdk: () => void;
  toggleCmdk: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

const Ctx = createContext<(UIState & UIActions) | null>(null);

export function ReaderUIProvider({ children }: { children: ReactNode }) {
  const [chromeVisible, setChromeVisible] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftTab, setLeftTabState] = useState<LeftTab>('tree');
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // mobile-only mutex (handled in caller via responsive util)
  const isPhone = () => typeof window !== 'undefined' && window.innerWidth < 768;

  const openLeft = useCallback((tab?: LeftTab) => {
    if (tab) setLeftTabState(tab);
    if (isPhone() && rightOpen) setRightOpen(false);
    setLeftOpen(true);
  }, [rightOpen]);
  const openRight = useCallback(() => {
    if (isPhone() && leftOpen) setLeftOpen(false);
    setRightOpen(true);
  }, [leftOpen]);

  const value: UIState & UIActions = {
    chromeVisible,
    leftOpen,
    rightOpen,
    leftTab,
    cmdkOpen,
    settingsOpen,
    toggleChrome: () => setChromeVisible((v) => !v),
    setChromeVisible,
    openLeft,
    closeLeft: () => setLeftOpen(false),
    toggleLeft: () => (leftOpen ? setLeftOpen(false) : openLeft()),
    setLeftTab: (tab) => setLeftTabState(tab),
    openRight,
    closeRight: () => setRightOpen(false),
    toggleRight: () => (rightOpen ? setRightOpen(false) : openRight()),
    closeAll: () => {
      setChromeVisible(false);
      setLeftOpen(false);
      setRightOpen(false);
      setCmdkOpen(false);
      setSettingsOpen(false);
    },
    openCmdk: () => setCmdkOpen(true),
    closeCmdk: () => setCmdkOpen(false),
    toggleCmdk: () => setCmdkOpen((v) => !v),
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    toggleSettings: () => setSettingsOpen((v) => !v),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReaderUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useReaderUI must be inside ReaderUIProvider');
  return v;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/ReaderUIContext.tsx
git commit -m "feat(reader): ReaderUIContext (chrome/drawers/cmdk/settings state)"
```

---

### Task 2: `useChromeToggle` hook

**Files:** Create `app/read/_reader/hooks/useChromeToggle.ts`

- [ ] **Step 1: 实现"点击中部唤出 + 滚动自动隐藏"**

```ts
'use client';

import { useEffect, useRef } from 'react';
import { useReaderUI } from '../ReaderUIContext';

export function useChromeToggle(scrollEl: HTMLElement | null) {
  const { chromeVisible, toggleChrome, setChromeVisible } = useReaderUI();
  const lastScrollTopRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);

  // 1) Click center → toggle (only when not selecting text / not on link)
  useEffect(() => {
    if (!scrollEl) return;
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 4) return;                 // drag/scroll, not click
      const sel = window.getSelection?.();
      if (sel && !sel.isCollapsed) return;   // selecting text
      const t = e.target as HTMLElement;
      if (
        t.closest('a, button, input, textarea, [data-rd-no-toggle]') ||
        t.closest('.rd-codeblock, .rd-resume-toast, .rd-drawer, .rd-topbar, .rd-bottombar')
      ) return;
      toggleChrome();
    };
    scrollEl.addEventListener('pointerdown', onPointerDown);
    scrollEl.addEventListener('pointerup', onPointerUp);
    return () => {
      scrollEl.removeEventListener('pointerdown', onPointerDown);
      scrollEl.removeEventListener('pointerup', onPointerUp);
    };
  }, [scrollEl, toggleChrome]);

  // 2) Scrolling hides chrome; pause for 1.5s after stop → keep visible
  useEffect(() => {
    if (!scrollEl) return;
    const onScroll = () => {
      const top = scrollEl.scrollTop;
      const delta = Math.abs(top - lastScrollTopRef.current);
      lastScrollTopRef.current = top;
      if (delta > 8 && chromeVisible) setChromeVisible(false);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [scrollEl, chromeVisible, setChromeVisible]);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useChromeToggle.ts
git commit -m "feat(reader): useChromeToggle (click center to toggle, scroll auto-hide)"
```

---

### Task 3: `useReaderHotkeys`

**Files:** Create `app/read/_reader/hooks/useReaderHotkeys.ts`

- [ ] **Step 1: 实现键盘表**

```ts
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderUI } from '../ReaderUIContext';

export interface UseReaderHotkeysOptions {
  scrollEl: HTMLElement | null;
  prevChain?: string;
  nextChain?: string;
  onJumpToTop: () => void;
  onJumpToEnd: () => void;
  onResumeToLast: () => void;
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    el.isContentEditable === true
  );
}

export function useReaderHotkeys({
  scrollEl,
  prevChain,
  nextChain,
  onJumpToTop,
  onJumpToEnd,
  onResumeToLast,
}: UseReaderHotkeysOptions) {
  const router = useRouter();
  const ui = useReaderUI();

  useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ui.toggleCmdk();
        return;
      }
      // ⌘,  (settings)
      if (meta && e.key === ',') {
        e.preventDefault();
        ui.toggleSettings();
        return;
      }
      // ⌘B  (favorite — wired in phase 6)
      if (meta && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('reader:toggle-favorite'));
        return;
      }
      if (e.key === 'Escape') {
        ui.closeAll();
        return;
      }
      switch (e.key) {
        case '[':
          e.preventDefault();
          ui.toggleLeft();
          return;
        case ']':
          e.preventDefault();
          ui.toggleRight();
          return;
        case 'ArrowLeft':
          if (prevChain) {
            e.preventDefault();
            router.push(`/read/${prevChain}`);
          }
          return;
        case 'ArrowRight':
          if (nextChain) {
            e.preventDefault();
            router.push(`/read/${nextChain}`);
          }
          return;
        case ' ':
          if (scrollEl) {
            e.preventDefault();
            scrollEl.scrollBy({ top: scrollEl.clientHeight * 0.85, behavior: 'smooth' });
          }
          return;
        case 'h':
        case 'H':
          e.preventDefault();
          onResumeToLast();
          return;
        case 'g':
          if (Date.now() - lastG < 400) {
            e.preventDefault();
            onJumpToTop();
            lastG = 0;
          } else {
            lastG = Date.now();
          }
          return;
        case 'e':
        case 'E':
          if (lastG > 0) {
            e.preventDefault();
            onJumpToEnd();
            lastG = 0;
          }
          return;
        case 'f':
        case 'F':
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, ui, scrollEl, prevChain, nextChain, onJumpToTop, onJumpToEnd, onResumeToLast]);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useReaderHotkeys.ts
git commit -m "feat(reader): keyboard hotkeys ([/] arrows space gg ge cmdk cmd, esc f h)"
```

---

### Task 4: `useReaderGestures`

**Files:** Create `app/read/_reader/hooks/useReaderGestures.ts`

- [ ] **Step 1: 实现边缘 swipe**

```ts
'use client';

import { useEffect } from 'react';
import { useReaderUI } from '../ReaderUIContext';

const EDGE_PX = 24;
const MIN_SWIPE_DX = 60;
const MAX_SWIPE_DY = 50;

export function useReaderGestures(scrollEl: HTMLElement | null) {
  const ui = useReaderUI();
  useEffect(() => {
    if (!scrollEl) return;
    let startX = 0;
    let startY = 0;
    let edge: 'left' | 'right' | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      const w = window.innerWidth;
      if (startX < EDGE_PX) edge = 'left';
      else if (startX > w - EDGE_PX) edge = 'right';
      else edge = null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!edge) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dy > MAX_SWIPE_DY) return;
      if (edge === 'left' && dx > MIN_SWIPE_DX) ui.openLeft();
      else if (edge === 'right' && -dx > MIN_SWIPE_DX) ui.openRight();
    };
    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      scrollEl.removeEventListener('touchstart', onTouchStart);
      scrollEl.removeEventListener('touchend', onTouchEnd);
    };
  }, [scrollEl, ui]);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useReaderGestures.ts
git commit -m "feat(reader): edge swipe gestures (left/right) for touch"
```

---

### Task 5: `Drawer` 通用容器

**Files:** Create `app/read/_reader/drawers/Drawer.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  side: 'left' | 'right';
  open: boolean;
  width: number;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
}

export function Drawer({ side, open, width, onClose, children, ariaLabel }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="rd-drawer__overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`rd-drawer rd-drawer--${side} ${open ? 'rd-drawer--open' : ''}`}
        style={{ width: `${width}px` }}
        aria-label={ariaLabel}
        aria-hidden={!open}
      >
        <div className="rd-drawer__head">
          <span>{ariaLabel}</span>
          <button
            type="button"
            className="rd-drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={14} />
          </button>
        </div>
        <div className="rd-drawer__body">{children}</div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Drawer CSS（追加 reader.module.css）**

```css
:global(.rd-drawer) {
  position: fixed;
  top: 0;
  bottom: 0;
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  z-index: 60;
  display: flex;
  flex-direction: column;
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.55);
}
:global(.rd-drawer--left)  { left: 0;  border-right: 1px solid var(--rd-border); transform: translateX(-100%); }
:global(.rd-drawer--right) { right: 0; border-left:  1px solid var(--rd-border); transform: translateX(100%); }
:global(.rd-drawer--open) { transform: translateX(0); }
:global(.rd-drawer__overlay) {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 50;
  animation: rd-fade 200ms ease;
}
@keyframes rd-fade { from { opacity: 0; } to { opacity: 1; } }

:global(.rd-drawer__head) {
  height: 40px;
  border-bottom: 1px solid var(--rd-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 12px;
  color: var(--rd-text-strong);
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
:global(.rd-drawer__close) {
  background: transparent;
  border: none;
  color: var(--rd-text-dim);
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
:global(.rd-drawer__close:hover) { background: rgba(255,255,255,0.05); color: var(--rd-text); }
:global(.rd-drawer__body) {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

@media (max-width: 767px) {
  :global(.rd-drawer) { width: 100% !important; }
  :global(.rd-drawer__overlay) { display: none; } /* full-screen sheet */
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/drawers/Drawer.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): Drawer container with overlay + esc + mobile full-sheet"
```

---

### Task 6: 文章树 tab（暗色版）

**Files:** Create `app/read/_reader/drawers/TreeTab.tsx`

> **复用策略：** 不要直接 import 编辑器的 `TreeMenu.tsx`，那会拖入大量 UI 包。改为新写一个轻量暗色版，调 `/api/articles/list` 拿数据。

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { ArticleNode } from '@/lib/reader/chapter-nav';

interface FolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: AnyNode[];
}
interface FileNode {
  type: 'file';
  article: ArticleNode;
}
type AnyNode = FolderNode | FileNode;

function buildTree(flat: ArticleNode[]): AnyNode[] {
  const root: FolderNode = { type: 'folder', name: '', path: '', children: [] };
  for (const a of flat) {
    const segs = a.path.split('/').filter(Boolean);
    const fileName = segs.pop() || a.title;
    let cursor = root;
    let curPath = '';
    for (const seg of segs) {
      curPath = curPath ? `${curPath}/${seg}` : seg;
      let next = cursor.children.find(
        (n) => n.type === 'folder' && n.name === seg,
      ) as FolderNode | undefined;
      if (!next) {
        next = { type: 'folder', name: seg, path: curPath, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
    cursor.children.push({ type: 'file', article: { ...a, title: fileName } });
  }
  return root.children;
}

interface Props {
  currentArticleId: string | undefined;
  onSelect: (idChain: string) => void;
}

const EXPAND_KEY = 'never-wiki.reader.tree.expanded';

export function TreeTab({ currentArticleId, onSelect }: Props) {
  const [flat, setFlat] = useState<ArticleNode[]>([]);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (typeof localStorage === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(EXPAND_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    fetch('/api/articles/list')
      .then((r) => r.json())
      .then((j) => setFlat(j?.data || []));
  }, []);

  // Auto-expand parents of current article
  useEffect(() => {
    if (!currentArticleId) return;
    const cur = flat.find((a) => a.id === currentArticleId);
    if (!cur) return;
    const segs = cur.path.split('/').filter(Boolean);
    segs.pop();
    const next = new Set(expanded);
    let acc = '';
    for (const s of segs) {
      acc = acc ? `${acc}/${s}` : s;
      next.add(acc);
    }
    setExpanded(next);
    localStorage.setItem(EXPAND_KEY, JSON.stringify([...next]));
  }, [currentArticleId, flat]);

  const tree = useMemo(() => buildTree(flat), [flat]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      localStorage.setItem(EXPAND_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const filtered = filter.trim().toLowerCase();

  const Render = ({ nodes, depth }: { nodes: AnyNode[]; depth: number }) => (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {nodes.map((n) => {
        if (n.type === 'folder') {
          const open = expanded.has(n.path);
          if (filtered) {
            // crude filter: keep folder if any descendant matches
            const hasMatch = (sub: AnyNode[]): boolean =>
              sub.some((c) =>
                c.type === 'file'
                  ? c.article.title.toLowerCase().includes(filtered)
                  : hasMatch(c.children),
              );
            if (!hasMatch(n.children)) return null;
          }
          return (
            <li key={`f:${n.path}`}>
              <button
                type="button"
                className="rd-tree__row rd-tree__folder"
                style={{ paddingLeft: 8 + depth * 12 }}
                onClick={() => toggle(n.path)}
              >
                <ChevronRight
                  size={12}
                  style={{
                    transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 120ms',
                  }}
                />
                <span>{n.name}</span>
              </button>
              {open && <Render nodes={n.children} depth={depth + 1} />}
            </li>
          );
        }
        const a = n.article;
        if (filtered && !a.title.toLowerCase().includes(filtered)) return null;
        const active = a.id === currentArticleId;
        return (
          <li key={`a:${a.id}`}>
            <button
              type="button"
              className={`rd-tree__row rd-tree__file ${active ? 'rd-tree__file--active' : ''}`}
              style={{ paddingLeft: 8 + depth * 12 + 14 }}
              onClick={() => onSelect(a.idChain)}
            >
              {a.title}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="rd-tree">
      <div className="rd-tree__search">
        <input
          type="search"
          placeholder="搜索本树…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <Render nodes={tree} depth={0} />
    </div>
  );
}
```

- [ ] **Step 2: Tree CSS（追加）**

```css
:global(.rd-tree__search) {
  padding: 8px 10px;
  border-bottom: 1px solid var(--rd-border);
}
:global(.rd-tree__search input) {
  width: 100%;
  background: var(--rd-bg);
  border: 1px solid var(--rd-border);
  border-radius: 4px;
  color: var(--rd-text);
  font-size: 11px;
  padding: 4px 8px;
  outline: none;
}
:global(.rd-tree__search input:focus) { border-color: var(--rd-link); }
:global(.rd-tree__row) {
  display: flex;
  gap: 4px;
  align-items: center;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--rd-text);
  padding: 5px 12px 5px 8px;
  font-size: 12px;
  font: inherit;
}
:global(.rd-tree__row:hover) { background: rgba(255,255,255,0.05); }
:global(.rd-tree__folder) { color: var(--rd-text-muted); }
:global(.rd-tree__file--active) {
  background: rgba(122,162,247,0.12);
  color: var(--rd-text-strong);
  border-left: 2px solid var(--rd-link);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/drawers/TreeTab.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): TreeTab dark article tree with filter + expand memory"
```

---

### Task 7: `RecentTab`

**Files:** Create `app/read/_reader/drawers/RecentTab.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { listHistory, type HistoryEntry } from '@/lib/reader/storage-client';
import type { ArticleNode } from '@/lib/reader/chapter-nav';

interface Props {
  onSelect: (idChain: string) => void;
}

export function RecentTab({ onSelect }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [byId, setById] = useState<Map<string, ArticleNode>>(new Map());

  useEffect(() => {
    Promise.all([
      listHistory(),
      fetch('/api/articles/list').then((r) => r.json()),
    ]).then(([hist, j]) => {
      setEntries(hist.slice(0, 30));
      const m = new Map<string, ArticleNode>();
      for (const a of (j?.data || []) as ArticleNode[]) m.set(a.id, a);
      setById(m);
    });
  }, []);

  if (entries.length === 0) {
    return (
      <p style={{ padding: '20px 12px', color: 'var(--rd-text-dim)', fontSize: 12 }}>
        还没有阅读记录。
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {entries.map((e) => {
        const a = byId.get(e.articleId);
        if (!a) return null;
        const pct = Math.round(e.lastReadProgress * 100);
        const done = !!e.completedAt;
        return (
          <li key={e.articleId}>
            <button
              type="button"
              className="rd-recent__row"
              onClick={() => onSelect(a.idChain)}
            >
              <div className="rd-recent__title">{a.title}</div>
              <div className="rd-recent__meta">
                <span>{done ? '✓ 已读完' : `${pct}%`}</span>
                <span>{new Date(e.lastReadAt).toLocaleDateString()}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-recent__row) {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--rd-border);
  padding: 10px 14px;
  cursor: pointer;
  color: var(--rd-text);
  font: inherit;
}
:global(.rd-recent__row:hover) { background: rgba(255,255,255,0.04); }
:global(.rd-recent__title) {
  font-size: 13px;
  color: var(--rd-text-strong);
  margin-bottom: 4px;
}
:global(.rd-recent__meta) {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--rd-text-dim);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/drawers/RecentTab.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): RecentTab last 30 entries with progress badge"
```

---

### Task 8: `OutlineTab`

**Files:** Create `app/read/_reader/drawers/OutlineTab.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface Props {
  scrollEl: HTMLElement | null;
  contentSelector: string; // 例如 .rd-content-root
}

export function OutlineTab({ scrollEl, contentSelector }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 1) Collect headings on mount + when content changes
  useEffect(() => {
    const el = document.querySelector(contentSelector);
    if (!el) return;
    const hs = Array.from(el.querySelectorAll('h2, h3, h4')) as HTMLElement[];
    const list: Heading[] = hs
      .filter((h) => h.id)
      .map((h) => ({ id: h.id, text: h.innerText, level: parseInt(h.tagName[1], 10) }));
    setHeadings(list);
  }, [contentSelector]);

  // 2) Sync active heading with scroll
  useEffect(() => {
    if (!scrollEl || headings.length === 0) return;
    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((x): x is HTMLElement => !!x);
    if (targets.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { root: scrollEl, rootMargin: '0px 0px -70% 0px', threshold: 0.1 },
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, [scrollEl, headings]);

  const onClick = (id: string) => {
    const t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (headings.length === 0) {
    return (
      <p style={{ padding: '20px 12px', color: 'var(--rd-text-dim)', fontSize: 12 }}>
        本文无小节。
      </p>
    );
  }

  return (
    <ul className="rd-outline">
      {headings.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            className={`rd-outline__row ${activeId === h.id ? 'rd-outline__row--active' : ''}`}
            style={{ paddingLeft: 8 + (h.level - 2) * 14 }}
            onClick={() => onClick(h.id)}
          >
            {h.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-outline) { list-style: none; padding: 0; margin: 0; }
:global(.rd-outline__row) {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--rd-text-muted);
  padding: 5px 12px;
  font-size: 12px;
  line-height: 1.6;
  font: inherit;
}
:global(.rd-outline__row:hover) { color: var(--rd-text-strong); }
:global(.rd-outline__row--active) {
  color: var(--rd-text-strong);
  border-left: 2px solid var(--rd-link);
  background: rgba(122,162,247,0.08);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/drawers/OutlineTab.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): OutlineTab with IntersectionObserver-driven active state"
```

---

### Task 9: `LeftDrawer` + `RightDrawer`

**Files:**
- Create: `app/read/_reader/drawers/LeftDrawer.tsx`
- Create: `app/read/_reader/drawers/RightDrawer.tsx`

- [ ] **Step 1: LeftDrawer**

```tsx
'use client';

import { useReaderUI, type LeftTab } from '../ReaderUIContext';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import { Drawer } from './Drawer';
import { TreeTab } from './TreeTab';
import { RecentTab } from './RecentTab';

interface Props {
  currentArticleId: string | undefined;
  onSelect: (idChain: string) => void;
}

export function LeftDrawer({ currentArticleId, onSelect }: Props) {
  const ui = useReaderUI();
  const { prefs } = useReaderPrefs();

  return (
    <Drawer
      side="left"
      open={ui.leftOpen}
      width={prefs.leftDrawerWidth}
      onClose={ui.closeLeft}
      ariaLabel="导航抽屉"
    >
      <nav className="rd-drawer__tabs">
        {(['tree', 'library', 'recent'] as LeftTab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`rd-drawer__tab ${ui.leftTab === t ? 'rd-drawer__tab--active' : ''}`}
            onClick={() => ui.setLeftTab(t)}
          >
            {t === 'tree' ? '目录' : t === 'library' ? '书房' : '最近'}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {ui.leftTab === 'tree' && (
          <TreeTab currentArticleId={currentArticleId} onSelect={onSelect} />
        )}
        {ui.leftTab === 'library' && (
          <p style={{ padding: '20px 12px', color: 'var(--rd-text-dim)', fontSize: 12 }}>
            书房功能将在 phase 7 实装。
          </p>
        )}
        {ui.leftTab === 'recent' && <RecentTab onSelect={onSelect} />}
      </div>
    </Drawer>
  );
}
```

- [ ] **Step 2: RightDrawer**

```tsx
'use client';

import { useReaderUI } from '../ReaderUIContext';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import { Drawer } from './Drawer';
import { OutlineTab } from './OutlineTab';
import { useMemo } from 'react';
import { countWords, estimateMinutes } from '@/lib/reader/reading-time';

interface Props {
  scrollEl: HTMLElement | null;
  contentMd?: string;
}

export function RightDrawer({ scrollEl, contentMd }: Props) {
  const ui = useReaderUI();
  const { prefs } = useReaderPrefs();
  const { words, minutes } = useMemo(() => {
    if (!contentMd) return { words: 0, minutes: 0 };
    const w = countWords(contentMd, { stripCode: true });
    return { words: w, minutes: estimateMinutes(w) };
  }, [contentMd]);

  return (
    <Drawer
      side="right"
      open={ui.rightOpen}
      width={prefs.rightDrawerWidth}
      onClose={ui.closeRight}
      ariaLabel="文章大纲"
    >
      <div className="rd-drawer__meta">
        <span>{words.toLocaleString()} 字</span>
        <span>·</span>
        <span>{minutes} 分钟</span>
      </div>
      <OutlineTab scrollEl={scrollEl} contentSelector=".rd-content-root" />
      <div className="rd-drawer__backlinks">
        <span className="rd-drawer__section-title">反向链接</span>
        <p style={{ color: 'var(--rd-text-dim)', fontSize: 11, padding: '0 12px' }}>
          反链将在 phase 7 接入。
        </p>
      </div>
    </Drawer>
  );
}
```

- [ ] **Step 3: tab + meta CSS**

```css
:global(.rd-drawer__tabs) {
  display: flex;
  border-bottom: 1px solid var(--rd-border);
  flex-shrink: 0;
}
:global(.rd-drawer__tab) {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--rd-text-muted);
  font: inherit;
  font-size: 12px;
  padding: 8px 0;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
:global(.rd-drawer__tab--active) {
  color: var(--rd-text-strong);
  border-bottom-color: var(--rd-accent);
}
:global(.rd-drawer__meta) {
  padding: 8px 14px;
  border-bottom: 1px solid var(--rd-border);
  font-size: 11px;
  color: var(--rd-text-dim);
  display: flex;
  gap: 6px;
}
:global(.rd-drawer__backlinks) {
  border-top: 1px solid var(--rd-border);
  padding: 8px 0 14px;
}
:global(.rd-drawer__section-title) {
  display: block;
  padding: 6px 12px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--rd-text-dim);
}
```

- [ ] **Step 4: Commit**

```bash
git add app/read/_reader/drawers/LeftDrawer.tsx app/read/_reader/drawers/RightDrawer.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): LeftDrawer (3 tabs) + RightDrawer (outline + meta + backlinks placeholder)"
```

---

### Task 10: `ReaderTopBar`

**Files:** Create `app/read/_reader/ReaderTopBar.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { Menu, Star, Settings as SettingsIcon, AlignRight, Command } from 'lucide-react';
import { useReaderUI } from './ReaderUIContext';
import { estimateMinutes } from '@/lib/reader/reading-time';

interface Props {
  visible: boolean;
  pathSegments: string[];
  progress: number;       // 0..1
  totalWords: number;
  isFavorite: boolean;
  onCrumbClick: (depth: number) => void;
  onToggleFavorite: () => void;
}

export function ReaderTopBar({
  visible,
  pathSegments,
  progress,
  totalWords,
  isFavorite,
  onCrumbClick,
  onToggleFavorite,
}: Props) {
  const ui = useReaderUI();
  const minsRemaining = Math.max(0, estimateMinutes(totalWords * (1 - progress)) - 1);
  const pct = Math.round(progress * 100);

  return (
    <header className={`rd-topbar ${visible ? 'rd-topbar--visible' : ''}`} aria-hidden={!visible}>
      <button type="button" className="rd-topbar__icon" onClick={ui.toggleLeft} aria-label="目录">
        <Menu size={16} />
      </button>
      <nav className="rd-topbar__crumbs" aria-label="breadcrumbs">
        {pathSegments.map((seg, i, arr) => {
          const last = i === arr.length - 1;
          return (
            <span key={i}>
              {i > 0 && <span className="rd-topbar__crumb-sep">›</span>}
              {last ? (
                <span className="rd-topbar__crumb-current">{seg}</span>
              ) : (
                <button
                  type="button"
                  className="rd-topbar__crumb"
                  onClick={() => onCrumbClick(i)}
                >
                  {seg}
                </button>
              )}
            </span>
          );
        })}
      </nav>
      <div className="rd-topbar__progress">
        {pct}% · 还剩 {minsRemaining} 分钟
      </div>
      <button
        type="button"
        className={`rd-topbar__icon ${isFavorite ? 'rd-topbar__icon--star' : ''}`}
        onClick={onToggleFavorite}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
      >
        <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
      <button type="button" className="rd-topbar__icon" onClick={ui.openCmdk} aria-label="命令面板">
        <Command size={16} />
      </button>
      <button type="button" className="rd-topbar__icon" onClick={ui.openSettings} aria-label="设置">
        <SettingsIcon size={16} />
      </button>
      <button type="button" className="rd-topbar__icon" onClick={ui.toggleRight} aria-label="大纲">
        <AlignRight size={16} />
      </button>
    </header>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-topbar) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: var(--rd-bg-bar);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--rd-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  z-index: 40;
  color: var(--rd-text);
  font-size: 12px;
  transition: opacity 200ms, transform 200ms;
  opacity: 0;
  transform: translateY(-100%);
  pointer-events: none;
}
:global(.rd-topbar--visible) {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
:global(.rd-topbar__icon) {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--rd-text-muted);
  cursor: pointer;
}
:global(.rd-topbar__icon:hover) { background: rgba(255,255,255,0.06); color: var(--rd-text); }
:global(.rd-topbar__icon--star) { color: var(--rd-accent); }
:global(.rd-topbar__crumbs) {
  flex: 1;
  display: flex;
  gap: 4px;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  font-size: 11px;
}
:global(.rd-topbar__crumb) {
  background: transparent;
  border: none;
  color: var(--rd-text-dim);
  cursor: pointer;
  font: inherit;
  padding: 2px 4px;
  border-radius: 3px;
}
:global(.rd-topbar__crumb:hover) { color: var(--rd-text); background: rgba(255,255,255,0.04); }
:global(.rd-topbar__crumb-current) { color: var(--rd-text-strong); padding: 2px 4px; }
:global(.rd-topbar__crumb-sep) { color: var(--rd-border); padding: 0 2px; }
:global(.rd-topbar__progress) {
  font-size: 10px;
  color: var(--rd-text-dim);
  letter-spacing: 0.3px;
}
@media (max-width: 767px) {
  :global(.rd-topbar) { height: 44px; }
  :global(.rd-topbar__progress) { display: none; }
  :global(.rd-topbar__crumbs) { font-size: 12px; }
  /* Mobile only show last 2 segments */
  :global(.rd-topbar__crumbs > span:nth-last-child(n+3)) { display: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/ReaderTopBar.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): ReaderTopBar (crumbs, progress, fav, cmdk, settings, outline)"
```

---

### Task 11: `ReaderBottomBar`

**Files:** Create `app/read/_reader/ReaderBottomBar.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

interface Props {
  visible: boolean;
  prevTitle?: string;
  nextTitle?: string;
  positionN: number;     // 1-indexed
  positionTotal: number;
  progress: number;      // 0..1
  scrollEl: HTMLElement | null;
  onPrev: () => void;
  onNext: () => void;
}

export function ReaderBottomBar({
  visible,
  prevTitle,
  nextTitle,
  positionN,
  positionTotal,
  progress,
  scrollEl,
  onPrev,
  onNext,
}: Props) {
  const onScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollEl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = ratio * (scrollEl.scrollHeight - scrollEl.clientHeight);
    scrollEl.scrollTo({ top: target, behavior: 'smooth' });
  };

  return (
    <footer className={`rd-bottombar ${visible ? 'rd-bottombar--visible' : ''}`} aria-hidden={!visible}>
      <div className="rd-bottombar__row">
        <button
          type="button"
          className="rd-bottombar__nav"
          disabled={!prevTitle}
          onClick={onPrev}
        >
          ‹ {prevTitle ?? '上一篇'}
        </button>
        <span className="rd-bottombar__pos">
          第 {positionN} / {positionTotal} 篇
        </span>
        <button
          type="button"
          className="rd-bottombar__nav rd-bottombar__nav--next"
          disabled={!nextTitle}
          onClick={onNext}
        >
          {nextTitle ?? '下一篇'} ›
        </button>
      </div>
      <div className="rd-bottombar__bar" onClick={onScrub} role="slider" aria-valuenow={Math.round(progress * 100)}>
        <div className="rd-bottombar__bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-bottombar) {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--rd-bg-bar);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--rd-border);
  z-index: 40;
  padding: 6px 12px 8px;
  transition: opacity 200ms, transform 200ms;
  opacity: 0;
  transform: translateY(100%);
  pointer-events: none;
}
:global(.rd-bottombar--visible) {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
:global(.rd-bottombar__row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--rd-text-muted);
}
:global(.rd-bottombar__nav) {
  background: transparent;
  border: none;
  color: var(--rd-text);
  cursor: pointer;
  font: inherit;
  padding: 4px 8px;
  border-radius: 4px;
}
:global(.rd-bottombar__nav:disabled) { color: var(--rd-text-dim); cursor: not-allowed; }
:global(.rd-bottombar__nav:not(:disabled):hover) { background: rgba(255,255,255,0.05); }
:global(.rd-bottombar__nav--next) { color: var(--rd-link); }
:global(.rd-bottombar__pos) { font-size: 10px; }
:global(.rd-bottombar__bar) {
  height: 4px;
  background: var(--rd-border);
  border-radius: 2px;
  margin-top: 6px;
  cursor: pointer;
  position: relative;
}
:global(.rd-bottombar__bar-fill) {
  height: 100%;
  background: var(--rd-accent);
  border-radius: 2px;
  transition: width 100ms;
}
@media (max-width: 767px) {
  :global(.rd-bottombar) { padding: 8px 12px env(safe-area-inset-bottom, 8px); }
  :global(.rd-bottombar__pos) { display: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/ReaderBottomBar.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): ReaderBottomBar (prev/next/scrubber + safe-area)"
```

---

### Task 12: 把 chrome 接入 ReaderShell

**Files:** Modify `app/read/_reader/ReaderShell.tsx`

- [ ] **Step 1: 注入 UIProvider，串起所有组件**

```tsx
'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ReaderUIProvider, useReaderUI } from './ReaderUIContext';
import { useReaderPrefs } from './hooks/useReaderPrefs';
import { useArticle } from './hooks/useArticle';
import { useReaderProgress } from './hooks/useReaderProgress';
import { useChromeToggle } from './hooks/useChromeToggle';
import { useReaderHotkeys } from './hooks/useReaderHotkeys';
import { useReaderGestures } from './hooks/useReaderGestures';
import { useChapterNav } from './hooks/useChapterNav';
import { ReaderContent } from './ReaderContent';
import { ReaderEndCard } from './ReaderEndCard';
import { ReaderProgressToast } from './ReaderProgressToast';
import { ReaderTopBar } from './ReaderTopBar';
import { ReaderBottomBar } from './ReaderBottomBar';
import { LeftDrawer } from './drawers/LeftDrawer';
import { RightDrawer } from './drawers/RightDrawer';
import { countWords } from '@/lib/reader/reading-time';
import styles from './reader.module.css';

function Inner({ ids }: { ids: string[] | undefined }) {
  const { prefs } = useReaderPrefs();
  const { data, loading, error } = useArticle(ids);
  const router = useRouter();
  const ui = useReaderUI();

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
  useChromeToggle(scrollEl);
  useReaderGestures(scrollEl);

  const { prev, next } = useChapterNav(data?.id);
  const totalWords = useMemo(() => (data ? countWords(data.content, { stripCode: true }) : 0), [data]);

  const onChapterJump = useCallback(
    (idChain: string) => router.push(`/read/${idChain}`),
    [router],
  );
  const onInternalLink = useCallback(
    (path: string) => router.push(`/read/${encodeURIComponent(path)}`),
    [router],
  );
  const jumpTop = useCallback(() => scrollEl?.scrollTo({ top: 0, behavior: 'smooth' }), [scrollEl]);
  const jumpEnd = useCallback(
    () => scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' }),
    [scrollEl],
  );
  const resumeToLast = useCallback(() => {
    if (!scrollEl || !prevEntry) return;
    scrollEl.scrollTo({ top: prevEntry.scrollPos, behavior: 'smooth' });
  }, [scrollEl, prevEntry]);

  useReaderHotkeys({
    scrollEl,
    prevChain: prev?.idChain,
    nextChain: next?.idChain,
    onJumpToTop: jumpTop,
    onJumpToEnd: jumpEnd,
    onResumeToLast: resumeToLast,
  });

  const segments = data ? data.path.split('/').filter(Boolean) : [];

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
      <ReaderTopBar
        visible={ui.chromeVisible}
        pathSegments={segments}
        progress={progress}
        totalWords={totalWords}
        isFavorite={false /* phase 6 wires real state */}
        onCrumbClick={() => {}}
        onToggleFavorite={() => document.dispatchEvent(new CustomEvent('reader:toggle-favorite'))}
      />
      <ReaderBottomBar
        visible={ui.chromeVisible}
        prevTitle={prev?.title}
        nextTitle={next?.title}
        positionN={1 /* TODO: real index in phase 7 */}
        positionTotal={1}
        progress={progress}
        scrollEl={scrollEl}
        onPrev={() => prev && onChapterJump(prev.idChain)}
        onNext={() => next && onChapterJump(next.idChain)}
      />

      <LeftDrawer
        currentArticleId={data?.id}
        onSelect={onChapterJump}
      />
      <RightDrawer scrollEl={scrollEl} contentMd={data?.content} />

      <div ref={scrollRef} className={styles.scroller}>
        <main
          className={`${styles.column} rd-content-root`}
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
              <p style={{ fontSize: 12 }}>按 <kbd>[</kbd> 打开目录</p>
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

export function ReaderShell({ ids }: { ids: string[] | undefined }) {
  return (
    <ReaderUIProvider>
      <Inner ids={ids} />
    </ReaderUIProvider>
  );
}
```

- [ ] **Step 2: 验证**

```bash
npm run build && npm run restart
```

桌面：
- 点击中部 → 顶 + 底 bar 同时淡入；再点 → 淡出
- `[` → 左抽屉打开（目录 tab，当前文章高亮）
- `]` → 右抽屉打开（大纲 + 字数）
- `←/→` → 上/下一篇
- `Space` → 下翻一屏
- `Esc` → 关闭一切弹层

手机模拟（375×667）：
- 左缘右滑 → 左抽屉全屏 sheet
- 右缘左滑 → 右抽屉全屏 sheet
- 点击中部 → 顶 bar (44px) + 底 sheet 同步淡入

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/ReaderShell.tsx
git commit -m "feat(reader): integrate UI context, top/bottom bars, drawers, hotkeys, gestures"
```

---

### Task 13: 验收 phase-4

- [ ] **Step 1: 跑 build + 测试**

```bash
npm run build && npm test
```
Expected: 全部 20 测试 pass，build success。

- [ ] **Step 2: 桌面 / iPad / 手机 三档手动验证**

| 行为 | 桌面 | iPad | 手机 |
|------|------|------|------|
| 点击中部唤出 | ✓ | ✓ | ✓ |
| `[` 左抽屉 | ✓ | ✓ (蓝牙键盘) | — |
| `]` 右抽屉 | ✓ | ✓ | — |
| 左缘右滑 | — | ✓ | ✓ (全屏) |
| 右缘左滑 | — | ✓ | ✓ |
| `←/→` 切章 | ✓ | ✓ | — |
| 章末点击 | ✓ | ✓ | ✓ |
| `Esc` 关弹层 | ✓ | ✓ (蓝牙) | — |

- [ ] **Step 3: tag**

```bash
git tag reader/phase-4-chrome
```

---

## Phase-4 验收标准

- [ ] 默认无 chrome；点击中部唤出顶 bar + 底 bar 同步
- [ ] 滚动 8px+ 自动隐藏 chrome
- [ ] `[` `]` 打开/关闭左右抽屉
- [ ] 左缘 / 右缘 swipe 触屏端打开抽屉
- [ ] `←/→` 切上下篇文章
- [ ] `Space` 下翻一屏
- [ ] `Esc` 关闭所有弹层
- [ ] `gg` 回顶；`ge` 跳尾；`H` 跳上次位置；`F` 全屏
- [ ] `⌘K` 触发 cmdk open 状态（panel 在 phase-8 实装）
- [ ] `⌘,` 触发 settings open 状态（panel 在 phase-7/9 实装）
- [ ] 大纲 IntersectionObserver 同步当前节高亮
- [ ] 手机抽屉变全屏 sheet，无遮罩
- [ ] 桌面两侧抽屉可同开
