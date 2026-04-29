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

interface Item {
  id: string;
  name: string;
  n?: number;
}

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
