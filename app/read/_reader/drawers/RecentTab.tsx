'use client';

import { useEffect, useState } from 'react';
import { listHistory, type HistoryEntry } from '@/lib/reader/storage-client';
import type { ArticleNode } from '@/lib/reader/chapter-nav';

interface Props {
  onSelect: (idChain: string) => void;
}

export function RecentTab({ onSelect }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [byId, setById] = useState<Map<string, ArticleNode>>(new Map());

  useEffect(() => {
    Promise.all([
      listHistory(),
      fetch('/api/articles/list').then((r) => r.json()),
    ]).then(([hist, j]) => {
      setEntries(hist.slice(0, 30));
      const m = new Map<string, ArticleNode>();
      for (const a of (j?.data || []) as ArticleNode[]) m.set(a.id, a);
      setById(m);
    });
  }, []);

  if (entries.length === 0) {
    return (
      <p style={{ padding: '20px 12px', color: 'var(--rd-text-dim)', fontSize: 12 }}>
        还没有阅读记录。
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {entries.map((e) => {
        const a = byId.get(e.articleId);
        if (!a) return null;
        const pct = Math.round(e.lastReadProgress * 100);
        const done = !!e.completedAt;
        return (
          <li key={e.articleId}>
            <button
              type="button"
              className="rd-recent__row"
              onClick={() => onSelect(a.idChain)}
            >
              <div className="rd-recent__title">{a.title}</div>
              <div className="rd-recent__meta">
                <span>{done ? '✓ 已读完' : `${pct}%`}</span>
                <span>{new Date(e.lastReadAt).toLocaleDateString()}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
