# Phase 6 · 划线 / 笔记 / 想法 前端

**Goal:** 选区→工具气泡→4 色划线→保存→渲染高亮叠加层→点击划线编辑/改色/删除；笔记/想法行间嵌入卡（金条 / 蓝条）+ 抗漂移锚点。

**Depends on:** Phase 1–5 完成。

**Architecture:** `anchor.ts` 纯函数处理 markdown source-pos ↔ DOM Range 双向映射；`useSelection` 接管 selectionchange + 长按；`SelectionToolbar` 显示按钮组；`HighlightOverlay` 把已划线段重新染色（用 CSS 包装 spans，不改原 markdown）；`InlineNoteCard` 在划线 anchor 后插入 React portal 卡。

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 安装 | `fuse.js@^7` | 锚点 fuzzy 搜索 |
| 创建 | `lib/reader/anchor.ts` | 锚点解析 + 抗漂移（纯函数） |
| 创建 | `lib/reader/__tests__/anchor.test.ts` | 单测 |
| 创建 | `app/read/_reader/hooks/useSelection.ts` | 选区接管（桌面/触屏） |
| 创建 | `app/read/_reader/hooks/useAnnotations.ts` | 加载 marks/notes/thoughts，CRUD wrapper |
| 创建 | `app/read/_reader/hooks/useFavorite.ts` | 当前文章收藏状态 |
| 创建 | `app/read/_reader/annotation/SelectionToolbar.tsx` | 选区工具气泡 |
| 创建 | `app/read/_reader/annotation/ColorPalette.tsx` | 4 色面板（长按展开） |
| 创建 | `app/read/_reader/annotation/HighlightOverlay.tsx` | 渲染所有划线 |
| 创建 | `app/read/_reader/annotation/InlineNoteCard.tsx` | 行间笔记/想法卡 |
| 创建 | `app/read/_reader/annotation/MarkPopover.tsx` | 已划线被点时弹出 |
| 创建 | `app/read/_reader/annotation/NoteComposer.tsx` | 输入笔记/想法的小弹窗 |
| 修改 | `app/read/_reader/ReaderShell.tsx` | 接入注释层 |
| 修改 | `app/read/_reader/ReaderContent.tsx` | 暴露 contentRoot ref |

---

### Task 1: 安装 fuse.js

- [ ] **Step 1: install**

```bash
npm i fuse.js@^7
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(reader): add fuse.js for anchor fuzzy fallback"
```

---

### Task 2: `lib/reader/anchor.ts` (TDD)

**Files:**
- Create: `lib/reader/anchor.ts`
- Test: `lib/reader/__tests__/anchor.test.ts`

#### 接口契约

```ts
export interface Anchor {
  startOffset: number;
  endOffset: number;
  quote: string;     // 选区 + 前后各 PADDING 字
}

export const PADDING = 15;

export function makeAnchor(source: string, start: number, end: number): Anchor;

export interface ResolvedAnchor {
  startOffset: number;
  endOffset: number;
  drifted: boolean;  // true if fallback was needed
}

/** 在 source 中尝试定位 anchor。先精确，再 fuzzy。失败返回 null。*/
export function resolveAnchor(source: string, anchor: Anchor): ResolvedAnchor | null;
```

- [ ] **Step 1: 测试**

```ts
import { describe, it, expect } from 'vitest';
import { makeAnchor, resolveAnchor, PADDING } from '../anchor';

describe('anchor', () => {
  it('makeAnchor builds quote with padding', () => {
    const src = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    const start = 12;             // "dolor"
    const end = 17;
    const a = makeAnchor(src, start, end);
    expect(a.startOffset).toBe(12);
    expect(a.endOffset).toBe(17);
    expect(a.quote).toContain('dolor');
    expect(a.quote.length).toBeLessThanOrEqual(5 + 2 * PADDING);
  });

  it('resolveAnchor exact match preserves offsets', () => {
    const src = 'A'.repeat(100) + 'TARGET' + 'B'.repeat(100);
    const start = 100, end = 106;
    const a = makeAnchor(src, start, end);
    const r = resolveAnchor(src, a)!;
    expect(r.startOffset).toBe(100);
    expect(r.endOffset).toBe(106);
    expect(r.drifted).toBe(false);
  });

  it('resolveAnchor handles small drift (insertion before anchor)', () => {
    const src = 'A'.repeat(100) + 'TARGET' + 'B'.repeat(100);
    const a = makeAnchor(src, 100, 106);
    const drifted = 'XX' + src;  // anchor moves +2
    const r = resolveAnchor(drifted, a)!;
    expect(r.startOffset).toBe(102);
    expect(r.endOffset).toBe(108);
    expect(r.drifted).toBe(true);
  });

  it('resolveAnchor returns null when text completely changed', () => {
    const a = makeAnchor('hello world target world', 13, 19);
    expect(resolveAnchor('something completely different', a)).toBeNull();
  });

  it('resolveAnchor uses fuzzy fallback for minor edits inside quote', () => {
    const original = 'A'.repeat(50) + 'protocol handler runs' + 'B'.repeat(50);
    const a = makeAnchor(original, 50, 50 + 'protocol handler runs'.length);
    // Edit: handler -> hAndler (single char change)
    const drifted = 'A'.repeat(50) + 'protocol hAndler runs' + 'B'.repeat(50);
    const r = resolveAnchor(drifted, a)!;
    expect(r.drifted).toBe(true);
    // The found range should still cover ~the same area
    expect(r.startOffset).toBeGreaterThanOrEqual(45);
    expect(r.startOffset).toBeLessThanOrEqual(55);
  });

  it('CJK selection round-trips', () => {
    const src = '前面前面前面' + '协调器处理虚拟 DOM 差异' + '后面后面后面';
    const start = 6;
    const end = start + '协调器处理虚拟 DOM 差异'.length;
    const a = makeAnchor(src, start, end);
    const r = resolveAnchor(src, a)!;
    expect(r.startOffset).toBe(start);
    expect(r.endOffset).toBe(end);
  });
});
```

- [ ] **Step 2: 跑确认 fail**

```bash
npm test -- anchor
```

- [ ] **Step 3: 实现**

```ts
import Fuse from 'fuse.js';

export const PADDING = 15;

export interface Anchor {
  startOffset: number;
  endOffset: number;
  quote: string;
}

export interface ResolvedAnchor {
  startOffset: number;
  endOffset: number;
  drifted: boolean;
}

export function makeAnchor(source: string, start: number, end: number): Anchor {
  const lo = Math.max(0, start - PADDING);
  const hi = Math.min(source.length, end + PADDING);
  return {
    startOffset: start,
    endOffset: end,
    quote: source.slice(lo, hi),
  };
}

function selectedText(quote: string, prefix: number, selLen: number): string {
  // selection text = chars [prefix .. prefix+selLen]
  return quote.slice(prefix, prefix + selLen);
}

export function resolveAnchor(source: string, anchor: Anchor): ResolvedAnchor | null {
  const selLen = anchor.endOffset - anchor.startOffset;
  if (selLen <= 0) return null;
  const quote = anchor.quote;

  const prefix = Math.min(PADDING, anchor.startOffset);

  // 1) Exact at original offset
  if (
    anchor.endOffset <= source.length &&
    source.slice(anchor.startOffset, anchor.endOffset) ===
      selectedText(quote, prefix, selLen)
  ) {
    return {
      startOffset: anchor.startOffset,
      endOffset: anchor.endOffset,
      drifted: false,
    };
  }

  // 2) Exact substring of full quote anywhere
  const idx = source.indexOf(quote);
  if (idx >= 0) {
    return {
      startOffset: idx + prefix,
      endOffset: idx + prefix + selLen,
      drifted: true,
    };
  }

  // 3) Selected text alone, anywhere
  const sel = selectedText(quote, prefix, selLen);
  const idx2 = source.indexOf(sel);
  if (idx2 >= 0) {
    return {
      startOffset: idx2,
      endOffset: idx2 + sel.length,
      drifted: true,
    };
  }

  // 4) Fuzzy on sliding windows of source (stride PADDING)
  const stride = Math.max(8, PADDING);
  const windowSize = quote.length;
  const windows: { text: string; pos: number }[] = [];
  for (let i = 0; i + windowSize <= source.length; i += stride) {
    windows.push({ text: source.slice(i, i + windowSize), pos: i });
  }
  if (windows.length === 0) return null;
  const fuse = new Fuse(windows, {
    keys: ['text'],
    includeScore: true,
    threshold: 0.4,
  });
  const r = fuse.search(quote);
  if (r.length === 0) return null;
  const best = r[0];
  if ((best.score ?? 1) > 0.45) return null;
  const pos = best.item.pos;
  return {
    startOffset: pos + prefix,
    endOffset: pos + prefix + selLen,
    drifted: true,
  };
}
```

- [ ] **Step 4: 测试 pass**

```bash
npm test -- anchor
```
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/reader/anchor.ts lib/reader/__tests__/anchor.test.ts
git commit -m "feat(reader): anchor with exact-then-fuzzy fallback (TDD, 6 tests)"
```

---

### Task 3: `useAnnotations` hook

**Files:** Create `app/read/_reader/hooks/useAnnotations.ts`

- [ ] **Step 1: 实现**

```ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  listMarks, createMark, updateMark, deleteMark,
  listNotes, createNote, updateNote, deleteNote,
  listThoughts, createThought, updateThought, deleteThought,
} from '@/lib/reader/storage-client';
import type { Mark, Note, Thought, Anchor } from '@/lib/reader/types';
import type { MarkColor } from '@/lib/reader/prefs';

export interface UseAnnotationsResult {
  marks: Mark[];
  notes: Note[];
  thoughts: Thought[];
  loading: boolean;
  reload: () => void;
  addMark: (anchor: Anchor, color: MarkColor) => Promise<Mark>;
  changeMarkColor: (id: string, color: MarkColor) => Promise<void>;
  removeMark: (id: string) => Promise<void>;
  addNote: (anchor: Anchor, text: string) => Promise<Note>;
  editNote: (id: string, text: string) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  addThought: (anchor: Anchor, text: string) => Promise<Thought>;
  editThought: (id: string, text: string) => Promise<void>;
  removeThought: (id: string) => Promise<void>;
}

export function useAnnotations(articleId: string | null): UseAnnotationsResult {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!articleId) {
      setMarks([]); setNotes([]); setThoughts([]); return;
    }
    setLoading(true);
    Promise.all([
      listMarks(articleId),
      listNotes(articleId),
      listThoughts(articleId),
    ])
      .then(([m, n, t]) => { setMarks(m); setNotes(n); setThoughts(t); })
      .finally(() => setLoading(false));
  }, [articleId]);

  useEffect(reload, [reload]);

  const addMark = useCallback(async (anchor: Anchor, color: MarkColor) => {
    if (!articleId) throw new Error('no article');
    const m = await createMark({ articleId, anchor, color });
    setMarks((arr) => [...arr, m]);
    return m;
  }, [articleId]);

  const changeMarkColor = useCallback(async (id: string, color: MarkColor) => {
    const m = await updateMark(id, { color });
    setMarks((arr) => arr.map((x) => (x.id === id ? m : x)));
  }, []);

  const removeMark = useCallback(async (id: string) => {
    await deleteMark(id);
    setMarks((arr) => arr.filter((x) => x.id !== id));
  }, []);

  const addNote = useCallback(async (anchor: Anchor, text: string) => {
    if (!articleId) throw new Error('no article');
    const n = await createNote({ articleId, anchor, text });
    setNotes((arr) => [...arr, n]);
    return n;
  }, [articleId]);

  const editNote = useCallback(async (id: string, text: string) => {
    const n = await updateNote(id, text);
    setNotes((arr) => arr.map((x) => (x.id === id ? n : x)));
  }, []);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    setNotes((arr) => arr.filter((x) => x.id !== id));
  }, []);

  const addThought = useCallback(async (anchor: Anchor, text: string) => {
    if (!articleId) throw new Error('no article');
    const t = await createThought({ articleId, anchor, text });
    setThoughts((arr) => [...arr, t]);
    return t;
  }, [articleId]);

  const editThought = useCallback(async (id: string, text: string) => {
    const t = await updateThought(id, text);
    setThoughts((arr) => arr.map((x) => (x.id === id ? t : x)));
  }, []);

  const removeThought = useCallback(async (id: string) => {
    await deleteThought(id);
    setThoughts((arr) => arr.filter((x) => x.id !== id));
  }, []);

  return {
    marks, notes, thoughts, loading, reload,
    addMark, changeMarkColor, removeMark,
    addNote, editNote, removeNote,
    addThought, editThought, removeThought,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useAnnotations.ts
git commit -m "feat(reader): useAnnotations CRUD hook for marks/notes/thoughts"
```

---

### Task 4: `useFavorite` hook + ⌘B 集成

**Files:** Create `app/read/_reader/hooks/useFavorite.ts`

- [ ] **Step 1: 实现**

```ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from '@/lib/reader/storage-client';

export function useFavorite(articleId: string | null): {
  isFavorite: boolean;
  toggle: () => Promise<void>;
} {
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => {
    if (!articleId) { setIsFavorite(false); return; }
    listFavorites().then((favs) => {
      setIsFavorite(favs.some((f) => f.articleId === articleId));
    });
  }, [articleId]);

  const toggle = useCallback(async () => {
    if (!articleId) return;
    if (isFavorite) {
      await removeFavorite(articleId);
      setIsFavorite(false);
    } else {
      await addFavorite(articleId);
      setIsFavorite(true);
    }
  }, [articleId, isFavorite]);

  // Listen for ⌘B custom event from useReaderHotkeys
  useEffect(() => {
    const onToggle = () => void toggle();
    document.addEventListener('reader:toggle-favorite', onToggle);
    return () => document.removeEventListener('reader:toggle-favorite', onToggle);
  }, [toggle]);

  return { isFavorite, toggle };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useFavorite.ts
git commit -m "feat(reader): useFavorite + cmd+B event listener"
```

---

### Task 5: `useSelection` 选区接管

**Files:** Create `app/read/_reader/hooks/useSelection.ts`

- [ ] **Step 1: 实现**

```ts
'use client';

import { useEffect, useState, useCallback } from 'react';

export interface SelectionInfo {
  text: string;
  startOffset: number;     // 在 markdown source 里的字符 offset
  endOffset: number;
  rect: DOMRect;           // 选区可见区的位置（fixed）
}

interface Options {
  contentRoot: HTMLElement | null;
  source: string;          // 原 markdown
  enabled: boolean;
}

/** 把 DOM Range 映射回 markdown 源 offset：使用 data-sourcepos 行号 + 行内字节偏移。*/
function rangeToSourceOffset(
  range: Range,
  root: HTMLElement,
  source: string,
): { start: number; end: number } | null {
  const findEl = (n: Node | null): HTMLElement | null => {
    let e: Node | null = n;
    while (e && e !== root) {
      if (e instanceof HTMLElement && e.dataset.sourcepos) return e;
      e = e.parentNode;
    }
    return null;
  };
  const a = findEl(range.startContainer);
  const b = findEl(range.endContainer);
  if (!a || !b) return null;
  const parse = (sp: string) => {
    const m = sp.match(/^(\d+):\d+-(\d+):\d+$/);
    if (!m) return null;
    return { startLine: parseInt(m[1], 10), endLine: parseInt(m[2], 10) };
  };
  const aPos = parse(a.dataset.sourcepos!);
  const bPos = parse(b.dataset.sourcepos!);
  if (!aPos || !bPos) return null;
  const startLine = Math.min(aPos.startLine, bPos.startLine);
  const endLine = Math.max(aPos.endLine, bPos.endLine);
  if (startLine < 1 || endLine < startLine) return null;

  const lines = source.split('\n');
  if (endLine > lines.length) return null;

  // crude: take all lines [startLine..endLine] and find selected text within
  const blockText = lines.slice(startLine - 1, endLine).join('\n');
  const selText = range.toString();
  const idxInBlock = blockText.indexOf(selText);
  if (idxInBlock < 0) return null;

  // start char offset in source = sum lengths of lines before startLine + 1 (\n) per line
  let baseOffset = 0;
  for (let i = 0; i < startLine - 1; i++) baseOffset += lines[i].length + 1;
  return {
    start: baseOffset + idxInBlock,
    end: baseOffset + idxInBlock + selText.length,
  };
}

export function useSelection({ contentRoot, source, enabled }: Options) {
  const [info, setInfo] = useState<SelectionInfo | null>(null);

  const compute = useCallback(() => {
    if (!enabled || !contentRoot) {
      setInfo(null);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setInfo(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!contentRoot.contains(range.commonAncestorContainer)) {
      setInfo(null);
      return;
    }
    const offsets = rangeToSourceOffset(range, contentRoot, source);
    if (!offsets) {
      setInfo(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) {
      setInfo(null);
      return;
    }
    setInfo({
      text: sel.toString(),
      startOffset: offsets.start,
      endOffset: offsets.end,
      rect,
    });
  }, [enabled, contentRoot, source]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      document.removeEventListener('selectionchange', onChange);
      cancelAnimationFrame(raf);
    };
  }, [enabled, compute]);

  const clear = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setInfo(null);
  }, []);

  return { info, clear };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useSelection.ts
git commit -m "feat(reader): useSelection (DOM Range → markdown offsets via data-sourcepos)"
```

---

### Task 6: `SelectionToolbar` + `ColorPalette` + `NoteComposer`

**Files:**
- Create: `app/read/_reader/annotation/ColorPalette.tsx`
- Create: `app/read/_reader/annotation/SelectionToolbar.tsx`
- Create: `app/read/_reader/annotation/NoteComposer.tsx`

- [ ] **Step 1: ColorPalette**

```tsx
'use client';

import type { MarkColor } from '@/lib/reader/prefs';

const COLORS: { id: MarkColor; var: string; label: string }[] = [
  { id: 'yellow', var: 'var(--rd-mark-yellow)', label: '重点' },
  { id: 'red',    var: 'var(--rd-mark-red)',    label: '疑问' },
  { id: 'green',  var: 'var(--rd-mark-green)',  label: '同意' },
  { id: 'blue',   var: 'var(--rd-mark-blue)',   label: '待复习' },
];

export function ColorPalette({ onPick }: { onPick: (c: MarkColor) => void }) {
  return (
    <div className="rd-palette" role="toolbar" aria-label="选择划线颜色">
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          className="rd-palette__dot"
          style={{ background: c.var }}
          aria-label={c.label}
          title={c.label}
          onClick={() => onPick(c.id)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: SelectionToolbar**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import { ColorPalette } from './ColorPalette';
import type { MarkColor } from '@/lib/reader/prefs';

interface Props {
  rect: DOMRect | null;
  onMark: (color: MarkColor) => void;
  onNote: () => void;
  onThought: () => void;
  onCopy: () => void;
  onShare: () => void;
}

export function SelectionToolbar({ rect, onMark, onNote, onThought, onCopy, onShare }: Props) {
  const { prefs, patch } = useReaderPrefs();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isPhone = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => setPaletteOpen(false), [rect]);

  if (!rect) return null;

  const left = isPhone ? '50%' : `${rect.left + rect.width / 2}px`;
  const top = isPhone ? 'auto' : `${rect.top - 8}px`;
  const bottom = isPhone ? '20px' : 'auto';
  const transform = isPhone ? 'translateX(-50%)' : 'translate(-50%, -100%)';

  const onMarkClick = () => {
    onMark(prefs.lastMarkColor);
  };
  const onPickColor = (c: MarkColor) => {
    patch({ lastMarkColor: c });
    onMark(c);
    setPaletteOpen(false);
  };

  // long-press to expand palette
  const pressTimer = useRef<number | null>(null);
  const onMarkPointerDown = () => {
    pressTimer.current = window.setTimeout(() => setPaletteOpen(true), 350);
  };
  const onMarkPointerUp = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div
      ref={ref}
      className="rd-seltoolbar"
      style={{ left, top, bottom, transform }}
      role="toolbar"
      aria-label="选区操作"
      data-rd-no-toggle="true"
    >
      {paletteOpen ? (
        <ColorPalette onPick={onPickColor} />
      ) : (
        <>
          <button
            type="button"
            className="rd-seltoolbar__btn rd-seltoolbar__btn--mark"
            style={{ background: `var(--rd-mark-${prefs.lastMarkColor})`, color: '#000' }}
            onClick={onMarkClick}
            onPointerDown={onMarkPointerDown}
            onPointerUp={onMarkPointerUp}
            onPointerLeave={onMarkPointerUp}
            onContextMenu={(e) => { e.preventDefault(); setPaletteOpen(true); }}
            aria-label="划线（长按选色）"
          >
            划线
          </button>
          <button type="button" className="rd-seltoolbar__btn" onClick={onNote}>笔记</button>
          <button type="button" className="rd-seltoolbar__btn" onClick={onThought}>想法</button>
          <button type="button" className="rd-seltoolbar__btn" onClick={onCopy}>复制 MD</button>
          <button type="button" className="rd-seltoolbar__btn" onClick={onShare}>分享</button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: NoteComposer**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  initialText?: string;
  title?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function NoteComposer({ open, initialText = '', title = '写一段笔记', onSubmit, onCancel }: Props) {
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) {
      setText(initialText);
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [open, initialText]);
  if (!open) return null;
  return (
    <div className="rd-composer__overlay" onClick={onCancel} data-rd-no-toggle="true">
      <div className="rd-composer" onClick={(e) => e.stopPropagation()}>
        <div className="rd-composer__title">{title}</div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="输入文字…（⌘+Enter 提交）"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSubmit(text);
          }}
        />
        <div className="rd-composer__actions">
          <button type="button" onClick={onCancel}>取消</button>
          <button type="button" className="rd-composer__primary" onClick={() => onSubmit(text)} disabled={!text.trim()}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: CSS（追加 reader.module.css）**

```css
:global(.rd-seltoolbar) {
  position: fixed;
  z-index: 70;
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  border-radius: 8px;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.5);
}
:global(.rd-seltoolbar__btn) {
  background: transparent;
  border: 1px solid var(--rd-border);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--rd-text);
  cursor: pointer;
  font: inherit;
}
:global(.rd-seltoolbar__btn:hover) { background: rgba(255,255,255,0.06); }
:global(.rd-seltoolbar__btn--mark) {
  font-weight: 600;
  border-color: transparent !important;
}
:global(.rd-palette) {
  display: inline-flex;
  gap: 6px;
  padding: 4px 6px;
}
:global(.rd-palette__dot) {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid transparent; cursor: pointer;
}
:global(.rd-palette__dot:hover) { border-color: var(--rd-text-strong); }

:global(.rd-composer__overlay) {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rd-fade 150ms ease;
}
:global(.rd-composer) {
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  border-radius: 8px;
  padding: 14px;
  width: min(420px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
}
:global(.rd-composer__title) {
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--rd-text-dim);
  text-transform: uppercase;
}
:global(.rd-composer textarea) {
  width: 100%;
  background: var(--rd-bg);
  border: 1px solid var(--rd-border);
  border-radius: 4px;
  color: var(--rd-text);
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  resize: vertical;
}
:global(.rd-composer textarea:focus) { border-color: var(--rd-link); outline: none; }
:global(.rd-composer__actions) {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
:global(.rd-composer__actions button) {
  background: transparent;
  border: 1px solid var(--rd-border);
  color: var(--rd-text);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
:global(.rd-composer__actions button:hover) { background: rgba(255,255,255,0.06); }
:global(.rd-composer__primary) {
  background: var(--rd-link) !important;
  border-color: var(--rd-link) !important;
  color: #fff !important;
}
:global(.rd-composer__primary:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Commit**

```bash
git add app/read/_reader/annotation/ app/read/_reader/reader.module.css
git commit -m "feat(reader): SelectionToolbar + ColorPalette + NoteComposer"
```

---

### Task 7: `HighlightOverlay` 渲染所有划线

**Files:** Create `app/read/_reader/annotation/HighlightOverlay.tsx`

> 策略：在每次 marks 变化时，遍历 contentRoot 找到对应文本节点，包一层 `<span class="rd-mark" data-mark-id="..." style="--mc:..." />`。重渲前先 cleanup（找所有 `.rd-mark` 拆包）。

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect } from 'react';
import { resolveAnchor } from '@/lib/reader/anchor';
import type { Mark } from '@/lib/reader/types';

interface Props {
  contentRoot: HTMLElement | null;
  source: string;
  marks: Mark[];
  onClickMark: (mark: Mark, rect: DOMRect) => void;
}

const COLOR_VAR: Record<Mark['color'], string> = {
  yellow: 'var(--rd-mark-yellow)',
  red:    'var(--rd-mark-red)',
  green:  'var(--rd-mark-green)',
  blue:   'var(--rd-mark-blue)',
};

function unwrapAll(root: HTMLElement) {
  const spans = root.querySelectorAll<HTMLElement>('.rd-mark');
  spans.forEach((s) => {
    const parent = s.parentNode;
    if (!parent) return;
    while (s.firstChild) parent.insertBefore(s.firstChild, s);
    parent.removeChild(s);
    parent.normalize();
  });
}

/** Walk text nodes inside element and wrap chars [start, end) of plain text. */
function wrapRange(
  root: HTMLElement,
  startCharInRoot: number,
  endCharInRoot: number,
  attrs: Record<string, string>,
): boolean {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0;
  let startNode: Text | null = null;
  let startOff = 0;
  let endNode: Text | null = null;
  let endOff = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const len = t.data.length;
    if (!startNode && acc + len > startCharInRoot) {
      startNode = t;
      startOff = startCharInRoot - acc;
    }
    if (!endNode && acc + len >= endCharInRoot) {
      endNode = t;
      endOff = endCharInRoot - acc;
      break;
    }
    acc += len;
  }
  if (!startNode || !endNode) return false;
  const range = document.createRange();
  range.setStart(startNode, startOff);
  range.setEnd(endNode, endOff);
  const span = document.createElement('span');
  span.classList.add('rd-mark');
  Object.entries(attrs).forEach(([k, v]) => span.setAttribute(k, v));
  try {
    range.surroundContents(span);
    return true;
  } catch {
    return false;
  }
}

function plainTextOffsetForSourceOffset(
  contentRoot: HTMLElement,
  source: string,
  sourceStart: number,
  sourceEnd: number,
): { plainStart: number; plainEnd: number } | null {
  // Approximate: use root.innerText and find quote substring (we already resolved to source offsets).
  const sel = source.slice(sourceStart, sourceEnd);
  const plain = contentRoot.innerText;
  const idx = plain.indexOf(sel);
  if (idx < 0) return null;
  return { plainStart: idx, plainEnd: idx + sel.length };
}

export function HighlightOverlay({ contentRoot, source, marks, onClickMark }: Props) {
  useEffect(() => {
    if (!contentRoot) return;

    const apply = () => {
      unwrapAll(contentRoot);
      for (const m of marks) {
        const r = resolveAnchor(source, m.anchor);
        if (!r) continue;
        const p = plainTextOffsetForSourceOffset(contentRoot, source, r.startOffset, r.endOffset);
        if (!p) continue;
        wrapRange(contentRoot, p.plainStart, p.plainEnd, {
          'data-mark-id': m.id,
          'data-color': m.color,
          'data-drifted': r.drifted ? '1' : '0',
          style: `--mc:${COLOR_VAR[m.color]}`,
        });
      }
    };
    apply();
    return () => unwrapAll(contentRoot);
  }, [contentRoot, source, marks]);

  // Click delegation: any click on .rd-mark surfaces to onClickMark
  useEffect(() => {
    if (!contentRoot) return;
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest('.rd-mark') as HTMLElement | null;
      if (!t) return;
      const id = t.dataset.markId;
      if (!id) return;
      const m = marks.find((x) => x.id === id);
      if (!m) return;
      e.preventDefault();
      onClickMark(m, t.getBoundingClientRect());
    };
    contentRoot.addEventListener('click', onClick);
    return () => contentRoot.removeEventListener('click', onClick);
  }, [contentRoot, marks, onClickMark]);

  return null;
}
```

- [ ] **Step 2: CSS for `.rd-mark`**

```css
:global(.rd-mark) {
  background: linear-gradient(
    transparent 60%,
    color-mix(in srgb, var(--mc, transparent) 40%, transparent) 60%
  );
  cursor: pointer;
  transition: background 200ms;
}
:global(.rd-mark:hover) {
  background: linear-gradient(
    transparent 50%,
    color-mix(in srgb, var(--mc, transparent) 55%, transparent) 50%
  );
}
:global(.rd-mark[data-drifted="1"]) {
  outline: 1px dashed color-mix(in srgb, var(--mc) 60%, transparent);
  outline-offset: 1px;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/annotation/HighlightOverlay.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): HighlightOverlay (DOM walker + Range surroundContents)"
```

---

### Task 8: `MarkPopover`

**Files:** Create `app/read/_reader/annotation/MarkPopover.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import type { Mark, Note } from '@/lib/reader/types';
import type { MarkColor } from '@/lib/reader/prefs';
import { ColorPalette } from './ColorPalette';
import { useState } from 'react';

interface Props {
  mark: Mark;
  rect: DOMRect;
  note?: Note;
  onClose: () => void;
  onChangeColor: (color: MarkColor) => void;
  onEditNote: () => void;
  onDelete: () => void;
}

export function MarkPopover({ mark, rect, note, onClose, onChangeColor, onEditNote, onDelete }: Props) {
  const [palette, setPalette] = useState(false);
  const top = rect.bottom + 6;
  const left = Math.min(window.innerWidth - 240, Math.max(8, rect.left));
  return (
    <>
      <div className="rd-mark-pop__catcher" onClick={onClose} data-rd-no-toggle="true" />
      <div
        className="rd-mark-pop"
        style={{ top, left }}
        role="dialog"
        aria-label="划线操作"
        data-rd-no-toggle="true"
      >
        <div className="rd-mark-pop__meta">
          {new Date(mark.createdAt).toLocaleString()}
          {' · '}
          <span style={{ color: `var(--rd-mark-${mark.color})` }}>● {mark.color}</span>
        </div>
        {note && <div className="rd-mark-pop__note">{note.text}</div>}
        {palette ? (
          <ColorPalette onPick={(c) => { onChangeColor(c); setPalette(false); }} />
        ) : (
          <div className="rd-mark-pop__actions">
            <button type="button" onClick={onEditNote}>✎ 笔记</button>
            <button type="button" onClick={() => setPalette(true)}>🎨 改色</button>
            <button type="button" className="rd-mark-pop__danger" onClick={onDelete}>✕ 删除</button>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-mark-pop__catcher) {
  position: fixed;
  inset: 0;
  z-index: 65;
}
:global(.rd-mark-pop) {
  position: fixed;
  z-index: 66;
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  border-radius: 6px;
  padding: 8px 10px;
  width: 220px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  font-size: 11px;
  color: var(--rd-text);
}
:global(.rd-mark-pop__meta) {
  color: var(--rd-text-dim);
  margin-bottom: 6px;
  font-size: 10px;
}
:global(.rd-mark-pop__note) {
  background: var(--rd-bg);
  border-left: 2px solid var(--rd-accent);
  border-radius: 0 4px 4px 0;
  padding: 4px 8px;
  margin-bottom: 8px;
  color: var(--rd-text-muted);
  line-height: 1.6;
  font-size: 11px;
}
:global(.rd-mark-pop__actions) {
  display: flex;
  gap: 6px;
}
:global(.rd-mark-pop__actions button) {
  flex: 1;
  background: transparent;
  border: 1px solid var(--rd-border);
  color: var(--rd-text);
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
}
:global(.rd-mark-pop__actions button:hover) { background: rgba(255,255,255,0.05); }
:global(.rd-mark-pop__danger) { color: #f87171 !important; }
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/annotation/MarkPopover.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): MarkPopover (date + note + color/edit/delete)"
```

---

### Task 9: `InlineNoteCard` 行间笔记/想法卡

**Files:** Create `app/read/_reader/annotation/InlineNoteCard.tsx`

> 用 portal 把卡片插到锚点段落之后。简化版：把所有当前文章的 notes/thoughts 倒序遍历，对每条找到 anchor 对应段落（最简：找含同 quote 的段落），在其后 appendChild 卡片。换文章时全部清掉。

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Note, Thought } from '@/lib/reader/types';

interface Card {
  hostEl: HTMLElement;
  kind: 'note' | 'thought';
  data: Note | Thought;
}

interface Props {
  contentRoot: HTMLElement | null;
  notes: Note[];
  thoughts: Thought[];
  visibility: 'always' | 'collapsed' | 'hidden';
  onEdit: (kind: 'note' | 'thought', id: string) => void;
  onDelete: (kind: 'note' | 'thought', id: string) => void;
}

function findAnchorParagraph(root: HTMLElement, quote: string): HTMLElement | null {
  const paragraphs = root.querySelectorAll<HTMLElement>('p, li, blockquote, h1, h2, h3, h4');
  for (const p of paragraphs) {
    if (p.textContent && quote.length > 0 && p.textContent.includes(quote.slice(0, Math.min(20, quote.length)))) {
      return p;
    }
  }
  return null;
}

export function InlineNoteCard({ contentRoot, notes, thoughts, visibility, onEdit, onDelete }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const hostsRef = useRef<HTMLElement[]>([]);

  // Build host elements after each item paragraph
  useEffect(() => {
    if (!contentRoot) return;
    if (visibility === 'hidden') {
      setCards([]);
      return;
    }
    // cleanup previous hosts
    hostsRef.current.forEach((h) => h.remove());
    hostsRef.current = [];

    const items: { kind: 'note' | 'thought'; data: Note | Thought }[] = [
      ...notes.map((n) => ({ kind: 'note' as const, data: n })),
      ...thoughts.map((t) => ({ kind: 'thought' as const, data: t })),
    ];

    const newCards: Card[] = [];
    for (const it of items) {
      const para = findAnchorParagraph(contentRoot, it.data.anchor.quote);
      if (!para) continue;
      const host = document.createElement('div');
      host.className = `rd-inline-host rd-inline-host--${it.kind}`;
      para.after(host);
      hostsRef.current.push(host);
      newCards.push({ hostEl: host, kind: it.kind, data: it.data });
    }
    setCards(newCards);

    return () => {
      hostsRef.current.forEach((h) => h.remove());
      hostsRef.current = [];
    };
  }, [contentRoot, notes, thoughts, visibility]);

  return (
    <>
      {cards.map((c) =>
        createPortal(
          <InlineNoteRender
            card={c}
            collapsed={visibility === 'collapsed'}
            onEdit={() => onEdit(c.kind, c.data.id)}
            onDelete={() => onDelete(c.kind, c.data.id)}
          />,
          c.hostEl,
          c.data.id,
        ),
      )}
    </>
  );
}

function InlineNoteRender({
  card,
  collapsed,
  onEdit,
  onDelete,
}: {
  card: Card;
  collapsed: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(!collapsed);
  if (collapsed && !open) {
    return (
      <button
        type="button"
        className={`rd-inline-dot rd-inline-dot--${card.kind}`}
        onClick={() => setOpen(true)}
        aria-label="展开笔记"
      />
    );
  }
  return (
    <div className={`rd-inline-card rd-inline-card--${card.kind}`}>
      <div className="rd-inline-card__head">
        <span className="rd-inline-card__label">
          {card.kind === 'note' ? '▍笔记' : '💭想法'}
        </span>
        <span className="rd-inline-card__date">
          {new Date(card.data.createdAt).toLocaleDateString()}
        </span>
        {collapsed && (
          <button type="button" className="rd-inline-card__collapse" onClick={() => setOpen(false)}>−</button>
        )}
      </div>
      <div className="rd-inline-card__text">{card.data.text}</div>
      <div className="rd-inline-card__actions">
        <button type="button" onClick={onEdit}>编辑</button>
        <button type="button" className="rd-inline-card__danger" onClick={onDelete}>删除</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-inline-host) { display: block; }
:global(.rd-inline-card) {
  margin: 8px 0 12px 28px;
  background: var(--rd-bg-elev);
  border-left: 2px solid;
  border-radius: 0 4px 4px 0;
  padding: 8px 12px;
  font-size: calc(var(--rd-font-size) * 0.85);
  line-height: 1.65;
}
:global(.rd-inline-card--note)    { border-left-color: var(--rd-accent); }
:global(.rd-inline-card--thought) { border-left-color: var(--rd-link); }
:global(.rd-inline-card__head) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.85em;
}
:global(.rd-inline-card__label) {
  font-weight: 600;
}
:global(.rd-inline-card--note .rd-inline-card__label)    { color: var(--rd-accent); }
:global(.rd-inline-card--thought .rd-inline-card__label) { color: var(--rd-link); }
:global(.rd-inline-card__date) { color: var(--rd-text-dim); margin-left: auto; font-size: 0.85em; }
:global(.rd-inline-card__collapse) {
  background: transparent;
  border: none;
  color: var(--rd-text-dim);
  cursor: pointer;
  font-size: 12px;
}
:global(.rd-inline-card__text) { color: var(--rd-text-muted); }
:global(.rd-inline-card__actions) {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
:global(.rd-inline-card__actions button) {
  background: transparent;
  border: 1px solid var(--rd-border);
  color: var(--rd-text-muted);
  font-size: 0.85em;
  padding: 1px 8px;
  border-radius: 3px;
  cursor: pointer;
  font: inherit;
}
:global(.rd-inline-card__actions button:hover) { background: rgba(255,255,255,0.04); color: var(--rd-text); }
:global(.rd-inline-card__danger) { color: #f87171 !important; }

:global(.rd-inline-dot) {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 4px 0 4px 28px;
  border: none;
  cursor: pointer;
}
:global(.rd-inline-dot--note)    { background: var(--rd-accent); }
:global(.rd-inline-dot--thought) { background: var(--rd-link); }
```

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/annotation/InlineNoteCard.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): InlineNoteCard with portal + collapsed dot mode"
```

---

### Task 10: 接入 ReaderShell

**Files:** Modify `app/read/_reader/ReaderShell.tsx`

- [ ] **Step 1: 把所有 annotation 件接进来**

```tsx
// （只展示需要新增的部分；其余保持 phase-4 末态）

import { useSelection } from './hooks/useSelection';
import { useAnnotations } from './hooks/useAnnotations';
import { useFavorite } from './hooks/useFavorite';
import { SelectionToolbar } from './annotation/SelectionToolbar';
import { HighlightOverlay } from './annotation/HighlightOverlay';
import { MarkPopover } from './annotation/MarkPopover';
import { InlineNoteCard } from './annotation/InlineNoteCard';
import { NoteComposer } from './annotation/NoteComposer';
import { makeAnchor } from '@/lib/reader/anchor';
import type { Mark, Note, Thought } from '@/lib/reader/types';

// In Inner component:
const contentRootRef = useRef<HTMLDivElement>(null);
const [contentRoot, setContentRoot] = useState<HTMLDivElement | null>(null);
useEffect(() => setContentRoot(contentRootRef.current), [data?.id]);

const {
  marks, notes, thoughts,
  addMark, changeMarkColor, removeMark,
  addNote, editNote, removeNote,
  addThought, editThought, removeThought,
} = useAnnotations(data?.id ?? null);
const { isFavorite } = useFavorite(data?.id ?? null);

const { info: selInfo, clear: clearSel } = useSelection({
  contentRoot,
  source: data?.content ?? '',
  enabled: !!data,
});

const [composer, setComposer] = useState<
  | { kind: 'note' | 'thought'; anchor: import('@/lib/reader/types').Anchor; existingId?: string; initial?: string }
  | null
>(null);
const [pop, setPop] = useState<{ mark: Mark; rect: DOMRect } | null>(null);

const onMark = useCallback((color: import('@/lib/reader/prefs').MarkColor) => {
  if (!selInfo || !data) return;
  const anchor = makeAnchor(data.content, selInfo.startOffset, selInfo.endOffset);
  void addMark(anchor, color);
  clearSel();
}, [selInfo, data, addMark, clearSel]);

const onNote = useCallback(() => {
  if (!selInfo || !data) return;
  const anchor = makeAnchor(data.content, selInfo.startOffset, selInfo.endOffset);
  setComposer({ kind: 'note', anchor });
  clearSel();
}, [selInfo, data, clearSel]);

const onThought = useCallback(() => {
  if (!selInfo || !data) return;
  const anchor = makeAnchor(data.content, selInfo.startOffset, selInfo.endOffset);
  setComposer({ kind: 'thought', anchor });
  clearSel();
}, [selInfo, data, clearSel]);

const onCopySelection = useCallback(() => {
  if (!selInfo) return;
  void navigator.clipboard.writeText(selInfo.text);
  clearSel();
}, [selInfo, clearSel]);

const onShare = useCallback(() => {
  if (!selInfo || !data) return;
  const url = `${location.origin}/read/${data.idChain}`;
  void navigator.clipboard.writeText(`> ${selInfo.text}\n\n— 来自《${data.path.split('/').pop()}》${url}`);
  clearSel();
}, [selInfo, data, clearSel]);

const composerSubmit = useCallback(async (text: string) => {
  if (!composer) return;
  if (composer.existingId) {
    if (composer.kind === 'note') await editNote(composer.existingId, text);
    else await editThought(composer.existingId, text);
  } else {
    if (composer.kind === 'note') await addNote(composer.anchor, text);
    else await addThought(composer.anchor, text);
  }
  setComposer(null);
}, [composer, addNote, editNote, addThought, editThought]);

// 在 JSX 中：
// 1) 把 main 上的 ref 改为 contentRootRef
// 2) 在 ReaderEndCard 之后渲染：
//    <HighlightOverlay contentRoot={contentRoot} source={data.content} marks={marks} onClickMark={(m,r)=>setPop({mark:m,rect:r})} />
//    <InlineNoteCard contentRoot={contentRoot} notes={notes} thoughts={thoughts} visibility={prefs.noteVisibility} onEdit={...} onDelete={...} />
// 3) 顶层加：
//    <SelectionToolbar rect={selInfo?.rect ?? null} onMark={onMark} onNote={onNote} onThought={onThought} onCopy={onCopySelection} onShare={onShare} />
//    {pop && <MarkPopover mark={pop.mark} rect={pop.rect} note={notes.find((n) => isSameAnchor(n.anchor, pop.mark.anchor))} onClose={() => setPop(null)} onChangeColor={(c) => { void changeMarkColor(pop.mark.id, c); setPop(null); }} onEditNote={() => { setComposer({ kind: 'note', anchor: pop.mark.anchor }); setPop(null); }} onDelete={() => { void removeMark(pop.mark.id); setPop(null); }} />}
//    <NoteComposer open={!!composer} initialText={composer?.initial} title={composer?.kind === 'note' ? '写一段笔记' : '写一段想法'} onSubmit={composerSubmit} onCancel={() => setComposer(null)} />
// 4) 把 ReaderTopBar 的 isFavorite 用 useFavorite 真实值替换。
```

> **isSameAnchor:** 简化为 `a.startOffset === b.startOffset && a.endOffset === b.endOffset`。可放在 `lib/reader/anchor.ts` 内导出。

- [ ] **Step 2: 在 anchor.ts 导出 helper**

在 `lib/reader/anchor.ts` 末尾追加：
```ts
export function isSameAnchor(a: Anchor, b: Anchor): boolean {
  return a.startOffset === b.startOffset && a.endOffset === b.endOffset;
}
```

- [ ] **Step 3: 验证整流程**

```bash
npm run build && npm run restart
```

打开任一文章：
1. 选一段文字 → 顶部工具气泡出现
2. 点 "划线" → 该段亮黄高亮 + 文件 `wiki-data/_reader/marks.json` 出现一条
3. 长按 "划线" 0.4s → 4 色面板展开 → 选红色 → 改色
4. 点击已划线段 → 弹出 MarkPopover
5. 选另一段 → 点 "笔记" → NoteComposer 弹起 → 写一句 → ⌘+Enter 保存 → 段落下方出现 ▍金色卡片
6. 顶 bar ⭐ 点击 → 文件 `favorites.json` 出现一条
7. 刷新页面 → 划线/笔记/收藏全部恢复

- [ ] **Step 4: Commit**

```bash
git add app/read/_reader/ReaderShell.tsx lib/reader/anchor.ts
git commit -m "feat(reader): wire annotation layer into ReaderShell (selection→mark→render→edit)"
```

---

### Task 11: 验收 phase-6

- [ ] **Step 1: 测试**

```bash
npm test
```
Expected: anchor (6) + 之前 31 = 37 passed.

- [ ] **Step 2: 锚点抗漂移人工验证**

复制一篇 wiki 文章，对其内容做以下修改后再访问，确认划线仍能正确定位（drift 不丢失）：
- 在文章开头插入新段落（offset shift）
- 改 1–2 个字符（fuzzy 命中）
- 删去无关段落（offset shift）

期望：所有划线仍能渲染，drifted=true 的会有虚线 outline 提示。

- [ ] **Step 3: tag**

```bash
git tag reader/phase-6-annotation
```

---

## Phase-6 验收标准

- [ ] anchor 6 测试 pass，含 fuzzy 与 CJK 用例
- [ ] 选区触发 SelectionToolbar，桌面浮选区上、手机贴底部
- [ ] 4 色划线全部可创建（默认上次色、长按/右键展开 4 色）
- [ ] 已划线被点击 → MarkPopover 显示日期/笔记/操作
- [ ] 笔记/想法行间嵌入卡（金条/蓝条），可编辑/删除
- [ ] 设置中"笔记可见性" 三态生效（始终/折叠/隐藏）
- [ ] 收藏图标 ⌘B / 顶 bar 点击都能切换
- [ ] 锚点抗漂移：原文中段落顺序变化、字符变化能 fuzzy 命中
- [ ] 刷新文章后所有 marks/notes/thoughts/favorites 恢复
- [ ] 数据持久化到 `wiki-data/_reader/*.json`
