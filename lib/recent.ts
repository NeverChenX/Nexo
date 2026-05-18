'use client';

export interface RecentItem {
  path: string;
  title: string;
  idChain?: string;
  timestamp: number;
}

const STORAGE_KEY = 'nexo_recent_docs';
const MAX_ITEMS = 20;

export function getRecentDocs(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentItem[];
  } catch {
    return [];
  }
}

export function addRecentDoc(path: string, title: string, idChain?: string) {
  if (typeof window === 'undefined') return;
  const items = getRecentDocs().filter((i) => i.path !== path);
  items.unshift({ path, title, idChain, timestamp: Date.now() });
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** 删除单条最近访问记录（文档被删除/重命名后调用） */
export function removeRecentDoc(path: string): RecentItem[] {
  if (typeof window === 'undefined') return [];
  const items = getRecentDocs().filter((i) => i.path !== path);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

/** 按现存路径集合裁剪 recent（拿到服务端真实清单后调用，清理脏数据） */
export function pruneRecentDocs(existingPaths: Set<string>): RecentItem[] {
  if (typeof window === 'undefined') return [];
  const items = getRecentDocs().filter((i) => existingPaths.has(i.path));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}
