# Phase 1 · 基础骨架 + 主题 token

**Goal:** 拆掉旧 `/read` 页面，立起新 `ReaderShell` + 主题 token + localStorage prefs。完成后 `/read` 显示一个深炭黑空壳，能从 `/api/articles` 取到文章并在中央列以 720px 宽度展示纯文字。

**Architecture:** 旧 `app/read/[[...ids]]/page.tsx` 整体重写为薄壳 → `ReaderShell`。主题用 CSS variable token 写在 `app/read/_reader/reader.module.css`。prefs 走 localStorage 单 key (`never-wiki.reader.prefs`)。

**Branch:** `feat/reader-redesign`

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 新分支 | `feat/reader-redesign` | 隔离工作 |
| 安装 | `vitest`, `@vitest/ui`, `jsdom` | 单元测试 |
| 创建 | `vitest.config.ts` | 测试配置 |
| 创建 | `lib/reader/prefs.ts` | localStorage 偏好读写（纯函数） |
| 创建 | `lib/reader/__tests__/prefs.test.ts` | 单测 |
| 创建 | `app/read/_reader/reader.module.css` | 主题 token + 排版基础 |
| 创建 | `app/read/_reader/hooks/useReaderPrefs.ts` | React hook 包装 prefs |
| 创建 | `app/read/_reader/ReaderShell.tsx` | 主容器（占位空壳） |
| 重写 | `app/read/[[...ids]]/page.tsx` | Suspense + ReaderShell |

---

### Task 1: 切分支 + 安装测试依赖

**Files:** —

- [ ] **Step 1: 切到独立工作分支**

```bash
git checkout -b feat/reader-redesign
git status
```
Expected: `On branch feat/reader-redesign` + working tree clean (modified files from earlier remain).

- [ ] **Step 2: 暂存当前未提交修改（避免污染）**

```bash
git stash push -m "pre-reader-redesign-wip"
```
Expected: Saved working directory; tree clean.

- [ ] **Step 3: 安装 vitest 与 jsdom**

```bash
npm i -D vitest@^1 @vitest/ui@^1 jsdom@^24
```
Expected: 3 deps added in `package.json` devDependencies.

- [ ] **Step 4: 在 package.json scripts 加测试命令**

打开 `package.json`，把 `scripts` 中加入：
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(reader): add vitest + jsdom for unit tests"
```

---

### Task 2: vitest 配置

**Files:** Create `vitest.config.ts`

- [ ] **Step 1: 创建 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['lib/**/__tests__/**/*.test.ts', 'lib/**/__tests__/**/*.test.tsx'],
    setupFiles: [],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 2: 跑空 test 套件确认 vitest 启动**

```bash
npm test
```
Expected: `No test files found, exiting with code 0` (或类似)。

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore(reader): vitest config with jsdom env"
```

---

### Task 3: `lib/reader/prefs.ts` (TDD)

**Files:**
- Create: `lib/reader/prefs.ts`
- Test: `lib/reader/__tests__/prefs.test.ts`

#### 接口契约

```ts
export type ThemeName = 'oled' | 'charcoal' | 'ink';
export type FontFamily = 'sans' | 'serif';
export type WidthName = 'narrow' | 'medium' | 'wide';   // 580 / 720 / 900
export type NoteVisibility = 'always' | 'collapsed' | 'hidden';
export type MarkColor = 'yellow' | 'red' | 'green' | 'blue';

export interface ReaderPrefs {
  theme: ThemeName;
  font: FontFamily;
  width: WidthName;
  fontSize: number;        // 14..22
  lineHeight: number;      // 1.7..2.25
  indent: boolean;
  noteVisibility: NoteVisibility;
  lastMarkColor: MarkColor;
  leftDrawerWidth: number; // px
  rightDrawerWidth: number;// px
}

export const DEFAULT_PREFS: ReaderPrefs;

export function loadPrefs(): ReaderPrefs;
export function savePrefs(prefs: ReaderPrefs): void;
export function patchPrefs(patch: Partial<ReaderPrefs>): ReaderPrefs;
export function resetPrefs(): ReaderPrefs;

export const STORAGE_KEY = 'never-wiki.reader.prefs';
```

- [ ] **Step 1: 写失败的测试**

`lib/reader/__tests__/prefs.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPrefs, savePrefs, patchPrefs, resetPrefs, DEFAULT_PREFS, STORAGE_KEY } from '../prefs';

describe('reader prefs', () => {
  beforeEach(() => localStorage.clear());

  it('loadPrefs returns defaults when nothing stored', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('savePrefs writes JSON to localStorage', () => {
    savePrefs({ ...DEFAULT_PREFS, fontSize: 19 });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).fontSize).toBe(19);
  });

  it('loadPrefs round-trips with savePrefs', () => {
    savePrefs({ ...DEFAULT_PREFS, theme: 'oled', indent: false });
    expect(loadPrefs().theme).toBe('oled');
    expect(loadPrefs().indent).toBe(false);
  });

  it('patchPrefs merges and persists', () => {
    patchPrefs({ width: 'wide' });
    expect(loadPrefs().width).toBe('wide');
    patchPrefs({ fontSize: 20 });
    expect(loadPrefs().width).toBe('wide');     // unchanged
    expect(loadPrefs().fontSize).toBe(20);
  });

  it('loadPrefs ignores corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('loadPrefs fills missing keys with defaults (forward compat)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'ink' }));
    const p = loadPrefs();
    expect(p.theme).toBe('ink');
    expect(p.fontSize).toBe(DEFAULT_PREFS.fontSize);
  });

  it('resetPrefs clears storage and returns defaults', () => {
    savePrefs({ ...DEFAULT_PREFS, fontSize: 22 });
    expect(resetPrefs()).toEqual(DEFAULT_PREFS);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('savePrefs clamps fontSize to [14, 22]', () => {
    savePrefs({ ...DEFAULT_PREFS, fontSize: 99 });
    expect(loadPrefs().fontSize).toBe(22);
    savePrefs({ ...DEFAULT_PREFS, fontSize: 5 });
    expect(loadPrefs().fontSize).toBe(14);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm test -- prefs
```
Expected: FAIL — `Cannot find module '../prefs'`.

- [ ] **Step 3: 实现 `lib/reader/prefs.ts`**

```ts
export type ThemeName = 'oled' | 'charcoal' | 'ink';
export type FontFamily = 'sans' | 'serif';
export type WidthName = 'narrow' | 'medium' | 'wide';
export type NoteVisibility = 'always' | 'collapsed' | 'hidden';
export type MarkColor = 'yellow' | 'red' | 'green' | 'blue';

export interface ReaderPrefs {
  theme: ThemeName;
  font: FontFamily;
  width: WidthName;
  fontSize: number;
  lineHeight: number;
  indent: boolean;
  noteVisibility: NoteVisibility;
  lastMarkColor: MarkColor;
  leftDrawerWidth: number;
  rightDrawerWidth: number;
}

export const STORAGE_KEY = 'never-wiki.reader.prefs';

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: 'charcoal',
  font: 'sans',
  width: 'medium',
  fontSize: 17,
  lineHeight: 1.95,
  indent: true,
  noteVisibility: 'always',
  lastMarkColor: 'yellow',
  leftDrawerWidth: 280,
  rightDrawerWidth: 240,
};

const FONT_SIZE_RANGE = [14, 22] as const;
const LINE_HEIGHT_RANGE = [1.7, 2.25] as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function sanitize(p: Partial<ReaderPrefs>): ReaderPrefs {
  const merged: ReaderPrefs = { ...DEFAULT_PREFS, ...p };
  merged.fontSize = clamp(merged.fontSize, FONT_SIZE_RANGE[0], FONT_SIZE_RANGE[1]);
  merged.lineHeight = clamp(merged.lineHeight, LINE_HEIGHT_RANGE[0], LINE_HEIGHT_RANGE[1]);
  return merged;
}

export function loadPrefs(): ReaderPrefs {
  if (!isBrowser()) return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return sanitize(JSON.parse(raw) as Partial<ReaderPrefs>);
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ReaderPrefs): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(prefs)));
}

export function patchPrefs(patch: Partial<ReaderPrefs>): ReaderPrefs {
  const next = sanitize({ ...loadPrefs(), ...patch });
  savePrefs(next);
  return next;
}

export function resetPrefs(): ReaderPrefs {
  if (isBrowser()) localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_PREFS;
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
npm test -- prefs
```
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/reader/prefs.ts lib/reader/__tests__/prefs.test.ts
git commit -m "feat(reader): localStorage prefs with clamp + forward-compat (TDD)"
```

---

### Task 4: 主题 token CSS

**Files:** Create `app/read/_reader/reader.module.css`

- [ ] **Step 1: 写主题 token**

```css
/* app/read/_reader/reader.module.css */

/* ---- 主题 token (default = charcoal) ---- */
.theme-charcoal {
  --rd-bg: #0f0f10;
  --rd-bg-elev: #16161a;
  --rd-bg-bar: rgba(15, 15, 16, 0.92);
  --rd-text: #c9c7c2;
  --rd-text-strong: #e6e3dd;
  --rd-text-muted: #a09e98;
  --rd-text-dim: #666;
  --rd-border: #1c1c1e;
  --rd-accent: #c9a76b;
  --rd-link: #7aa2f7;
  --rd-mark-yellow: #fbbf24;
  --rd-mark-red: #f87171;
  --rd-mark-green: #a3e635;
  --rd-mark-blue: #60a5fa;
}

.theme-oled {
  --rd-bg: #000000;
  --rd-bg-elev: #0a0a0a;
  --rd-bg-bar: rgba(0, 0, 0, 0.92);
  --rd-text: #d4d2cc;
  --rd-text-strong: #ffffff;
  --rd-text-muted: #a8a6a0;
  --rd-text-dim: #555;
  --rd-border: #1a1a1a;
  --rd-accent: #c9a76b;
  --rd-link: #7aa2f7;
  --rd-mark-yellow: #fbbf24;
  --rd-mark-red: #f87171;
  --rd-mark-green: #a3e635;
  --rd-mark-blue: #60a5fa;
}

.theme-ink {
  --rd-bg: #15110d;
  --rd-bg-elev: #1c1610;
  --rd-bg-bar: rgba(21, 17, 13, 0.92);
  --rd-text: #cabfae;
  --rd-text-strong: #e8d9b9;
  --rd-text-muted: #a8987a;
  --rd-text-dim: #7a6a52;
  --rd-border: #2a2218;
  --rd-accent: #c9a76b;
  --rd-link: #c9a76b;
  --rd-mark-yellow: #fbbf24;
  --rd-mark-red: #f87171;
  --rd-mark-green: #a3e635;
  --rd-mark-blue: #60a5fa;
}

/* ---- 容器 ---- */
.shell {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  background: var(--rd-bg);
  color: var(--rd-text);
  font-family: var(--rd-font-family-sans);
  font-size: var(--rd-font-size);
  line-height: var(--rd-line-height);
  transition: background 200ms ease, color 200ms ease;
  overflow-x: hidden;
}

.shell[data-font="serif"] { font-family: var(--rd-font-family-serif); }

:root {
  --rd-font-family-sans: system-ui, -apple-system, "PingFang SC", "Noto Sans SC",
                         "Source Han Sans SC", sans-serif;
  --rd-font-family-serif: "Noto Serif SC", "Source Han Serif SC", Georgia, serif;
  --rd-font-mono: ui-monospace, "JetBrains Mono", "Fira Code", Menlo, monospace;
}

/* ---- 正文容器宽度三档 ---- */
.column { margin: 0 auto; padding: 60px 24px 120px; }
.column[data-width="narrow"]  { max-width: 580px; }
.column[data-width="medium"]  { max-width: 720px; }
.column[data-width="wide"]    { max-width: 900px; }

/* ---- 缩进 ---- */
.column[data-indent="true"] p { text-indent: 2em; }

/* ---- 标题 ---- */
.column h1 { font-size: 28px; font-weight: 600; color: var(--rd-text-strong);
             margin: 0 0 14px; letter-spacing: 0.5px; }
.column h2 { font-size: 22px; font-weight: 600; color: var(--rd-text-strong);
             margin: 36px 0 12px; }
.column h3 { font-size: 18px; font-weight: 600; color: var(--rd-text-strong);
             margin: 28px 0 10px; }
.column h4 { font-size: 16px; font-weight: 600; color: var(--rd-text-strong);
             margin: 22px 0 8px; }

/* ---- 段落 ---- */
.column p { margin: 0 0 1em; color: var(--rd-text); }
.column p strong { color: var(--rd-text-strong); }
.column p em { color: var(--rd-text-muted); font-style: italic; }

/* ---- 链接 ---- */
.column a { color: var(--rd-link); text-decoration: none; }
.column a:hover { text-decoration: underline; }

/* ---- 引用块 ---- */
.column blockquote {
  border-left: 2px solid var(--rd-accent);
  padding: 4px 0 4px 16px;
  margin: 16px 0;
  color: var(--rd-text-muted);
  font-style: italic;
}

/* ---- 分隔线 ---- */
.column hr {
  border: none;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 32px 0;
  position: relative;
}
.column hr::after {
  content: "·  ·  ·";
  letter-spacing: 8px;
  color: var(--rd-text-dim);
  font-size: 14px;
}

/* ---- 表格 ---- */
.column table { width: 100%; border-collapse: collapse; margin: 16px 0;
                font-size: 0.95em; }
.column th, .column td {
  border: 1px solid var(--rd-border);
  padding: 8px 12px;
  text-align: left;
  color: var(--rd-text);
}
.column th { background: var(--rd-bg-elev); color: var(--rd-text-strong); }
.column tbody tr:nth-child(odd) { background: #131316; }
.column tbody tr:hover { background: #1a1a1c; }

/* ---- 代码 inline ---- */
.column code:not(pre code) {
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  border-radius: 3px;
  padding: 0 5px;
  font-family: var(--rd-font-mono);
  font-size: 0.9em;
  color: var(--rd-text-strong);
}

/* ---- 三端响应 ---- */
@media (max-width: 1023px) {
  .column { padding: 40px 24px 100px; }
}
@media (max-width: 767px) {
  .column { padding: 28px 16px 80px; max-width: 100% !important; font-size: 16px; }
  .column[data-width="narrow"]  { max-width: 100% !important; }
  .column[data-width="medium"]  { max-width: 100% !important; }
  .column[data-width="wide"]    { max-width: 100% !important; }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/reader.module.css
git commit -m "feat(reader): theme tokens (charcoal/oled/ink) + base typography"
```

---

### Task 5: `useReaderPrefs` hook

**Files:** Create `app/read/_reader/hooks/useReaderPrefs.ts`

- [ ] **Step 1: 实现 hook**

```ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  loadPrefs,
  patchPrefs as patchPrefsLib,
  resetPrefs as resetPrefsLib,
  type ReaderPrefs,
  DEFAULT_PREFS,
} from '@/lib/reader/prefs';

export function useReaderPrefs(): {
  prefs: ReaderPrefs;
  patch: (p: Partial<ReaderPrefs>) => void;
  reset: () => void;
  hydrated: boolean;
} {
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setHydrated(true);
  }, []);

  const patch = useCallback((p: Partial<ReaderPrefs>) => {
    setPrefs(patchPrefsLib(p));
  }, []);

  const reset = useCallback(() => {
    setPrefs(resetPrefsLib());
  }, []);

  return { prefs, patch, reset, hydrated };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useReaderPrefs.ts
git commit -m "feat(reader): useReaderPrefs hook (SSR-safe hydration)"
```

---

### Task 6: ReaderShell 占位空壳

**Files:** Create `app/read/_reader/ReaderShell.tsx`

- [ ] **Step 1: 实现 shell（仅显示占位 + 应用 prefs）**

```tsx
'use client';

import { useReaderPrefs } from './hooks/useReaderPrefs';
import styles from './reader.module.css';

export function ReaderShell({ ids }: { ids: string[] | undefined }) {
  const { prefs, hydrated } = useReaderPrefs();

  if (!hydrated) {
    // 防止服务端/客户端首屏闪烁，先用默认 charcoal
  }

  return (
    <div
      className={`${styles.shell} ${styles[`theme-${prefs.theme}`]}`}
      data-font={prefs.font}
      style={{
        ['--rd-font-size' as never]: `${prefs.fontSize}px`,
        ['--rd-line-height' as never]: prefs.lineHeight,
      }}
    >
      <main
        className={styles.column}
        data-width={prefs.width}
        data-indent={prefs.indent ? 'true' : 'false'}
      >
        <h1>Reader Skeleton</h1>
        <p>
          这是一个占位空壳。后续 phase 会接入 Markdown 渲染、抽屉、附加层等功能。
          当前 ids = <code>{JSON.stringify(ids)}</code>。
        </p>
        <p>
          这是第二段，用来验证段落首行缩进 ({prefs.indent ? '开' : '关'})、
          字号 ({prefs.fontSize}px) 与行距 ({prefs.lineHeight}) 是否正确生效。
        </p>
        <blockquote>引用样式：左侧铜金细线 + 浅米色字。</blockquote>
        <hr />
        <p>
          上方分隔线应渲染为居中三个 <code>·</code> 而非横线。
        </p>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/ReaderShell.tsx
git commit -m "feat(reader): ReaderShell skeleton with prefs integration"
```

---

### Task 7: 替换 `/read` 路由为新壳

**Files:** Rewrite `app/read/[[...ids]]/page.tsx`

- [ ] **Step 1: 备份旧文件（在 git 历史里有，无需手动备份）**

```bash
git log -1 --oneline app/read/\[\[\.\.\.ids\]\]/page.tsx
```
确认有 commit 历史。

- [ ] **Step 2: 完全重写为薄壳**

```tsx
'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ReaderShell } from '../_reader/ReaderShell';

function ReaderPageInner() {
  const params = useParams();
  const ids = params.ids as string[] | undefined;
  return <ReaderShell ids={ids} />;
}

export default function ReaderPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0f0f10',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span aria-hidden style={{ animation: 'spin 1s linear infinite' }}>
            ⟳
          </span>
        </div>
      }
    >
      <ReaderPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: 跑 build 确认无 TS 错误**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds (warnings 可以有，errors 不行)。

- [ ] **Step 4: 启动 dev 服务器并手动验证**

```bash
npm run restart
```
然后浏览器访问 `http://localhost:3000/read`，应看到深炭黑页面 + "Reader Skeleton" 标题 + 段落 + 引用 + 分隔线（三个点）。

- [ ] **Step 5: Commit**

```bash
git add app/read/\[\[\.\.\.ids\]\]/page.tsx
git commit -m "refactor(reader): replace old /read with ReaderShell skeleton"
```

---

### Task 8: 验收 phase-1

- [ ] **Step 1: 跑完整测试套件**

```bash
npm test
```
Expected: prefs 8 passed.

- [ ] **Step 2: 跑 lint**

```bash
npm run lint
```
Expected: 0 errors。Warnings 在新文件内可以接受。

- [ ] **Step 3: 浏览器三档窗口手动验证**

```bash
npm run restart
```
- 桌面 1280×800: 720px 居中
- iPad 模拟 768×1024: 居中（同桌面）
- 手机模拟 375×667: 全宽 + 16px padding

- [ ] **Step 4: 标记 phase-1 完成**

```bash
git tag reader/phase-1-skeleton
```

---

## Phase-1 验收标准

- [ ] `/read` 加载新壳，背景深炭黑 #0f0f10
- [ ] 720px 居中容器、字号 17px、行距 1.95
- [ ] 段落首行缩进默认开启
- [ ] 分隔线显示为居中三个 `·`
- [ ] 引用块左侧铜金细线
- [ ] 三端宽度断点正确（手机全宽）
- [ ] localStorage prefs 单测 8 个全 pass
- [ ] 旧 `/editor` 不受影响（开 `/editor/<某 id>` 仍正常）
- [ ] `npm run build` 无 error
