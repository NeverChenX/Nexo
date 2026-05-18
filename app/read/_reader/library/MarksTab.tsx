'use client';

import { useEffect, useMemo, useState } from 'react';
import { listMarks } from '@/lib/reader/storage-client';
import { useArticleIndex } from '../hooks/useArticleIndex';
import type { Mark } from '@/lib/reader/types';

interface Props {
  onSelect: (idChain: string) => void;
}
type Group = 'time' | 'article';

const COLOR_LABEL: Record<Mark['color'], string> = {
  yellow: '重点',
  red: '疑问',
  green: '同意',
  blue: '待复习',
};

const COLOR_BORDER: Record<Mark['color'], string> = {
  yellow: 'var(--rd-mark-yellow)',
  red: 'var(--rd-mark-red)',
  green: 'var(--rd-mark-green)',
  blue: 'var(--rd-mark-blue)',
};

export function MarksTab({ onSelect }: Props) {
  const { byId } = useArticleIndex();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [group, setGroup] = useState<Group>('time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMarks()
      .then((arr) => {
        if (cancelled) return;
        setMarks([...arr].sort((a, b) => b.createdAt - a.createdAt));
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

  const grouped = useMemo<{ key: string; items: Mark[] }[]>(() => {
    if (group === 'time') return [{ key: '__all__', items: marks }];
    const m = new Map<string, Mark[]>();
    marks.forEach((mk) => {
      const arr = m.get(mk.articleId) || [];
      arr.push(mk);
      m.set(mk.articleId, arr);
    });
    return Array.from(m.entries()).map(([k, items]) => ({ key: k, items }));
  }, [marks, group]);

  if (loading) return <p className="rd-lib__empty">加载中…</p>;
  if (marks.length === 0) {
    return (
      <p className="rd-lib__empty">
        还没有划线。在文章中选中文字 → 点「划线」。
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
      <ul className="rd-mark-list">
        {grouped.map((g) => {
          const a = group === 'article' ? byId.get(g.key) : undefined;
          return (
            <li key={g.key}>
              {group === 'article' && a && (
                <h4 className="rd-mark-list__group">
                  <span>{a.parentPath || '根目录'}</span>
                  {' / '}
                  <span>{a.title}</span>
                </h4>
              )}
              <ul className="rd-mark-list__items">
                {g.items.map((m) => {
                  const article = byId.get(m.articleId);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="rd-mark-row"
                        onClick={() => article && onSelect(article.idChain)}
                      >
                        <span
                          className="rd-mark-row__badge"
                          style={{
                            background: COLOR_BORDER[m.color],
                            color: '#000',
                          }}
                        >
                          {COLOR_LABEL[m.color]}
                        </span>
                        <blockquote
                          className="rd-mark-row__quote"
                          style={{ borderLeftColor: COLOR_BORDER[m.color] }}
                        >
                          {m.anchor.selected || m.anchor.quote}
                        </blockquote>
                        <div className="rd-mark-row__meta">
                          {article && <span>{article.title}</span>}
                          <span>{new Date(m.createdAt).toLocaleString()}</span>
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
