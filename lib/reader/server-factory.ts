import * as path from 'node:path';
import { JsonArrayStore, JsonObjectStore, readerDataDir } from './server-store';
import type {
  Mark,
  Note,
  Thought,
  Favorite,
  HistoryEntry,
  Stats,
} from './types';

export const stores = {
  marks: () =>
    new JsonArrayStore<Mark>(path.join(readerDataDir(), 'marks.json')),
  notes: () =>
    new JsonArrayStore<Note>(path.join(readerDataDir(), 'notes.json')),
  thoughts: () =>
    new JsonArrayStore<Thought>(path.join(readerDataDir(), 'thoughts.json')),
  favorites: () =>
    new JsonArrayStore<Favorite & { id: string }>(
      path.join(readerDataDir(), 'favorites.json'),
    ),
  history: () =>
    new JsonArrayStore<HistoryEntry & { id: string }>(
      path.join(readerDataDir(), 'history.json'),
    ),
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
