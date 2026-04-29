# Phase 5 · 附加层后端 (`/api/reader/*`)

**Goal:** 6 类读书痕迹（marks/notes/thoughts/favorites/history/stats）落地为 `wiki-data/_reader/*.json`，6 条 API 路由 CRUD 通过测试。

**Depends on:** Phase 1, 2, 3, 4 完成。

**Architecture:** 通用 `JsonStore<T>` 工具用 `proper-lockfile` 抢锁防并发写。每条记录有 `id`，按数组存（marks/notes/thoughts/favorites/history）；stats 是单对象。所有路由用统一的 `withApiAuth` 包装（沿用现有 `lib/api-auth.ts`）。

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 安装 | `proper-lockfile@^4` | 文件锁 |
| 创建 | `wiki-data/_reader/.gitkeep` | 占位（数据目录） |
| 创建 | `lib/reader/types.ts` | 共用类型（前后端共用） |
| 创建 | `lib/reader/server-store.ts` | 服务端 JSON store + 文件锁 |
| 创建 | `lib/reader/__tests__/server-store.test.ts` | 单测（用临时目录） |
| 创建 | `lib/reader/storage-client.ts` (覆盖 phase-3 mock) | 真 fetch 客户端 |
| 创建 | `app/api/reader/marks/route.ts` | GET/POST |
| 创建 | `app/api/reader/marks/[id]/route.ts` | PATCH/DELETE |
| 创建 | `app/api/reader/notes/route.ts` |  |
| 创建 | `app/api/reader/notes/[id]/route.ts` |  |
| 创建 | `app/api/reader/thoughts/route.ts` |  |
| 创建 | `app/api/reader/thoughts/[id]/route.ts` |  |
| 创建 | `app/api/reader/favorites/route.ts` | GET/POST/DELETE |
| 创建 | `app/api/reader/history/route.ts` | GET/POST(upsert) |
| 创建 | `app/api/reader/stats/route.ts` | GET |
| 创建 | `app/api/reader/stats/heartbeat/route.ts` | POST |
| 创建 | `app/api/reader/export/route.ts` | GET (zip) |
| 创建 | `app/api/reader/import/route.ts` | POST (zip) |

---

### Task 1: 安装 proper-lockfile + adm-zip

- [ ] **Step 1: install**

```bash
npm i proper-lockfile@^4 adm-zip@^0.5
npm i -D @types/proper-lockfile @types/adm-zip
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(reader): add proper-lockfile + adm-zip for backend store/export"
```

---

### Task 2: `lib/reader/types.ts`

**Files:** Create `lib/reader/types.ts`

- [ ] **Step 1: 实现**

```ts
import type { MarkColor } from './prefs';

export interface Anchor {
  startOffset: number;
  endOffset: number;
  quote: string;     // 选区文本，前后各 15 字上下文
}

export interface Mark {
  id: string;
  articleId: string;
  anchor: Anchor;
  color: MarkColor;
  createdAt: number;
}

export interface Note {
  id: string;
  articleId: string;
  anchor: Anchor;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface Thought {
  id: string;
  articleId: string;
  anchor: Anchor;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface Favorite {
  articleId: string;
  addedAt: number;
}

export interface HistoryEntry {
  articleId: string;
  lastReadAt: number;
  lastReadProgress: number;
  scrollPos: number;
  completedAt?: number;
  reads: number;
}

export interface Stats {
  dailyMinutes: Record<string, number>;
  articleStats: Record<string, { reads: number; totalMs: number }>;
}

export type ReaderResource =
  | 'marks'
  | 'notes'
  | 'thoughts'
  | 'favorites'
  | 'history'
  | 'stats';
```

- [ ] **Step 2: Commit**

```bash
git add lib/reader/types.ts
git commit -m "feat(reader): shared TypeScript types for reader resources"
```

---

### Task 3: `lib/reader/server-store.ts` (TDD)

**Files:**
- Create: `lib/reader/server-store.ts`
- Test: `lib/reader/__tests__/server-store.test.ts`

#### 接口契约

```ts
export class JsonArrayStore<T extends { id: string }> {
  constructor(absPath: string);
  list(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  insert(item: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
  filter(predicate: (item: T) => boolean): Promise<T[]>;
  replaceAll(items: T[]): Promise<void>;
}

export class JsonObjectStore<T> {
  constructor(absPath: string, defaultValue: T);
  get(): Promise<T>;
  set(value: T): Promise<T>;
  patch(patch: Partial<T>): Promise<T>;
}

export function readerDataDir(): string;     // wiki-data/_reader
export function ensureReaderDataDir(): Promise<void>;
```

- [ ] **Step 1: 写测试**

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { JsonArrayStore, JsonObjectStore } from '../server-store';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const tmpDir = path.join(os.tmpdir(), `rd-store-${Date.now()}`);

beforeEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

interface Item { id: string; name: string; n?: number }

describe('JsonArrayStore', () => {
  it('returns empty array when file missing', async () => {
    const s = new JsonArrayStore<Item>(path.join(tmpDir, 'a.json'));
    expect(await s.list()).toEqual([]);
  });

  it('insert + list round-trip', async () => {
    const s = new JsonArrayStore<Item>(path.join(tmpDir, 'a.json'));
    await s.insert({ id: '1', name: 'a' });
    await s.insert({ id: '2', name: 'b' });
    expect(await s.list()).toEqual([
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ]);
  });

  it('insert rejects duplicate id', async () => {
    const s = new JsonArrayStore<Item>(path.join(tmpDir, 'a.json'));
    await s.insert({ id: 'x', name: 'a' });
    await expect(s.insert({ id: 'x', name: 'a' })).rejects.toThrow(/duplicate/i);
  });

  it('update merges patch', async () => {
    const s = new JsonArrayStore<Item>(path.join(tmpDir, 'a.json'));
    await s.insert({ id: '1', name: 'a', n: 1 });
    const r = await s.update('1', { n: 99 });
    expect(r).toEqual({ id: '1', name: 'a', n: 99 });
    expect((await s.list())[0].n).toBe(99);
  });

  it('update returns null for missing id', async () => {
    const s = new JsonArrayStore<Item>(path.join(tmpDir, 'a.json'));
    expect(await s.update('z', { name: 'x' })).toBeNull();
  });

  it('remove returns boolean and persists', async () => {
    const s = new JsonArrayStore<Item>(path.join(tmpDir, 'a.json'));
    await s.insert({ id: '1', name: 'a' });
    expect(await s.remove('1')).toBe(true);
    expect(await s.remove('1')).toBe(false);
    expect(await s.list()).toEqual([]);
  });

  it('filter does not mutate', async () => {
    const s = new JsonArrayStore<Item>(path.join(tmpDir, 'a.json'));
    await s.insert({ id: '1', name: 'a' });
    await s.insert({ id: '2', name: 'b' });
    const out = await s.filter((i) => i.name === 'b');
    expect(out).toEqual([{ id: '2', name: 'b' }]);
    expect((await s.list()).length).toBe(2);
  });

  it('replaceAll overwrites', async () => {
    const s = new JsonArrayStore<Item>(path.join(tmpDir, 'a.json'));
    await s.insert({ id: '1', name: 'a' });
    await s.replaceAll([{ id: 'z', name: 'z' }]);
    expect(await s.list()).toEqual([{ id: 'z', name: 'z' }]);
  });
});

describe('JsonObjectStore', () => {
  it('get returns default when missing', async () => {
    const s = new JsonObjectStore(path.join(tmpDir, 'o.json'), { count: 0 });
    expect(await s.get()).toEqual({ count: 0 });
  });

  it('set + get round-trip', async () => {
    const s = new JsonObjectStore(path.join(tmpDir, 'o.json'), { count: 0 });
    await s.set({ count: 5 });
    expect(await s.get()).toEqual({ count: 5 });
  });

  it('patch merges', async () => {
    const s = new JsonObjectStore(path.join(tmpDir, 'o.json'), {
      count: 0,
      tag: 'x',
    });
    await s.set({ count: 1, tag: 'y' });
    const r = await s.patch({ count: 2 });
    expect(r).toEqual({ count: 2, tag: 'y' });
  });
});
```

- [ ] **Step 2: 跑确认 fail**

```bash
npm test -- server-store
```

- [ ] **Step 3: 实现**

```ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import lockfile from 'proper-lockfile';

export function readerDataDir(): string {
  // 项目根目录假设为 cwd（Next.js 默认）
  return path.join(process.cwd(), 'wiki-data', '_reader');
}

export async function ensureReaderDataDir(): Promise<void> {
  await fs.mkdir(readerDataDir(), { recursive: true });
}

async function ensureFile(absPath: string, initial: string): Promise<void> {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  try {
    await fs.access(absPath);
  } catch {
    await fs.writeFile(absPath, initial, 'utf8');
  }
}

async function readJson<T>(absPath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    if (e instanceof SyntaxError) return fallback;
    throw e;
  }
}

async function writeJson(absPath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  const tmp = `${absPath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, absPath);
}

async function withLock<T>(absPath: string, fn: () => Promise<T>): Promise<T> {
  await ensureFile(absPath, '[]');
  const release = await lockfile.lock(absPath, {
    retries: { retries: 5, factor: 1.4, minTimeout: 30, maxTimeout: 300 },
    stale: 5000,
  });
  try {
    return await fn();
  } finally {
    await release();
  }
}

export class JsonArrayStore<T extends { id: string }> {
  constructor(private absPath: string) {}

  async list(): Promise<T[]> {
    return readJson<T[]>(this.absPath, []);
  }

  async findById(id: string): Promise<T | null> {
    const all = await this.list();
    return all.find((x) => x.id === id) ?? null;
  }

  async insert(item: T): Promise<T> {
    return withLock(this.absPath, async () => {
      const all = await readJson<T[]>(this.absPath, []);
      if (all.some((x) => x.id === item.id)) {
        throw new Error(`duplicate id: ${item.id}`);
      }
      all.push(item);
      await writeJson(this.absPath, all);
      return item;
    });
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    return withLock(this.absPath, async () => {
      const all = await readJson<T[]>(this.absPath, []);
      const idx = all.findIndex((x) => x.id === id);
      if (idx < 0) return null;
      const next = { ...all[idx], ...patch, id } as T;
      all[idx] = next;
      await writeJson(this.absPath, all);
      return next;
    });
  }

  async remove(id: string): Promise<boolean> {
    return withLock(this.absPath, async () => {
      const all = await readJson<T[]>(this.absPath, []);
      const idx = all.findIndex((x) => x.id === id);
      if (idx < 0) return false;
      all.splice(idx, 1);
      await writeJson(this.absPath, all);
      return true;
    });
  }

  async filter(pred: (item: T) => boolean): Promise<T[]> {
    return (await this.list()).filter(pred);
  }

  async replaceAll(items: T[]): Promise<void> {
    return withLock(this.absPath, async () => {
      await writeJson(this.absPath, items);
    });
  }
}

export class JsonObjectStore<T> {
  constructor(private absPath: string, private defaultValue: T) {}

  async get(): Promise<T> {
    return readJson<T>(this.absPath, this.defaultValue);
  }

  async set(value: T): Promise<T> {
    await ensureFile(this.absPath, '{}');
    const release = await lockfile.lock(this.absPath, { retries: 5, stale: 5000 });
    try {
      await writeJson(this.absPath, value);
      return value;
    } finally {
      await release();
    }
  }

  async patch(patch: Partial<T>): Promise<T> {
    await ensureFile(this.absPath, '{}');
    const release = await lockfile.lock(this.absPath, { retries: 5, stale: 5000 });
    try {
      const cur = await readJson<T>(this.absPath, this.defaultValue);
      const next = { ...cur, ...patch };
      await writeJson(this.absPath, next);
      return next;
    } finally {
      await release();
    }
  }
}
```

- [ ] **Step 4: 测试通过**

```bash
npm test -- server-store
```
Expected: 11 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/reader/server-store.ts lib/reader/__tests__/server-store.test.ts
git commit -m "feat(reader): JsonArrayStore + JsonObjectStore with proper-lockfile (TDD)"
```

---

### Task 4: 通用工厂 + 路由模板

**Files:** Create `lib/reader/server-factory.ts`

- [ ] **Step 1: 实现 helper（让 6 个路由文件少重复）**

```ts
import * as path from 'node:path';
import { JsonArrayStore, JsonObjectStore, readerDataDir } from './server-store';
import type { Mark, Note, Thought, Favorite, HistoryEntry, Stats } from './types';

export const stores = {
  marks: () => new JsonArrayStore<Mark>(path.join(readerDataDir(), 'marks.json')),
  notes: () => new JsonArrayStore<Note>(path.join(readerDataDir(), 'notes.json')),
  thoughts: () => new JsonArrayStore<Thought>(path.join(readerDataDir(), 'thoughts.json')),
  favorites: () =>
    new JsonArrayStore<Favorite & { id: string }>(path.join(readerDataDir(), 'favorites.json')),
  history: () =>
    new JsonArrayStore<HistoryEntry & { id: string }>(path.join(readerDataDir(), 'history.json')),
  stats: () =>
    new JsonObjectStore<Stats>(path.join(readerDataDir(), 'stats.json'), {
      dailyMinutes: {},
      articleStats: {},
    }),
};

export function favKey(articleId: string): string {
  return `fav:${articleId}`;
}
export function histKey(articleId: string): string {
  return `hist:${articleId}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/reader/server-factory.ts
git commit -m "feat(reader): server-factory with per-resource store accessors"
```

---

### Task 5: marks 路由

**Files:**
- Create: `app/api/reader/marks/route.ts`
- Create: `app/api/reader/marks/[id]/route.ts`

- [ ] **Step 1: list / create**

```ts
// app/api/reader/marks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { stores } from '@/lib/reader/server-factory';
import type { Mark } from '@/lib/reader/types';

export async function GET(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('articleId') || undefined;
  const all = await stores.marks().list();
  const data = articleId ? all.filter((m) => m.articleId === articleId) : all;
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Mark>;
  if (!body.articleId || !body.anchor || !body.color) {
    return NextResponse.json(
      { ok: false, error: 'articleId, anchor, color required' },
      { status: 400 },
    );
  }
  const m: Mark = {
    id: uuidv4(),
    articleId: body.articleId,
    anchor: body.anchor,
    color: body.color,
    createdAt: Date.now(),
  };
  await stores.marks().insert(m);
  return NextResponse.json({ ok: true, data: m });
}
```

- [ ] **Step 2: patch / delete**

```ts
// app/api/reader/marks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

interface Ctx { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const patch = await req.json();
  const r = await stores.marks().update(params.id, patch);
  if (!r) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: r });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const ok = await stores.marks().remove(params.id);
  if (!ok) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: 手动测试**

```bash
npm run build && npm run restart
curl -X POST http://localhost:3000/api/reader/marks \
  -H 'content-type: application/json' \
  -d '{"articleId":"abc123","anchor":{"startOffset":0,"endOffset":5,"quote":"hello"},"color":"yellow"}'
curl http://localhost:3000/api/reader/marks?articleId=abc123
```
Expected: insert success；list 含一条记录；`wiki-data/_reader/marks.json` 文件出现。

- [ ] **Step 4: Commit**

```bash
git add app/api/reader/marks/
git commit -m "feat(reader): /api/reader/marks GET/POST/PATCH/DELETE"
```

---

### Task 6: notes / thoughts 路由

**Files:** 同上结构。

- [ ] **Step 1: notes 路由（POST 时 createdAt = updatedAt = now；PATCH 时 updatedAt = now）**

```ts
// app/api/reader/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { stores } from '@/lib/reader/server-factory';
import type { Note } from '@/lib/reader/types';

export async function GET(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('articleId') || undefined;
  const all = await stores.notes().list();
  const data = articleId ? all.filter((m) => m.articleId === articleId) : all;
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Note>;
  if (!body.articleId || !body.anchor || typeof body.text !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  const now = Date.now();
  const n: Note = {
    id: uuidv4(),
    articleId: body.articleId,
    anchor: body.anchor,
    text: body.text,
    createdAt: now,
    updatedAt: now,
  };
  await stores.notes().insert(n);
  return NextResponse.json({ ok: true, data: n });
}
```

```ts
// app/api/reader/notes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = (await req.json()) as Partial<{ text: string; anchor: unknown }>;
  const r = await stores.notes().update(params.id, {
    ...(patch as object),
    updatedAt: Date.now(),
  });
  if (!r) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: r });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = await stores.notes().remove(params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
```

- [ ] **Step 2: thoughts 路由（同 notes 模板，复制并改 store 与类型即可）**

参考 notes 写 `app/api/reader/thoughts/route.ts` 与 `app/api/reader/thoughts/[id]/route.ts`，把 `notes()` 改为 `thoughts()`，类型 `Note` 改为 `Thought`。

- [ ] **Step 3: Commit**

```bash
git add app/api/reader/notes/ app/api/reader/thoughts/
git commit -m "feat(reader): /api/reader/notes + /api/reader/thoughts CRUD"
```

---

### Task 7: favorites 路由

**Files:** Create `app/api/reader/favorites/route.ts`

> Favorite 用 `id = "fav:<articleId>"` 简化，避免索引扫描。

- [ ] **Step 1: 实现**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { stores, favKey } from '@/lib/reader/server-factory';

export async function GET() {
  const data = await stores.favorites().list();
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const { articleId } = (await req.json()) as { articleId?: string };
  if (!articleId) {
    return NextResponse.json({ ok: false, error: 'articleId required' }, { status: 400 });
  }
  const id = favKey(articleId);
  const exists = await stores.favorites().findById(id);
  if (exists) return NextResponse.json({ ok: true, data: exists });
  const fav = { id, articleId, addedAt: Date.now() };
  await stores.favorites().insert(fav);
  return NextResponse.json({ ok: true, data: fav });
}

export async function DELETE(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('articleId');
  if (!articleId) {
    return NextResponse.json({ ok: false, error: 'articleId required' }, { status: 400 });
  }
  const ok = await stores.favorites().remove(favKey(articleId));
  return NextResponse.json({ ok });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/reader/favorites/
git commit -m "feat(reader): /api/reader/favorites GET/POST/DELETE (idempotent)"
```

---

### Task 8: history 路由（upsert）

**Files:** Create `app/api/reader/history/route.ts`

- [ ] **Step 1: 实现**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { stores, histKey } from '@/lib/reader/server-factory';
import type { HistoryEntry } from '@/lib/reader/types';

export async function GET() {
  const all = await stores.history().list();
  const sorted = [...all].sort((a, b) => b.lastReadAt - a.lastReadAt);
  return NextResponse.json({ ok: true, data: sorted });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<HistoryEntry>;
  if (!body.articleId) {
    return NextResponse.json({ ok: false, error: 'articleId required' }, { status: 400 });
  }
  const id = histKey(body.articleId);
  const existing = await stores.history().findById(id);
  if (existing) {
    const merged = await stores.history().update(id, {
      lastReadAt: body.lastReadAt ?? existing.lastReadAt,
      lastReadProgress: body.lastReadProgress ?? existing.lastReadProgress,
      scrollPos: body.scrollPos ?? existing.scrollPos,
      reads: body.reads ?? existing.reads,
      completedAt: body.completedAt ?? existing.completedAt,
    });
    return NextResponse.json({ ok: true, data: merged });
  }
  const created: HistoryEntry & { id: string } = {
    id,
    articleId: body.articleId,
    lastReadAt: body.lastReadAt ?? Date.now(),
    lastReadProgress: body.lastReadProgress ?? 0,
    scrollPos: body.scrollPos ?? 0,
    reads: body.reads ?? 1,
    completedAt: body.completedAt,
  };
  await stores.history().insert(created);
  return NextResponse.json({ ok: true, data: created });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/reader/history/
git commit -m "feat(reader): /api/reader/history upsert by articleId"
```

---

### Task 9: stats 路由 + 心跳

**Files:**
- Create: `app/api/reader/stats/route.ts`
- Create: `app/api/reader/stats/heartbeat/route.ts`

- [ ] **Step 1: GET stats**

```ts
// app/api/reader/stats/route.ts
import { NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

export async function GET() {
  const data = await stores.stats().get();
  return NextResponse.json({ ok: true, data });
}
```

- [ ] **Step 2: 心跳累加**

```ts
// app/api/reader/stats/heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stores } from '@/lib/reader/server-factory';

export async function POST(req: NextRequest) {
  const { articleId, deltaMs } = (await req.json()) as {
    articleId?: string;
    deltaMs?: number;
  };
  if (!articleId || typeof deltaMs !== 'number' || deltaMs < 0) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const cur = await stores.stats().get();
  const next = {
    ...cur,
    dailyMinutes: {
      ...cur.dailyMinutes,
      [dateKey]: (cur.dailyMinutes[dateKey] || 0) + deltaMs / 60000,
    },
    articleStats: {
      ...cur.articleStats,
      [articleId]: {
        reads: cur.articleStats[articleId]?.reads ?? 0,
        totalMs: (cur.articleStats[articleId]?.totalMs ?? 0) + deltaMs,
      },
    },
  };
  await stores.stats().set(next);
  return NextResponse.json({ ok: true, data: next });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/reader/stats/
git commit -m "feat(reader): /api/reader/stats + heartbeat (per-day minutes accumulator)"
```

---

### Task 10: export / import 路由（可选但简单）

**Files:**
- Create: `app/api/reader/export/route.ts`
- Create: `app/api/reader/import/route.ts`

- [ ] **Step 1: export**

```ts
// app/api/reader/export/route.ts
import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { readerDataDir, ensureReaderDataDir } from '@/lib/reader/server-store';

export async function GET() {
  await ensureReaderDataDir();
  const dir = readerDataDir();
  const zip = new AdmZip();
  const files = ['marks.json', 'notes.json', 'thoughts.json', 'favorites.json', 'history.json', 'stats.json'];
  for (const f of files) {
    const full = path.join(dir, f);
    try {
      const buf = await fs.readFile(full);
      zip.addFile(f, buf);
    } catch {
      zip.addFile(f, Buffer.from(f === 'stats.json' ? '{}' : '[]'));
    }
  }
  const out = zip.toBuffer();
  return new NextResponse(out, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="reader-export-${Date.now()}.zip"`,
    },
  });
}
```

- [ ] **Step 2: import**

```ts
// app/api/reader/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { readerDataDir, ensureReaderDataDir } from '@/lib/reader/server-store';

export async function POST(req: NextRequest) {
  await ensureReaderDataDir();
  const buf = Buffer.from(await req.arrayBuffer());
  const zip = new AdmZip(buf);
  const counts: Record<string, number> = {};
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.endsWith('.json')) continue;
    const dest = path.join(readerDataDir(), path.basename(entry.entryName));
    const text = entry.getData().toString('utf8');
    try {
      const parsed = JSON.parse(text);
      counts[entry.entryName] = Array.isArray(parsed) ? parsed.length : 1;
      await fs.writeFile(dest, text, 'utf8');
    } catch {
      // skip invalid
    }
  }
  return NextResponse.json({ ok: true, counts });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/reader/export/ app/api/reader/import/
git commit -m "feat(reader): export/import zip of all reader data"
```

---

### Task 11: 客户端真 fetch 替换

**Files:** Rewrite `lib/reader/storage-client.ts`

- [ ] **Step 1: 重写为真接口（移除 phase-3 mock）**

```ts
'use client';

import type {
  Mark,
  Note,
  Thought,
  Favorite,
  HistoryEntry,
  Stats,
} from './types';

interface ApiResp<T> { ok: boolean; data?: T; error?: string }

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const json = (await res.json()) as ApiResp<T>;
  if (!json.ok || json.data === undefined) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data;
}

// ---- Marks
export async function listMarks(articleId?: string): Promise<Mark[]> {
  const q = articleId ? `?articleId=${encodeURIComponent(articleId)}` : '';
  return api<Mark[]>(`/api/reader/marks${q}`);
}
export async function createMark(input: Omit<Mark, 'id' | 'createdAt'>): Promise<Mark> {
  return api<Mark>('/api/reader/marks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}
export async function updateMark(id: string, patch: Partial<Mark>): Promise<Mark> {
  return api<Mark>(`/api/reader/marks/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
}
export async function deleteMark(id: string): Promise<void> {
  await fetch(`/api/reader/marks/${id}`, { method: 'DELETE' });
}

// ---- Notes
export async function listNotes(articleId?: string): Promise<Note[]> {
  const q = articleId ? `?articleId=${encodeURIComponent(articleId)}` : '';
  return api<Note[]>(`/api/reader/notes${q}`);
}
export async function createNote(input: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  return api<Note>('/api/reader/notes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}
export async function updateNote(id: string, text: string): Promise<Note> {
  return api<Note>(`/api/reader/notes/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}
export async function deleteNote(id: string): Promise<void> {
  await fetch(`/api/reader/notes/${id}`, { method: 'DELETE' });
}

// ---- Thoughts (mirror notes)
export async function listThoughts(articleId?: string): Promise<Thought[]> {
  const q = articleId ? `?articleId=${encodeURIComponent(articleId)}` : '';
  return api<Thought[]>(`/api/reader/thoughts${q}`);
}
export async function createThought(input: Omit<Thought, 'id' | 'createdAt' | 'updatedAt'>): Promise<Thought> {
  return api<Thought>('/api/reader/thoughts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}
export async function updateThought(id: string, text: string): Promise<Thought> {
  return api<Thought>(`/api/reader/thoughts/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}
export async function deleteThought(id: string): Promise<void> {
  await fetch(`/api/reader/thoughts/${id}`, { method: 'DELETE' });
}

// ---- Favorites
export async function listFavorites(): Promise<Favorite[]> {
  return api<Favorite[]>('/api/reader/favorites');
}
export async function addFavorite(articleId: string): Promise<Favorite> {
  return api<Favorite>('/api/reader/favorites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ articleId }),
  });
}
export async function removeFavorite(articleId: string): Promise<void> {
  await fetch(`/api/reader/favorites?articleId=${encodeURIComponent(articleId)}`, {
    method: 'DELETE',
  });
}

// ---- History (replaces phase-3 mock)
export async function listHistory(): Promise<HistoryEntry[]> {
  return api<HistoryEntry[]>('/api/reader/history');
}
export async function getHistoryEntry(articleId: string): Promise<HistoryEntry | null> {
  const all = await listHistory();
  return all.find((e) => e.articleId === articleId) || null;
}
export async function upsertHistoryEntry(
  articleId: string,
  patch: Partial<Omit<HistoryEntry, 'articleId'>>,
): Promise<HistoryEntry> {
  return api<HistoryEntry>('/api/reader/history', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ articleId, ...patch }),
  });
}

// ---- Stats
export async function getStats(): Promise<Stats> {
  return api<Stats>('/api/reader/stats');
}
export async function sendHeartbeat(articleId: string, deltaMs: number): Promise<void> {
  await fetch('/api/reader/stats/heartbeat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ articleId, deltaMs }),
  });
}

export type { HistoryEntry } from './types';
```

- [ ] **Step 2: Commit**

```bash
git add lib/reader/storage-client.ts
git commit -m "feat(reader): real /api/reader client (replaces phase-3 localStorage mock)"
```

---

### Task 12: 验收 phase-5

- [ ] **Step 1: 跑全部测试**

```bash
npm test
```
Expected: 31 passed (prefs 8 + chapter-nav 7 + reading-time 5 + server-store 11)。

- [ ] **Step 2: 端到端 curl 全部 6 资源**

```bash
npm run build && npm run restart
ART=test-article-id

# marks
curl -s -X POST http://localhost:3000/api/reader/marks \
  -H 'content-type: application/json' \
  -d "{\"articleId\":\"$ART\",\"anchor\":{\"startOffset\":0,\"endOffset\":5,\"quote\":\"hello\"},\"color\":\"yellow\"}" | head -c 200

# favorites
curl -s -X POST http://localhost:3000/api/reader/favorites \
  -H 'content-type: application/json' -d "{\"articleId\":\"$ART\"}" | head -c 200

# history
curl -s -X POST http://localhost:3000/api/reader/history \
  -H 'content-type: application/json' \
  -d "{\"articleId\":\"$ART\",\"lastReadProgress\":0.5,\"scrollPos\":1234}" | head -c 200

# heartbeat
curl -s -X POST http://localhost:3000/api/reader/stats/heartbeat \
  -H 'content-type: application/json' \
  -d "{\"articleId\":\"$ART\",\"deltaMs\":30000}"

# export
curl -s -o /tmp/reader-export.zip http://localhost:3000/api/reader/export
unzip -l /tmp/reader-export.zip
```
Expected: 6 个 json 文件全部出现，favorites 含 1 条，history 含 1 条，stats 有今日 dailyMinutes。

- [ ] **Step 3: 检查文件落地**

```bash
ls -la wiki-data/_reader/
cat wiki-data/_reader/marks.json
cat wiki-data/_reader/stats.json
```

- [ ] **Step 4: tag**

```bash
git tag reader/phase-5-backend
```

---

## Phase-5 验收标准

- [ ] server-store 11 测试 pass
- [ ] 6 个 JSON 文件能创建到 `wiki-data/_reader/`
- [ ] marks/notes/thoughts CRUD 全部走通（curl 验证）
- [ ] favorites 幂等（同一 articleId 重复 POST 不会重复）
- [ ] history upsert 正确（同一 articleId 重复 POST = update）
- [ ] stats heartbeat 累加 dailyMinutes 与 articleStats
- [ ] export zip 含 6 文件
- [ ] import zip 写入正确
- [ ] proper-lockfile 防并发（开 2 个 curl 并发 POST 不损坏文件）
- [ ] storage-client 客户端调用所有路由都成功（DevTools Network 验证）
