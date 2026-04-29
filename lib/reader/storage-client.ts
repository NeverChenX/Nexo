'use client';

import type {
  Mark,
  Note,
  Thought,
  Favorite,
  HistoryEntry,
  Stats,
} from './types';

interface ApiResp<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

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
export async function createMark(
  input: Omit<Mark, 'id' | 'createdAt'>,
): Promise<Mark> {
  return api<Mark>('/api/reader/marks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}
export async function updateMark(
  id: string,
  patch: Partial<Mark>,
): Promise<Mark> {
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
export async function createNote(
  input: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Note> {
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
export async function createThought(
  input: Omit<Thought, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Thought> {
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
  await fetch(
    `/api/reader/favorites?articleId=${encodeURIComponent(articleId)}`,
    {
      method: 'DELETE',
    },
  );
}

// ---- History (replaces phase-3 mock)
export async function listHistory(): Promise<HistoryEntry[]> {
  return api<HistoryEntry[]>('/api/reader/history');
}
export async function getHistoryEntry(
  articleId: string,
): Promise<HistoryEntry | null> {
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
export async function sendHeartbeat(
  articleId: string,
  deltaMs: number,
): Promise<void> {
  await fetch('/api/reader/stats/heartbeat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ articleId, deltaMs }),
  });
}

export type { HistoryEntry } from './types';
