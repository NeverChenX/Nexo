'use client';

import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import {
  listNotes,
  listThoughts,
  listFavorites,
} from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import { useCmdkCommands } from './useCmdkCommands';
import type {
  Result,
  ArticleResult,
  NoteResult,
  ThoughtResult,
  FavoriteResult,
} from './types';

interface DataState {
  notes: NoteResult[];
  thoughts: ThoughtResult[];
  favorites: FavoriteResult[];
}

interface CmdkSearchApi {
  search: (query: string) => Result[];
  groupResults: (results: Result[]) => { category: string; items: Result[] }[];
}

export function useCmdkSearch(currentArticleId?: string): CmdkSearchApi {
  const { articles, byId } = useArticleIndex();
  const commands = useCmdkCommands(currentArticleId);
  const [data, setData] = useState<DataState>({
    notes: [],
    thoughts: [],
    favorites: [],
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([listNotes(), listThoughts(), listFavorites()])
      .then(([ns, ts, fs]) => {
        if (cancelled) return;
        const notes = ns.map<NoteResult>((n) => ({
          id: `note:${n.id}`,
          category: 'note',
          label: n.text,
          hint: byId.get(n.articleId)?.title || n.articleId,
          articleId: n.articleId,
          noteId: n.id,
          anchor: n.anchor,
          keywords: [n.anchor.quote],
        }));
        const thoughts = ts.map<ThoughtResult>((t) => ({
          id: `thought:${t.id}`,
          category: 'thought',
          label: t.text,
          hint: byId.get(t.articleId)?.title || t.articleId,
          articleId: t.articleId,
          thoughtId: t.id,
          anchor: t.anchor,
          keywords: [t.anchor.quote],
        }));
        const favorites = fs.map<FavoriteResult>((f) => {
          const a = byId.get(f.articleId);
          return {
            id: `fav:${f.articleId}`,
            category: 'favorite',
            label: a?.title || f.articleId,
            hint: a?.parentPath,
            idChain: a?.idChain || '',
          };
        });
        setData({ notes, thoughts, favorites });
      })
      .catch(() => {
        // Silently ignore — empty state is acceptable
      });
    return () => {
      cancelled = true;
    };
  }, [byId]);

  const articleResults = useMemo<ArticleResult[]>(
    () =>
      articles.map((a) => ({
        id: `art:${a.id}`,
        category: 'article',
        label: a.title,
        hint: a.parentPath,
        idChain: a.idChain,
      })),
    [articles],
  );

  const all = useMemo<Result[]>(
    () => [
      ...articleResults,
      ...data.notes,
      ...data.thoughts,
      ...data.favorites,
      ...commands,
    ],
    [articleResults, data, commands],
  );

  const fuse = useMemo(
    () =>
      new Fuse(all, {
        keys: ['label', 'hint', 'keywords'],
        threshold: 0.4,
        distance: 200,
        minMatchCharLength: 1,
        includeScore: true,
        ignoreLocation: true,
      }),
    [all],
  );

  function search(query: string): Result[] {
    if (!query.trim()) {
      // 空查询：常用命令 + 收藏 + 文章建议
      return [
        ...commands.slice(0, 5),
        ...data.favorites.slice(0, 5),
        ...articleResults.slice(0, 8),
      ];
    }
    return fuse.search(query, { limit: 30 }).map((r) => r.item);
  }

  function groupResults(
    results: Result[],
  ): { category: string; items: Result[] }[] {
    const order: Result['category'][] = [
      'command',
      'article',
      'favorite',
      'note',
      'thought',
    ];
    const labels: Record<Result['category'], string> = {
      command: '命令',
      article: '文章',
      favorite: '收藏',
      note: '笔记',
      thought: '想法',
    };
    const buckets = new Map<Result['category'], Result[]>();
    for (const r of results) {
      const arr = buckets.get(r.category) || [];
      if (arr.length < 10) arr.push(r);
      buckets.set(r.category, arr);
    }
    return order
      .filter((c) => (buckets.get(c)?.length ?? 0) > 0)
      .map((c) => ({ category: labels[c], items: buckets.get(c) as Result[] }));
  }

  return { search, groupResults };
}
