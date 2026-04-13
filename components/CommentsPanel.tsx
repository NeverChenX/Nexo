'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Trash2, Send } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

interface CommentsPanelProps {
  articlePath: string;
}

export function CommentsPanel({ articlePath }: CommentsPanelProps) {
  const { t } = useI18n();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!articlePath) { setComments([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/comments?path=${encodeURIComponent(articlePath)}`);
        const json = await res.json();
        if (!cancelled && json.ok) setComments(json.data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [articlePath]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: articlePath, text: text.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setComments((prev) => [...prev, json.data]);
        setText('');
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/comments?path=${encodeURIComponent(articlePath)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) setComments((prev) => prev.filter((c) => c.id !== id));
    } catch { /* ignore */ }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return ''; }
  };

  return (
    <div style={{ marginTop: '24px' }}>
      <button
        onClick={() => { setExpanded(!expanded); if (!expanded) setTimeout(() => inputRef.current?.focus(), 100); }}
        className="flex items-center gap-1.5"
        style={{ fontSize: '11px', fontWeight: 500, color: 'var(--c-texTer)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      >
        <MessageSquare className="h-3 w-3" />
        {t('comments.title')} {comments.length > 0 && `(${comments.length})`}
      </button>

      {expanded && (
        <div style={{ marginTop: '8px' }}>
          {/* 已有备注 */}
          {comments.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--c-texDis)', marginBottom: '8px' }}>{t('comments.empty')}</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="group flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '13px', color: 'var(--c-texPri)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.text}</p>
                <span style={{ fontSize: '11px', color: 'var(--c-texDis)' }}>{formatDate(c.createdAt)}</span>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="nx-hoverable-danger p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: 'var(--c-icoSec)' }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* 输入框 */}
          <div className="flex items-center gap-1.5 mt-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder={t('comments.placeholder')}
              className="flex-1 text-xs bg-transparent outline-none px-2 py-1.5 rounded"
              style={{ border: '1px solid var(--c-borPri)', color: 'var(--c-texPri)' }}
            />
            <button
              onClick={handleAdd}
              disabled={!text.trim()}
              className="p-1 rounded disabled:opacity-30"
              style={{ color: 'var(--nx-blue)' }}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
