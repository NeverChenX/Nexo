import type { MarkColor } from './prefs';

export interface Anchor {
  startOffset: number;
  endOffset: number;
  quote: string; // 选区文本，前后各 15 字上下文
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
