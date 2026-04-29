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

async function withLock<T>(
  absPath: string,
  fn: () => Promise<T>,
  initial: string = '[]',
): Promise<T> {
  await ensureFile(absPath, initial);
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
  constructor(
    private absPath: string,
    private defaultValue: T,
  ) {}

  async get(): Promise<T> {
    return readJson<T>(this.absPath, this.defaultValue);
  }

  async set(value: T): Promise<T> {
    await ensureFile(this.absPath, '{}');
    const release = await lockfile.lock(this.absPath, {
      retries: 5,
      stale: 5000,
    });
    try {
      await writeJson(this.absPath, value);
      return value;
    } finally {
      await release();
    }
  }

  async patch(patch: Partial<T>): Promise<T> {
    await ensureFile(this.absPath, '{}');
    const release = await lockfile.lock(this.absPath, {
      retries: 5,
      stale: 5000,
    });
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
