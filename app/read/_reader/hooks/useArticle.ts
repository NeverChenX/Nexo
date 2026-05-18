'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface ArticleData {
  content: string;
  path: string;
  id: string;
  idChain: string;
  isFolder?: boolean;
}

export interface UseArticleResult {
  data: ArticleData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useArticle(ids: string[] | undefined): UseArticleResult {
  const [data, setData] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(() => !!ids && ids.length > 0);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  // Stabilise dep — `ids` array reference may change every render of the page,
  // but the actual route segments are what matter. Without this, `load` is
  // recreated each render and the effect refires, causing repeated fetches
  // and the visible flicker on entry.
  const idsKey = ids && ids.length > 0 ? ids.join('/') : '';

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
    if (!idsKey) {
      setData(null);
      setLoading(false);
      return;
    }
    const segs = idsKey.split('/');
    const last = segs[segs.length - 1];
    if (/^[a-z0-9]{6,16}$/.test(last)) {
      void fetchByQuery(`id=${encodeURIComponent(last)}`);
    } else {
      const decoded = segs.map((s) => decodeURIComponent(s)).join('/').replace(/\.md$/, '');
      void fetchByQuery(`path=${encodeURIComponent(decoded)}`);
    }
  }, [idsKey, fetchByQuery]);

  useEffect(load, [load]);

  return { data, loading, error, reload: load };
}
