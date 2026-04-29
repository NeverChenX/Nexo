# Phase 8 · ⌘K 命令面板

**Goal:** 全局 `⌘K` 唤起命令面板，搜索 5 类源（文章 / 笔记 / 想法 / 收藏 / 命令）+ 执行命令（切主题/收藏/全屏...）。

**Depends on:** Phase 1–7 完成。

**Architecture:** `commands.ts` 静态注册表（不依赖运行时状态时）+ 动态命令工厂（需访问 `ReaderUIContext`、`prefs`、`useFavorite` 等）。`CommandPalette` 控制台用 `useCmdkSearch` hook 把 5 个源合并成统一 `Result[]`，`Fuse.js` 模糊匹配，按类别分组。

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 创建 | `app/read/_reader/cmdk/types.ts` | Result/Command 类型 |
| 创建 | `app/read/_reader/cmdk/commands.ts` | 命令注册（静态） |
| 创建 | `app/read/_reader/cmdk/useCmdkCommands.ts` | 把上下文绑成 Result[] |
| 创建 | `app/read/_reader/cmdk/useCmdkSearch.ts` | 综合搜索 5 类源 |
| 创建 | `app/read/_reader/cmdk/CommandPalette.tsx` | 弹窗 UI |
| 修改 | `app/read/_reader/ReaderShell.tsx` | 渲染 CommandPalette |

---

### Task 1: 类型定义

**Files:** Create `app/read/_reader/cmdk/types.ts`

- [ ] **Step 1: 实现**

```ts
export type ResultCategory = 'article' | 'note' | 'thought' | 'favorite' | 'command';

export interface BaseResult {
  id: string;
  category: ResultCategory;
  label: string;       // 主显示文本
  hint?: string;       // 副文本（路径/原文片段）
  keywords?: string[]; // 用于扩展匹配
}

export interface ArticleResult extends BaseResult {
  category: 'article';
  idChain: string;
}

export interface NoteResult extends BaseResult {
  category: 'note';
  articleId: string;
  noteId: string;
  anchor: { startOffset: number; endOffset: number; quote: string };
}

export interface ThoughtResult extends BaseResult {
  category: 'thought';
  articleId: string;
  thoughtId: string;
  anchor: { startOffset: number; endOffset: number; quote: string };
}

export interface FavoriteResult extends BaseResult {
  category: 'favorite';
  idChain: string;
}

export interface CommandResult extends BaseResult {
  category: 'command';
  run: () => void | Promise<void>;
}

export type Result =
  | ArticleResult
  | NoteResult
  | ThoughtResult
  | FavoriteResult
  | CommandResult;
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/cmdk/types.ts
git commit -m "feat(reader): cmdk Result type union"
```

---

### Task 2: `useCmdkCommands`

**Files:** Create `app/read/_reader/cmdk/useCmdkCommands.ts`

- [ ] **Step 1: 实现 — 命令绑定上下文**

```ts
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderUI } from '../ReaderUIContext';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import type { CommandResult } from './types';

export function useCmdkCommands(currentArticleId?: string): CommandResult[] {
  const ui = useReaderUI();
  const router = useRouter();
  const { prefs, patch } = useReaderPrefs();

  return useMemo<CommandResult[]>(() => {
    const cycleTheme = () => {
      const next = prefs.theme === 'charcoal' ? 'oled' : prefs.theme === 'oled' ? 'ink' : 'charcoal';
      patch({ theme: next });
    };
    const toggleFont = () => patch({ font: prefs.font === 'sans' ? 'serif' : 'sans' });
    const toggleIndent = () => patch({ indent: !prefs.indent });
    const cycleNoteVis = () => {
      const next =
        prefs.noteVisibility === 'always' ? 'collapsed'
        : prefs.noteVisibility === 'collapsed' ? 'hidden'
        : 'always';
      patch({ noteVisibility: next });
    };
    const fullscreen = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    };
    const exportZip = () => window.open('/api/reader/export', '_blank');
    const goLibrary = () => {
      ui.openLeft('library');
    };
    const fav = () => document.dispatchEvent(new CustomEvent('reader:toggle-favorite'));

    const make = (id: string, label: string, run: () => void, keywords?: string[]): CommandResult => ({
      id: `cmd:${id}`,
      category: 'command',
      label,
      run,
      keywords,
    });

    const list: CommandResult[] = [
      make('cycle-theme', `切换主题（当前: ${prefs.theme}）`, cycleTheme, ['theme', 'dark']),
      make('toggle-font', `切换字体（当前: ${prefs.font === 'sans' ? '无衬线' : '衬线'}）`, toggleFont, ['font']),
      make('toggle-indent', `切换段落首行缩进（当前: ${prefs.indent ? '开' : '关'}）`, toggleIndent, ['indent']),
      make('cycle-note-vis', `切换笔记可见性（当前: ${prefs.noteVisibility}）`, cycleNoteVis, ['note', 'visibility']),
      make('open-settings', '打开设置面板', () => ui.openSettings(), ['settings']),
      make('open-library', '打开我的书房', goLibrary, ['library', 'shufang']),
      make('toggle-fav', '收藏 / 取消收藏当前文章', fav, ['favorite', 'star']),
      make('go-top', '回到顶部', () => window.scrollTo({ top: 0, behavior: 'smooth' }), ['top']),
      make('go-end', '跳到结尾', () => {
        const root = document.querySelector('.rd-content-root');
        if (root) (root as HTMLElement).scrollIntoView({ block: 'end' });
      }, ['end']),
      make('fullscreen', '全屏切换', fullscreen, ['fullscreen']),
      make('export-zip', '导出全部读书痕迹（zip）', exportZip, ['export', 'backup']),
      make('go-editor', '在编辑器中打开当前文章', () => {
        if (currentArticleId) router.push(`/editor/${currentArticleId}`);
      }, ['editor']),
    ];
    return list;
  }, [ui, router, prefs, patch, currentArticleId]);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/cmdk/useCmdkCommands.ts
git commit -m "feat(reader): cmdk command registry bound to UI context + prefs"
```

---

### Task 3: `useCmdkSearch`

**Files:** Create `app/read/_reader/cmdk/useCmdkSearch.ts`

- [ ] **Step 1: 实现 — 5 类源合并 + Fuse 搜索**

```ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import {
  listMarks,
  listNotes,
  listThoughts,
  listFavorites,
} from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import { useCmdkCommands } from './useCmdkCommands';
import type {
  Result,
  ArticleResult,
  NoteResult,
  ThoughtResult,
  FavoriteResult,
} from './types';

interface DataState {
  notes: NoteResult[];
  thoughts: ThoughtResult[];
  favorites: FavoriteResult[];
}

export function useCmdkSearch(currentArticleId?: string) {
  const { articles, byId } = useArticleIndex();
  const commands = useCmdkCommands(currentArticleId);
  const [data, setData] = useState<DataState>({ notes: [], thoughts: [], favorites: [] });

  useEffect(() => {
    Promise.all([listNotes(), listThoughts(), listFavorites()]).then(([ns, ts, fs]) => {
      const notes = ns.map<NoteResult>((n) => ({
        id: `note:${n.id}`,
        category: 'note',
        label: n.text,
        hint: byId.get(n.articleId)?.title || n.articleId,
        articleId: n.articleId,
        noteId: n.id,
        anchor: n.anchor,
        keywords: [n.anchor.quote],
      }));
      const thoughts = ts.map<ThoughtResult>((t) => ({
        id: `thought:${t.id}`,
        category: 'thought',
        label: t.text,
        hint: byId.get(t.articleId)?.title || t.articleId,
        articleId: t.articleId,
        thoughtId: t.id,
        anchor: t.anchor,
        keywords: [t.anchor.quote],
      }));
      const favorites = fs.map<FavoriteResult>((f) => {
        const a = byId.get(f.articleId);
        return {
          id: `fav:${f.articleId}`,
          category: 'favorite',
          label: a?.title || f.articleId,
          hint: a?.parentPath,
          idChain: a?.idChain || '',
        };
      });
      setData({ notes, thoughts, favorites });
    });
  }, [byId]);

  const articleResults = useMemo<ArticleResult[]>(
    () =>
      articles.map((a) => ({
        id: `art:${a.id}`,
        category: 'article',
        label: a.title,
        hint: a.parentPath,
        idChain: a.idChain,
      })),
    [articles],
  );

  const all: Result[] = useMemo(
    () => [
      ...articleResults,
      ...data.notes,
      ...data.thoughts,
      ...data.favorites,
      ...commands,
    ],
    [articleResults, data, commands],
  );

  const fuse = useMemo(
    () =>
      new Fuse(all, {
        keys: ['label', 'hint', 'keywords'],
        threshold: 0.4,
        distance: 200,
        minMatchCharLength: 1,
        includeScore: true,
        ignoreLocation: true,
      }),
    [all],
  );

  function search(query: string): Result[] {
    if (!query.trim()) {
      // Empty: top suggestions = recent commands + favorites + first 5 articles
      return [
        ...commands.slice(0, 5),
        ...data.favorites.slice(0, 5),
        ...articleResults.slice(0, 8),
      ];
    }
    return fuse.search(query, { limit: 30 }).map((r) => r.item);
  }

  function groupResults(results: Result[]): { category: string; items: Result[] }[] {
    const order: Result['category'][] = ['command', 'article', 'favorite', 'note', 'thought'];
    const labels: Record<Result['category'], string> = {
      command: '命令',
      article: '文章',
      favorite: '收藏',
      note: '笔记',
      thought: '想法',
    };
    const buckets = new Map<Result['category'], Result[]>();
    for (const r of results) {
      const arr = buckets.get(r.category) || [];
      if (arr.length < 10) arr.push(r);
      buckets.set(r.category, arr);
    }
    return order
      .filter((c) => buckets.get(c)?.length)
      .map((c) => ({ category: labels[c], items: buckets.get(c)! }));
  }

  return { search, groupResults };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/cmdk/useCmdkSearch.ts
git commit -m "feat(reader): cmdk fuzzy search across 5 sources via Fuse"
```

---

### Task 4: `CommandPalette` UI

**Files:** Create `app/read/_reader/cmdk/CommandPalette.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderUI } from '../ReaderUIContext';
import { useCmdkSearch } from './useCmdkSearch';
import type { Result } from './types';

interface Props {
  currentArticleId?: string;
}

export function CommandPalette({ currentArticleId }: Props) {
  const ui = useReaderUI();
  const router = useRouter();
  const { search, groupResults } = useCmdkSearch(currentArticleId);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ui.cmdkOpen) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [ui.cmdkOpen]);

  const results = useMemo(() => search(query), [search, query]);
  const groups = useMemo(() => groupResults(results), [results, groupResults]);

  const flat: Result[] = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Reset selection when results change
  useEffect(() => {
    setActive(0);
  }, [query, flat.length]);

  const onPick = (r: Result) => {
    ui.closeCmdk();
    switch (r.category) {
      case 'article':
        router.push(`/read/${r.idChain}`);
        return;
      case 'favorite':
        if (r.idChain) router.push(`/read/${r.idChain}`);
        return;
      case 'note':
      case 'thought': {
        // Jump and try to scroll to anchor
        const articleByCat = r.category === 'note' ? r : r;
        const ax = (r as { articleId?: string }).articleId;
        if (ax) router.push(`/read/${ax}`);
        // Anchor scroll handled by listening to a custom event after navigation:
        const evt = new CustomEvent('reader:goto-anchor', {
          detail: { quote: r.label },
        });
        setTimeout(() => document.dispatchEvent(evt), 800);
        return;
      }
      case 'command':
        void r.run();
        return;
    }
  };

  if (!ui.cmdkOpen) return null;

  return (
    <div
      className="rd-cmdk__overlay"
      onClick={ui.closeCmdk}
      data-rd-no-toggle="true"
      role="dialog"
      aria-label="命令面板"
    >
      <div className="rd-cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="rd-cmdk__input"
          placeholder="搜文章 / 跳笔记 / 收藏的内容 / 命令…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(flat.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const r = flat[active];
              if (r) onPick(r);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              ui.closeCmdk();
            }
          }}
        />
        <div className="rd-cmdk__results">
          {groups.length === 0 && (
            <p className="rd-cmdk__empty">没有结果。</p>
          )}
          {groups.map((g) => (
            <div key={g.category}>
              <div className="rd-cmdk__group-label">{g.category}</div>
              {g.items.map((r) => {
                const flatIdx = flat.indexOf(r);
                const isActive = flatIdx === active;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`rd-cmdk__row ${isActive ? 'rd-cmdk__row--active' : ''}`}
                    onMouseEnter={() => setActive(flatIdx)}
                    onClick={() => onPick(r)}
                  >
                    <span className="rd-cmdk__label">{r.label}</span>
                    {r.hint && <span className="rd-cmdk__hint">{r.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="rd-cmdk__footer">
          <kbd>↑</kbd> <kbd>↓</kbd> 选 · <kbd>Enter</kbd> 确认 · <kbd>Esc</kbd> 关闭
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-cmdk__overlay) {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 90;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 18vh;
  animation: rd-fade 150ms ease;
}
:global(.rd-cmdk) {
  width: min(640px, 90vw);
  max-height: 60vh;
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
:global(.rd-cmdk__input) {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--rd-border);
  color: var(--rd-text-strong);
  padding: 14px 16px;
  font-size: 14px;
  font: inherit;
  outline: none;
}
:global(.rd-cmdk__results) {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
:global(.rd-cmdk__empty) { padding: 20px; color: var(--rd-text-dim); font-size: 12px; text-align: center; }
:global(.rd-cmdk__group-label) {
  padding: 6px 14px;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--rd-text-dim);
}
:global(.rd-cmdk__row) {
  display: flex;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px 14px;
  cursor: pointer;
  color: var(--rd-text);
  font: inherit;
  align-items: baseline;
  gap: 10px;
}
:global(.rd-cmdk__row--active) { background: rgba(122,162,247,0.12); }
:global(.rd-cmdk__label) { flex: 1; font-size: 12px; color: var(--rd-text-strong); }
:global(.rd-cmdk__hint) {
  font-size: 10px;
  color: var(--rd-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
:global(.rd-cmdk__footer) {
  border-top: 1px solid var(--rd-border);
  padding: 6px 14px;
  font-size: 10px;
  color: var(--rd-text-dim);
  display: flex;
  gap: 8px;
}
:global(.rd-cmdk__footer kbd) {
  background: var(--rd-bg);
  border: 1px solid var(--rd-border);
  border-radius: 3px;
  padding: 0 4px;
  font-family: var(--rd-font-mono);
  font-size: 10px;
  color: var(--rd-text);
}

@media (max-width: 767px) {
  :global(.rd-cmdk__overlay) { padding-top: 0; }
  :global(.rd-cmdk) {
    width: 100vw;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/cmdk/CommandPalette.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): CommandPalette UI (5-source search, keyboard nav, mobile sheet)"
```

---

### Task 5: 接入 ReaderShell + anchor jump 监听

**Files:** Modify `app/read/_reader/ReaderShell.tsx`

- [ ] **Step 1: 渲染 CommandPalette**

```tsx
import { CommandPalette } from './cmdk/CommandPalette';
// ... 在 Inner 返回 JSX 顶层加：
<CommandPalette currentArticleId={data?.id} />
```

- [ ] **Step 2: 监听 `reader:goto-anchor` 事件**

在 Inner 内追加：
```tsx
useEffect(() => {
  const onGoto = (e: Event) => {
    const detail = (e as CustomEvent<{ quote: string }>).detail;
    if (!detail || !contentRoot) return;
    const quote = detail.quote;
    if (!quote) return;
    // Find first paragraph that contains the quote substring
    const blocks = contentRoot.querySelectorAll<HTMLElement>('p, li, h1, h2, h3, h4, blockquote');
    for (const b of blocks) {
      if (b.textContent?.includes(quote.slice(0, Math.min(30, quote.length)))) {
        b.scrollIntoView({ behavior: 'smooth', block: 'center' });
        b.classList.add('rd-flash');
        setTimeout(() => b.classList.remove('rd-flash'), 1500);
        break;
      }
    }
  };
  document.addEventListener('reader:goto-anchor', onGoto);
  return () => document.removeEventListener('reader:goto-anchor', onGoto);
}, [contentRoot]);
```

- [ ] **Step 3: flash 动画 CSS**

```css
:global(.rd-flash) {
  animation: rd-flash 1.5s ease;
}
@keyframes rd-flash {
  0%   { background: rgba(122,162,247,0); }
  20%  { background: rgba(122,162,247,0.18); }
  100% { background: rgba(122,162,247,0); }
}
```

- [ ] **Step 4: 验证**

```bash
npm run build && npm run restart
```

桌面：
- `⌘K` → 命令面板浮起，列出常用命令 + 收藏 + 文章
- 输入"主题" → 看到「切换主题」命令；Enter 触发主题切换
- 输入笔记内容片段 → 看到笔记结果；Enter 跳转到对应文章 + 高亮闪烁
- `Esc` 关闭
- `↑/↓` 选；hover 也同步 active

手机：
- 顶 bar 命令图标 → 全屏 sheet
- 数字键盘弹出无遮挡（关键 input 在顶部）

- [ ] **Step 5: Commit**

```bash
git add app/read/_reader/ReaderShell.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): wire CommandPalette + anchor goto event handler"
```

---

### Task 6: 验收 phase-8

- [ ] **Step 1: 测试 + build**

```bash
npm test && npm run build
```

- [ ] **Step 2: tag**

```bash
git tag reader/phase-8-cmdk
```

---

## Phase-8 验收标准

- [ ] `⌘K` 触发面板，居中弹出
- [ ] 输入查询时按 5 类分组（命令/文章/收藏/笔记/想法）
- [ ] `↑/↓` 键盘导航，`Enter` 触发，`Esc` 关闭
- [ ] 选中文章 → 路由 push 到 `/read/<idChain>`
- [ ] 选中笔记/想法 → 路由 + 800ms 后滚动到 anchor + 1.5s 高亮闪烁
- [ ] 选中命令 → 立即执行（切主题/全屏/导出 zip 等都生效）
- [ ] 空查询展示常用命令 + 收藏 + 文章建议
- [ ] 手机端 ⌘K 变全屏 sheet
- [ ] 顶 bar `⌘K` 图标也能触发同样面板
