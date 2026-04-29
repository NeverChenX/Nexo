'use client';

import { useEffect, useState } from 'react';
import {
  resolveChapterNav,
  type ArticleNode,
  type ChapterNavResult,
} from '@/lib/reader/chapter-nav';

let cache: ArticleNode[] | null = null;
let cachePromise: Promise<ArticleNode[]> | null = null;

async function loadAll(): Promise<ArticleNode[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = fetch('/api/articles/list')
    .then((r) => r.json())
    .then((j) => {
      const data = (j?.data || []) as ArticleNode[];
      cache = data;
      return data;
    })
    .finally(() => {
      cachePromise = null;
    });
  return cachePromise;
}

export function invalidateChapterNavCache(): void {
  cache = null;
}

export function useChapterNav(
  currentId: string | undefined,
  override?: { prev?: string; next?: string },
): ChapterNavResult {
  const [result, setResult] = useState<ChapterNavResult>({});
  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    loadAll().then((all) => {
      const cur = all.find((n) => n.id === currentId);
      if (!cur) return;
      if (!cancelled) setResult(resolveChapterNav(cur, all, override));
    });
    return () => {
      cancelled = true;
    };
  }, [currentId, override?.prev, override?.next]);
  return result;
}
