'use client';

import { useEffect, useMemo, useState } from 'react';
import { listHistory } from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { HistoryEntry } from '@/lib/reader/types';

interface Props {
  onSelect: (idChain: string) => void;
}

function dateKey(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return '今天';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return '昨天';
  return d.toISOString().slice(0, 10);
}

export function HistoryTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listHistory()
      .then((arr) => {
        if (cancelled) return;
        // sort by lastReadAt desc
        setEntries([...arr].sort((a, b) => b.lastReadAt - a.lastReadAt));
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

  const groups = useMemo<[string, HistoryEntry[]][]>(() => {
    const m = new Map<string, HistoryEntry[]>();
    for (const e of entries) {
      const k = dateKey(e.lastReadAt);
      const arr = m.get(k) || [];
      arr.push(e);
      m.set(k, arr);
    }
    return Array.from(m.entries());
  }, [entries]);

  if (loading) return <p className="rd-lib__empty">加载中…</p>;
  if (entries.length === 0) {
    return <p className="rd-lib__empty">还没有阅读历史。</p>;
  }

  return (
    <div className="rd-history">
      {groups.map(([day, items]) => (
        <section key={day}>
          <h4 className="rd-history__day">{day}</h4>
          <ul>
            {items.map((e) => {
              const a = byId.get(e.articleId);
              if (!a) return null;
              const pct = Math.round(e.lastReadProgress * 100);
              const done = !!e.completedAt;
              return (
                <li key={e.articleId}>
                  <button
                    type="button"
                    className="rd-history__row"
                    onClick={() => onSelect(a.idChain)}
                  >
                    <span className="rd-history__title">{a.title}</span>
                    <span
                      className={`rd-history__pct ${done ? 'rd-history__pct--done' : ''}`}
                    >
                      {done ? '✓ 已读完' : `${pct}%`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
