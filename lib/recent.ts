'use client';

export interface RecentItem {
  path: string;
  title: string;
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

export function addRecentDoc(path: string, title: string) {
  if (typeof window === 'undefined') return;
  const items = getRecentDocs().filter((i) => i.path !== path);
  items.unshift({ path, title, timestamp: Date.now() });
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
