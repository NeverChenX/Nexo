'use client';

import { useEffect, useMemo, useState } from 'react';
import { listNotes } from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { Note } from '@/lib/reader/types';

interface Props {
  onSelect: (idChain: string) => void;
}
type Group = 'time' | 'article';

export function NotesTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [notes, setNotes] = useState<Note[]>([]);
  const [group, setGroup] = useState<Group>('time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listNotes()
      .then((arr) => {
        if (cancelled) return;
        setNotes([...arr].sort((a, b) => b.updatedAt - a.updatedAt));
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

  const grouped = useMemo<{ key: string; items: Note[] }[]>(() => {
    if (group === 'time') return [{ key: '__all__', items: notes }];
    const m = new Map<string, Note[]>();
    notes.forEach((n) => {
      const arr = m.get(n.articleId) || [];
      arr.push(n);
      m.set(n.articleId, arr);
    });
    return Array.from(m.entries()).map(([k, items]) => ({ key: k, items }));
  }, [notes, group]);

  if (loading) return <p className="rd-lib__empty">加载中…</p>;
  if (notes.length === 0) {
    return (
      <p className="rd-lib__empty">
        还没有笔记。在文章中选中文字 → 点「笔记」。
      </p>
    );
  }

  return (
    <div>
      <div className="rd-lib__subtabs">
        <button
          type="button"
          className={group === 'time' ? 'active' : ''}
          onClick={() => setGroup('time')}
        >
          按时间
        </button>
        <button
          type="button"
          className={group === 'article' ? 'active' : ''}
          onClick={() => setGroup('article')}
        >
          按文章
        </button>
      </div>
      <ul className="rd-note-list">
        {grouped.map((g) => {
          const a = group === 'article' ? byId.get(g.key) : undefined;
          return (
            <li key={g.key}>
              {group === 'article' && a && (
                <h4 className="rd-note-list__group">
                  <span>{a.parentPath || '根目录'}</span>
                  {' / '}
                  <span>{a.title}</span>
                </h4>
              )}
              <ul className="rd-note-list__items">
                {g.items.map((n) => {
                  const article = byId.get(n.articleId);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="rd-note-row"
                        onClick={() => article && onSelect(article.idChain)}
                      >
                        <blockquote className="rd-note-row__quote">
                          {n.anchor.quote}
                        </blockquote>
                        <p className="rd-note-row__text">{n.text}</p>
                        <div className="rd-note-row__meta">
                          {article && <span>{article.title}</span>}
                          <span>{new Date(n.updatedAt).toLocaleString()}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
