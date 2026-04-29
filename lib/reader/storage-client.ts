'use client';

/**
 * Phase-3 mock implementation backed by localStorage.
 * Phase-5 will replace these functions with real API calls; the interface
 * (HistoryEntry shape + function signatures) is intentionally frozen here.
 */

export interface HistoryEntry {
  articleId: string;
  lastReadAt: number;
  lastReadProgress: number; // 0..1
  scrollPos: number;
  completedAt?: number;
  reads: number;
}

const HIST_KEY = 'never-wiki.reader.history';

function readMap(): Record<string, HistoryEntry> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeMap(m: Record<string, HistoryEntry>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(HIST_KEY, JSON.stringify(m));
}

export async function getHistoryEntry(articleId: string): Promise<HistoryEntry | null> {
  return readMap()[articleId] || null;
}

export async function upsertHistoryEntry(
  articleId: string,
  patch: Partial<Omit<HistoryEntry, 'articleId'>>,
): Promise<HistoryEntry> {
  const m = readMap();
  const prev = m[articleId] || {
    articleId,
    lastReadAt: 0,
    lastReadProgress: 0,
    scrollPos: 0,
    reads: 0,
  };
  const next: HistoryEntry = { ...prev, ...patch, articleId };
  m[articleId] = next;
  writeMap(m);
  return next;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  return Object.values(readMap()).sort((a, b) => b.lastReadAt - a.lastReadAt);
}
