# Phase 7 · 我的书房（5 tab + 统计热力图）

**Goal:** 左抽屉"书房" tab 的 5 个子视图：★收藏 / 📝笔记 / 💭想法 / 📖历史 / ⏱统计。统计 tab 含 GitHub 风阅读热力图。

**Depends on:** Phase 1–6 完成。

**Architecture:** `LibraryView` 容器持有当前 tab。每个 tab 独立组件，按需 fetch。三端布局：桌面/iPad 横屏 3 列，iPad 竖屏 2 列，手机 1 列 + tab 横向滑。统计 tab 用 SVG 自绘热力图（避免新依赖）。

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 创建 | `app/read/_reader/library/LibraryView.tsx` | 容器 + tab 切换 |
| 创建 | `app/read/_reader/library/FavoritesTab.tsx` |  |
| 创建 | `app/read/_reader/library/NotesTab.tsx` |  |
| 创建 | `app/read/_reader/library/ThoughtsTab.tsx` |  |
| 创建 | `app/read/_reader/library/HistoryTab.tsx` |  |
| 创建 | `app/read/_reader/library/StatsTab.tsx` | 含 SVG 热力图 |
| 创建 | `app/read/_reader/library/Heatmap.tsx` | 365 天热力图 |
| 创建 | `app/read/_reader/hooks/useArticleIndex.ts` | id→ArticleNode 索引 |
| 创建 | `app/read/_reader/hooks/useReadingHeartbeat.ts` | 阅读时长心跳 |
| 修改 | `app/read/_reader/drawers/LeftDrawer.tsx` | "书房" tab 接入 LibraryView |
| 修改 | `app/read/_reader/ReaderShell.tsx` | 启用心跳 |

---

### Task 1: `useArticleIndex`

**Files:** Create `app/read/_reader/hooks/useArticleIndex.ts`

> 用单例缓存 `/api/articles/list`，避免每个 tab 重复 fetch。

- [ ] **Step 1: 实现**

```ts
'use client';

import { useEffect, useState } from 'react';
import type { ArticleNode } from '@/lib/reader/chapter-nav';

let cache: ArticleNode[] | null = null;
let cachePromise: Promise<ArticleNode[]> | null = null;

export function invalidateArticleIndex() {
  cache = null;
}

async function loadArticles(): Promise<ArticleNode[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = fetch('/api/articles/list')
    .then((r) => r.json())
    .then((j) => {
      cache = (j?.data || []) as ArticleNode[];
      return cache;
    })
    .finally(() => { cachePromise = null; });
  return cachePromise;
}

export function useArticleIndex(): {
  articles: ArticleNode[];
  byId: Map<string, ArticleNode>;
  loading: boolean;
} {
  const [articles, setArticles] = useState<ArticleNode[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    if (cache) {
      setArticles(cache);
      setLoading(false);
      return;
    }
    loadArticles().then((arr) => {
      setArticles(arr);
      setLoading(false);
    });
  }, []);
  const byId = new Map(articles.map((a) => [a.id, a]));
  return { articles, byId, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useArticleIndex.ts
git commit -m "feat(reader): useArticleIndex with module-level cache"
```

---

### Task 2: `LibraryView` 容器

**Files:** Create `app/read/_reader/library/LibraryView.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useState } from 'react';
import { Star, NotebookText, MessageCircle, BookOpenText, BarChart3, Download } from 'lucide-react';
import { FavoritesTab } from './FavoritesTab';
import { NotesTab } from './NotesTab';
import { ThoughtsTab } from './ThoughtsTab';
import { HistoryTab } from './HistoryTab';
import { StatsTab } from './StatsTab';

type LibTab = 'favorites' | 'notes' | 'thoughts' | 'history' | 'stats';

interface Props {
  onSelectArticle: (idChain: string) => void;
}

const TABS: { id: LibTab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'favorites', label: '收藏', Icon: Star },
  { id: 'notes',     label: '笔记', Icon: NotebookText },
  { id: 'thoughts',  label: '想法', Icon: MessageCircle },
  { id: 'history',   label: '历史', Icon: BookOpenText },
  { id: 'stats',     label: '统计', Icon: BarChart3 },
];

export function LibraryView({ onSelectArticle }: Props) {
  const [tab, setTab] = useState<LibTab>('favorites');

  const onExport = () => {
    window.open('/api/reader/export', '_blank');
  };

  return (
    <div className="rd-lib">
      <div className="rd-lib__tabs" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`rd-lib__tab ${tab === id ? 'rd-lib__tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={12} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="rd-lib__export" onClick={onExport} aria-label="导出 zip">
          <Download size={12} />
        </button>
      </div>
      <div className="rd-lib__body">
        {tab === 'favorites' && <FavoritesTab onSelect={onSelectArticle} />}
        {tab === 'notes'     && <NotesTab     onSelect={onSelectArticle} />}
        {tab === 'thoughts'  && <ThoughtsTab  onSelect={onSelectArticle} />}
        {tab === 'history'   && <HistoryTab   onSelect={onSelectArticle} />}
        {tab === 'stats'     && <StatsTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CSS（追加 reader.module.css）**

```css
:global(.rd-lib) { display: flex; flex-direction: column; height: 100%; }
:global(.rd-lib__tabs) {
  display: flex;
  gap: 2px;
  padding: 6px;
  border-bottom: 1px solid var(--rd-border);
  overflow-x: auto;
  flex-shrink: 0;
}
:global(.rd-lib__tab) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--rd-text-muted);
  font: inherit;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}
:global(.rd-lib__tab--active) {
  background: rgba(122,162,247,0.1);
  color: var(--rd-text-strong);
}
:global(.rd-lib__tab:hover:not(.rd-lib__tab--active)) { background: rgba(255,255,255,0.04); }
:global(.rd-lib__export) {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--rd-border);
  color: var(--rd-text-dim);
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
:global(.rd-lib__export:hover) { color: var(--rd-text); }
:global(.rd-lib__body) { flex: 1; overflow-y: auto; padding: 8px 0; }

@media (max-width: 767px) {
  :global(.rd-lib__tabs) {
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  :global(.rd-lib__tabs::-webkit-scrollbar) { display: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/library/LibraryView.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): LibraryView container with 5 tabs + export action"
```

---

### Task 3: `FavoritesTab`

**Files:** Create `app/read/_reader/library/FavoritesTab.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { listFavorites, listNotes, listMarks } from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { Favorite } from '@/lib/reader/types';

interface Props {
  onSelect: (idChain: string) => void;
}

export function FavoritesTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [counts, setCounts] = useState<Record<string, { notes: number; marks: number }>>({});

  useEffect(() => {
    Promise.all([listFavorites(), listNotes(), listMarks()]).then(([fs, ns, ms]) => {
      setFavs(fs.sort((a, b) => b.addedAt - a.addedAt));
      const c: Record<string, { notes: number; marks: number }> = {};
      ns.forEach((n) => {
        c[n.articleId] = c[n.articleId] || { notes: 0, marks: 0 };
        c[n.articleId].notes += 1;
      });
      ms.forEach((m) => {
        c[m.articleId] = c[m.articleId] || { notes: 0, marks: 0 };
        c[m.articleId].marks += 1;
      });
      setCounts(c);
    });
  }, []);

  if (favs.length === 0) {
    return <p className="rd-lib__empty">还没有收藏。点击文章顶部 ★ 收藏当前文章。</p>;
  }

  return (
    <ul className="rd-card-grid">
      {favs.map((f) => {
        const a = byId.get(f.articleId);
        if (!a) return null;
        const c = counts[f.articleId] || { notes: 0, marks: 0 };
        return (
          <li key={f.articleId}>
            <button type="button" className="rd-card" onClick={() => onSelect(a.idChain)}>
              <div className="rd-card__path">{a.parentPath || '根目录'}</div>
              <div className="rd-card__title">{a.title}</div>
              <div className="rd-card__meta">
                <span>★ {new Date(f.addedAt).toLocaleDateString()}</span>
                <span>{c.marks} 划线 · {c.notes} 笔记</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: 网格 CSS**

```css
:global(.rd-lib__empty) {
  padding: 24px 16px;
  color: var(--rd-text-dim);
  font-size: 12px;
  text-align: center;
}
:global(.rd-card-grid) {
  list-style: none;
  margin: 0;
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
:global(.rd-card) {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  border-radius: 6px;
  padding: 12px 14px;
  color: var(--rd-text);
  cursor: pointer;
  font: inherit;
}
:global(.rd-card:hover) { border-color: var(--rd-link); }
:global(.rd-card__path) {
  font-size: 9px;
  color: var(--rd-text-dim);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 4px;
}
:global(.rd-card__title) {
  font-size: 13px;
  color: var(--rd-text-strong);
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.4;
}
:global(.rd-card__meta) {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--rd-text-dim);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/library/FavoritesTab.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): FavoritesTab with notes/marks counts"
```

---

### Task 4: `NotesTab`

**Files:** Create `app/read/_reader/library/NotesTab.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { listNotes } from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { Note } from '@/lib/reader/types';

interface Props { onSelect: (idChain: string) => void }
type Group = 'time' | 'article';

export function NotesTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [notes, setNotes] = useState<Note[]>([]);
  const [group, setGroup] = useState<Group>('time');

  useEffect(() => {
    listNotes().then((arr) => setNotes(arr.sort((a, b) => b.updatedAt - a.updatedAt)));
  }, []);

  const grouped = useMemo(() => {
    if (group === 'time') return [{ key: '全部', items: notes }];
    const m = new Map<string, Note[]>();
    notes.forEach((n) => {
      const a = m.get(n.articleId) || [];
      a.push(n);
      m.set(n.articleId, a);
    });
    return Array.from(m.entries()).map(([k, items]) => ({ key: k, items }));
  }, [notes, group]);

  if (notes.length === 0) {
    return <p className="rd-lib__empty">还没有笔记。在文章中选中文字 → 点"笔记"。</p>;
  }

  return (
    <div>
      <div className="rd-lib__subtabs">
        <button type="button" className={group === 'time' ? 'active' : ''} onClick={() => setGroup('time')}>按时间</button>
        <button type="button" className={group === 'article' ? 'active' : ''} onClick={() => setGroup('article')}>按文章</button>
      </div>
      <ul className="rd-note-list">
        {grouped.map((g) => {
          const a = byId.get(g.key);
          return (
            <li key={g.key}>
              {group === 'article' && a && (
                <h4 className="rd-note-list__group">
                  <span>{a.parentPath}</span>{' / '}<span>{a.title}</span>
                </h4>
              )}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {g.items.map((n) => {
                  const article = byId.get(n.articleId);
                  return (
                    <li key={n.id}>
                      <button type="button" className="rd-note-row" onClick={() => article && onSelect(article.idChain)}>
                        <blockquote className="rd-note-row__quote">{n.anchor.quote}</blockquote>
                        <p className="rd-note-row__text">{n.text}</p>
                        <div className="rd-note-row__meta">
                          {article && <span>{article.title}</span>}
                          <span>{new Date(n.updatedAt).toLocaleString()}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-lib__subtabs) {
  display: flex;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--rd-border);
}
:global(.rd-lib__subtabs button) {
  background: transparent;
  border: 1px solid var(--rd-border);
  color: var(--rd-text-muted);
  font: inherit;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
}
:global(.rd-lib__subtabs button.active) {
  border-color: var(--rd-link);
  color: var(--rd-text-strong);
}
:global(.rd-note-list) {
  list-style: none;
  margin: 0;
  padding: 0;
}
:global(.rd-note-list__group) {
  font-size: 10px;
  color: var(--rd-text-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 8px 14px 4px;
  margin: 0;
  font-weight: normal;
}
:global(.rd-note-row) {
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
:global(.rd-note-row:hover) { background: rgba(255,255,255,0.04); }
:global(.rd-note-row__quote) {
  border-left: 2px solid var(--rd-accent);
  padding: 2px 8px;
  margin: 0 0 6px;
  color: var(--rd-text-muted);
  font-style: italic;
  font-size: 11px;
  line-height: 1.5;
}
:global(.rd-note-row__text) {
  font-size: 12px;
  color: var(--rd-text-strong);
  margin: 0 0 4px;
  line-height: 1.5;
}
:global(.rd-note-row__meta) {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--rd-text-dim);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/library/NotesTab.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): NotesTab grouped by time or article"
```

---

### Task 5: `ThoughtsTab` (镜像 NotesTab，颜色换蓝)

**Files:** Create `app/read/_reader/library/ThoughtsTab.tsx`

- [ ] **Step 1: 复制 NotesTab 改 thoughts**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { listThoughts } from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { Thought } from '@/lib/reader/types';

interface Props { onSelect: (idChain: string) => void }

export function ThoughtsTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [items, setItems] = useState<Thought[]>([]);

  useEffect(() => {
    listThoughts().then((arr) => setItems(arr.sort((a, b) => b.updatedAt - a.updatedAt)));
  }, []);

  if (items.length === 0) {
    return <p className="rd-lib__empty">还没有想法。在文章中选中文字 → 点"想法"。</p>;
  }

  return (
    <ul className="rd-thought-list">
      {items.map((t) => {
        const a = byId.get(t.articleId);
        return (
          <li key={t.id}>
            <button type="button" className="rd-thought-row" onClick={() => a && onSelect(a.idChain)}>
              <blockquote className="rd-thought-row__quote">{t.anchor.quote}</blockquote>
              <p className="rd-thought-row__text">💭 {t.text}</p>
              <div className="rd-thought-row__meta">
                {a && <span>{a.title}</span>}
                <span>{new Date(t.updatedAt).toLocaleString()}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: 复用样式 + 蓝色变体**

```css
:global(.rd-thought-list) { list-style: none; margin: 0; padding: 0; }
:global(.rd-thought-row) {
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
:global(.rd-thought-row:hover) { background: rgba(255,255,255,0.04); }
:global(.rd-thought-row__quote) {
  border-left: 2px solid var(--rd-link);
  padding: 2px 8px;
  margin: 0 0 6px;
  color: var(--rd-text-muted);
  font-style: italic;
  font-size: 11px;
  line-height: 1.5;
}
:global(.rd-thought-row__text) {
  font-size: 12px;
  color: var(--rd-text-strong);
  margin: 0 0 4px;
  line-height: 1.5;
}
:global(.rd-thought-row__meta) {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--rd-text-dim);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/library/ThoughtsTab.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): ThoughtsTab (timeline view, blue accent)"
```

---

### Task 6: `HistoryTab`

**Files:** Create `app/read/_reader/library/HistoryTab.tsx`

- [ ] **Step 1: 实现（按日期分组）**

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { listHistory } from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { HistoryEntry } from '@/lib/reader/types';

interface Props { onSelect: (idChain: string) => void }

function dateKey(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isSameDay = d.toDateString() === today.toDateString();
  if (isSameDay) return '今天';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return '昨天';
  return d.toISOString().slice(0, 10);
}

export function HistoryTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    listHistory().then(setEntries);
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, HistoryEntry[]>();
    for (const e of entries) {
      const k = dateKey(e.lastReadAt);
      const arr = m.get(k) || [];
      arr.push(e);
      m.set(k, arr);
    }
    return Array.from(m.entries());
  }, [entries]);

  if (entries.length === 0) {
    return <p className="rd-lib__empty">还没有阅读历史。</p>;
  }

  return (
    <div className="rd-history">
      {groups.map(([day, items]) => (
        <section key={day}>
          <h4 className="rd-history__day">{day}</h4>
          <ul>
            {items.map((e) => {
              const a = byId.get(e.articleId);
              if (!a) return null;
              const pct = Math.round(e.lastReadProgress * 100);
              const done = !!e.completedAt;
              return (
                <li key={e.articleId}>
                  <button type="button" className="rd-history__row" onClick={() => onSelect(a.idChain)}>
                    <span className="rd-history__title">{a.title}</span>
                    <span className={`rd-history__pct ${done ? 'rd-history__pct--done' : ''}`}>
                      {done ? '✓ 已读完' : `${pct}%`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-history) { padding: 0; }
:global(.rd-history section) { margin-bottom: 14px; }
:global(.rd-history__day) {
  font-size: 10px;
  color: var(--rd-text-dim);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 8px 14px 4px;
  margin: 0;
  font-weight: normal;
  border-bottom: 1px dashed var(--rd-border);
}
:global(.rd-history ul) { list-style: none; margin: 0; padding: 0; }
:global(.rd-history__row) {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  padding: 8px 14px;
  cursor: pointer;
  font: inherit;
  color: var(--rd-text);
}
:global(.rd-history__row:hover) { background: rgba(255,255,255,0.04); }
:global(.rd-history__title) { font-size: 12px; }
:global(.rd-history__pct) { font-size: 10px; color: var(--rd-text-dim); }
:global(.rd-history__pct--done) { color: #a3e635; }
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/library/HistoryTab.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): HistoryTab grouped by day with progress badge"
```

---

### Task 7: `Heatmap` SVG 组件

**Files:** Create `app/read/_reader/library/Heatmap.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

interface Props {
  dailyMinutes: Record<string, number>;
}

const CELL = 11;
const GAP = 2;
const WEEKS = 53;

function dateMinusDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() - days);
  return r;
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function color(mins: number): string {
  if (mins <= 0) return '#1c1c1e';
  if (mins < 5) return '#2a2f4a';
  if (mins < 15) return '#3b4a7a';
  if (mins < 30) return '#5470b8';
  if (mins < 60) return '#7aa2f7';
  return '#aac1ff';
}

export function Heatmap({ dailyMinutes }: Props) {
  const today = new Date();
  // Align to last Saturday so each column is one full week ending Saturday
  const lastDay = new Date(today);
  // Build 53 weeks × 7 days from oldest to newest
  const days: { date: Date; key: string; mins: number }[] = [];
  const totalDays = WEEKS * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = dateMinusDays(lastDay, i);
    const key = ymd(d);
    days.push({ date: d, key, mins: dailyMinutes[key] || 0 });
  }
  const width = WEEKS * (CELL + GAP);
  const height = 7 * (CELL + GAP);
  const totalMins = days.reduce((acc, d) => acc + d.mins, 0);
  const activeDays = days.filter((d) => d.mins > 0).length;
  const streak = (() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].mins > 0) s++;
      else break;
    }
    return s;
  })();

  return (
    <div className="rd-heatmap">
      <div className="rd-heatmap__summary">
        <div><b>{Math.round(totalMins)}</b> 分钟 · 365 天</div>
        <div><b>{activeDays}</b> 个活跃日</div>
        <div><b>{streak}</b> 天连续</div>
      </div>
      <svg width={width} height={height} className="rd-heatmap__svg">
        {days.map((d, i) => {
          const week = Math.floor(i / 7);
          const day = i % 7;
          return (
            <rect
              key={d.key}
              x={week * (CELL + GAP)}
              y={day * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={color(d.mins)}
            >
              <title>{`${d.key} · ${Math.round(d.mins)} 分钟`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="rd-heatmap__legend">
        少 <span style={{ background: '#1c1c1e' }} /> <span style={{ background: '#2a2f4a' }} /> <span style={{ background: '#3b4a7a' }} /> <span style={{ background: '#5470b8' }} /> <span style={{ background: '#7aa2f7' }} /> <span style={{ background: '#aac1ff' }} /> 多
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-heatmap) { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
:global(.rd-heatmap__summary) {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--rd-text-muted);
}
:global(.rd-heatmap__summary b) { color: var(--rd-text-strong); font-weight: 600; }
:global(.rd-heatmap__svg) { display: block; max-width: 100%; height: auto; overflow: visible; }
:global(.rd-heatmap__legend) {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 9px;
  color: var(--rd-text-dim);
}
:global(.rd-heatmap__legend span) {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/library/Heatmap.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): Heatmap SVG (53w × 7d, 6 buckets, summary)"
```

---

### Task 8: `StatsTab`

**Files:** Create `app/read/_reader/library/StatsTab.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getStats } from '@/lib/reader/storage-client';
import type { Stats } from '@/lib/reader/types';
import { Heatmap } from './Heatmap';

export function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) {
    return <p className="rd-lib__empty">加载中…</p>;
  }

  const totalArticles = Object.keys(stats.articleStats).length;
  const totalReads = Object.values(stats.articleStats).reduce((s, x) => s + x.reads, 0);
  const totalMs = Object.values(stats.articleStats).reduce((s, x) => s + x.totalMs, 0);
  const avgMinPerDay =
    Object.values(stats.dailyMinutes).reduce((s, m) => s + m, 0) /
    Math.max(1, Object.keys(stats.dailyMinutes).length);

  return (
    <div>
      <Heatmap dailyMinutes={stats.dailyMinutes} />
      <ul className="rd-stats-list">
        <li>
          <span>读过文章</span>
          <b>{totalArticles}</b>
        </li>
        <li>
          <span>总阅读次</span>
          <b>{totalReads}</b>
        </li>
        <li>
          <span>总阅读时长</span>
          <b>{(totalMs / 60000).toFixed(1)} 分</b>
        </li>
        <li>
          <span>平均每日</span>
          <b>{avgMinPerDay.toFixed(1)} 分</b>
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-stats-list) {
  list-style: none;
  margin: 0;
  padding: 0;
}
:global(.rd-stats-list li) {
  display: flex;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid var(--rd-border);
  font-size: 12px;
  color: var(--rd-text);
}
:global(.rd-stats-list b) { color: var(--rd-text-strong); font-weight: 600; }
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/library/StatsTab.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): StatsTab heatmap + totals"
```

---

### Task 9: `useReadingHeartbeat` hook

**Files:** Create `app/read/_reader/hooks/useReadingHeartbeat.ts`

- [ ] **Step 1: 实现**

```ts
'use client';

import { useEffect, useRef } from 'react';
import { sendHeartbeat } from '@/lib/reader/storage-client';

const TICK_MS = 30_000;
const ACTIVITY_WINDOW_MS = 30_000;

export function useReadingHeartbeat(articleId: string | null) {
  const lastActiveRef = useRef(Date.now());

  useEffect(() => {
    const bump = () => { lastActiveRef.current = Date.now(); };
    window.addEventListener('scroll', bump, { passive: true });
    window.addEventListener('mousemove', bump);
    window.addEventListener('keydown', bump);
    window.addEventListener('touchstart', bump, { passive: true });
    return () => {
      window.removeEventListener('scroll', bump);
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('touchstart', bump);
    };
  }, []);

  useEffect(() => {
    if (!articleId) return;
    const handle = window.setInterval(() => {
      const visible = document.visibilityState === 'visible';
      const active = Date.now() - lastActiveRef.current < ACTIVITY_WINDOW_MS;
      if (visible && active) {
        void sendHeartbeat(articleId, TICK_MS);
      }
    }, TICK_MS);
    return () => window.clearInterval(handle);
  }, [articleId]);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useReadingHeartbeat.ts
git commit -m "feat(reader): useReadingHeartbeat (30s ticks gated by visibility + activity)"
```

---

### Task 10: 接入 LeftDrawer 和 ReaderShell

**Files:** Modify `app/read/_reader/drawers/LeftDrawer.tsx`, `app/read/_reader/ReaderShell.tsx`

- [ ] **Step 1: 在 LeftDrawer 用真 LibraryView 替换占位**

```tsx
// 顶部 import
import { LibraryView } from '../library/LibraryView';

// 之前的占位段：
// {ui.leftTab === 'library' && (
//   <p>书房功能将在 phase 7 实装。</p>
// )}

// 改为：
{ui.leftTab === 'library' && (
  <LibraryView
    onSelectArticle={(idChain) => {
      onSelect(idChain);
      ui.closeLeft();
    }}
  />
)}
```

- [ ] **Step 2: 在 ReaderShell 启用心跳**

```tsx
import { useReadingHeartbeat } from './hooks/useReadingHeartbeat';
// ...
useReadingHeartbeat(data?.id ?? null);
```

- [ ] **Step 3: 验证**

```bash
npm run build && npm run restart
```

- 阅读一篇文章 30s+ → 切到「书房 → 统计」 → 看到今天的格子变蓝 + dailyMinutes 累加
- 「书房 → 收藏 / 笔记 / 想法 / 历史」各 tab 显示前面 phase 创建的数据
- 顶部「↓」点击 → 下载 zip 含 6 文件
- 手机模拟下 tab 横向可滑动

- [ ] **Step 4: Commit**

```bash
git add app/read/_reader/drawers/LeftDrawer.tsx app/read/_reader/ReaderShell.tsx
git commit -m "feat(reader): LibraryView wired into left drawer + heartbeat enabled"
```

---

### Task 11: 验收 phase-7

- [ ] **Step 1: 测试 + build**

```bash
npm test && npm run build
```

- [ ] **Step 2: tag**

```bash
git tag reader/phase-7-library
```

---

## Phase-7 验收标准

- [ ] 左抽屉「书房」tab 打开后有 5 个 tab 横排（含 ☆📝💭📖⏱）
- [ ] 收藏 tab 显示文章卡片（路径 + 标题 + 收藏日期 + 笔记/划线数）
- [ ] 笔记 tab 支持「按时间 / 按文章」切换
- [ ] 想法 tab 时间线，蓝色色条
- [ ] 历史 tab 按"今天/昨天/日期"分组 + 进度
- [ ] 统计 tab 显示 53×7 SVG 热力图（最近 365 天）+ 6 档颜色 + 总分钟/活跃日/连续天
- [ ] 心跳：visible + active 时每 30s 写入 `stats.json`，今天的格子颜色加深
- [ ] 顶部 ↓ 导出整包 zip
- [ ] 手机端 tab 横向滚动无割裂
- [ ] 三端布局都能正常显示（手机 1 列 / iPad 竖 2 列 / 桌面 3 列：注意当前 grid-template-columns:1fr 仅 1 列，应根据屏宽改）

> **桌面/平板 grid 增强：** 把 `.rd-card-grid` 中的 `grid-template-columns: 1fr` 改为：
> ```css
> @media (min-width: 768px) { :global(.rd-card-grid) { grid-template-columns: 1fr 1fr; } }
> @media (min-width: 1280px) { :global(.rd-card-grid) { grid-template-columns: 1fr 1fr 1fr; } }
> ```
> （书房在抽屉里宽度最多 320px，所以实际多列只有桌面"宽屏 + 全屏书房"才用得到——若书房做成 phase-9 的全屏页则更适合多列。当前抽屉版默认 1 列即可。）
