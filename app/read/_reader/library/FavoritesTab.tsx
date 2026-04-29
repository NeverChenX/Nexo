'use client';

import { useEffect, useState } from 'react';
import {
  listFavorites,
  listNotes,
  listMarks,
} from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { Favorite } from '@/lib/reader/types';

interface Props {
  onSelect: (idChain: string) => void;
}

interface CountEntry {
  notes: number;
  marks: number;
}

export function FavoritesTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [counts, setCounts] = useState<Record<string, CountEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listFavorites(), listNotes(), listMarks()])
      .then(([fs, ns, ms]) => {
        if (cancelled) return;
        setFavs([...fs].sort((a, b) => b.addedAt - a.addedAt));
        const c: Record<string, CountEntry> = {};
        ns.forEach((n) => {
          if (!c[n.articleId]) c[n.articleId] = { notes: 0, marks: 0 };
          c[n.articleId].notes += 1;
        });
        ms.forEach((m) => {
          if (!c[m.articleId]) c[m.articleId] = { notes: 0, marks: 0 };
          c[m.articleId].marks += 1;
        });
        setCounts(c);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="rd-lib__empty">加载中…</p>;
  }
  if (favs.length === 0) {
    return (
      <p className="rd-lib__empty">
        还没有收藏。点击文章顶部 ★ 收藏当前文章。
      </p>
    );
  }

  return (
    <ul className="rd-card-grid">
      {favs.map((f) => {
        const a = byId.get(f.articleId);
        if (!a) return null;
        const c = counts[f.articleId] || { notes: 0, marks: 0 };
        return (
          <li key={f.articleId}>
            <button
              type="button"
              className="rd-card"
              onClick={() => onSelect(a.idChain)}
            >
              <div className="rd-card__path">{a.parentPath || '根目录'}</div>
              <div className="rd-card__title">{a.title}</div>
              <div className="rd-card__meta">
                <span>★ {new Date(f.addedAt).toLocaleDateString()}</span>
                <span>
                  {c.marks} 划线 · {c.notes} 笔记
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
