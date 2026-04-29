'use client';

import { useEffect, useState } from 'react';
import type { ArticleNode } from '@/lib/reader/chapter-nav';

let cache: ArticleNode[] | null = null;
let cachePromise: Promise<ArticleNode[]> | null = null;

export function invalidateArticleIndex(): void {
  cache = null;
}

async function loadArticles(): Promise<ArticleNode[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = fetch('/api/articles/list')
    .then((r) => r.json())
    .then((j) => {
      const arr = (j?.data || []) as ArticleNode[];
      cache = arr;
      return arr;
    })
    .finally(() => {
      cachePromise = null;
    });
  return cachePromise;
}

export interface ArticleIndex {
  articles: ArticleNode[];
  byId: Map<string, ArticleNode>;
  loading: boolean;
}

export function useArticleIndex(): ArticleIndex {
  const [articles, setArticles] = useState<ArticleNode[]>(cache ?? []);
  const [loading, setLoading] = useState<boolean>(!cache);

  useEffect(() => {
    if (cache) {
      setArticles(cache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadArticles().then((arr) => {
      if (cancelled) return;
      setArticles(arr);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = new Map(articles.map((a) => [a.id, a]));
  return { articles, byId, loading };
}
