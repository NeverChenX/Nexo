'use client';

import { useEffect, useState } from 'react';
import { listThoughts } from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { Thought } from '@/lib/reader/types';

interface Props {
  onSelect: (idChain: string) => void;
}

export function ThoughtsTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [items, setItems] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listThoughts()
      .then((arr) => {
        if (cancelled) return;
        setItems([...arr].sort((a, b) => b.updatedAt - a.updatedAt));
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

  if (loading) return <p className="rd-lib__empty">加载中…</p>;
  if (items.length === 0) {
    return (
      <p className="rd-lib__empty">
        还没有想法。在文章中选中文字 → 点「想法」。
      </p>
    );
  }

  return (
    <ul className="rd-thought-list">
      {items.map((t) => {
        const a = byId.get(t.articleId);
        return (
          <li key={t.id}>
            <button
              type="button"
              className="rd-thought-row"
              onClick={() => a && onSelect(a.idChain)}
            >
              <blockquote className="rd-thought-row__quote">
                {t.anchor.quote}
              </blockquote>
              <p className="rd-thought-row__text">💭 {t.text}</p>
              <div className="rd-thought-row__meta">
                {a && <span>{a.title}</span>}
                <span>{new Date(t.updatedAt).toLocaleString()}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
