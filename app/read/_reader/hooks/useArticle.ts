'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface ArticleData {
  content: string;
  path: string;
  id: string;
  idChain: string;
}

export interface UseArticleResult {
  data: ArticleData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useArticle(ids: string[] | undefined): UseArticleResult {
  const [data, setData] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  const fetchByQuery = useCallback(async (query: string) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles?${query}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: ArticleData;
        error?: string;
      };
      if (seq !== seqRef.current) return;
      if (json.ok && json.data) {
        setData(json.data);
        if (json.data.idChain) {
          window.history.replaceState(null, '', `/read/${json.data.idChain}`);
        }
      } else {
        setError(json.error || 'Failed to load article');
      }
    } catch {
      if (seq === seqRef.current) setError('Network error');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  const load = useCallback(() => {
    if (!ids || ids.length === 0) {
      setData(null);
      return;
    }
    const last = ids[ids.length - 1];
    if (/^[a-z0-9]{6,16}$/.test(last)) {
      void fetchByQuery(`id=${encodeURIComponent(last)}`);
    } else {
      const decoded = ids.map((s) => decodeURIComponent(s)).join('/').replace(/\.md$/, '');
      void fetchByQuery(`path=${encodeURIComponent(decoded)}`);
    }
  }, [ids, fetchByQuery]);

  useEffect(load, [load]);

  return { data, loading, error, reload: load };
}
