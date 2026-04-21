'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link2, X, ArrowRightFromLine } from 'lucide-react';

interface Match {
  path: string;
  title: string;
  wordCount: number;
  score: number;
  matched: string[];
}

interface SmartLinkSuggestionsProps {
  articlePath: string;
  content: string;
  /** 插入链接到编辑器（父组件实际操作） */
  onInsertLink: (path: string, title: string) => void;
}

/**
 * 智能双链建议浮条：
 * - 编辑器底部显示 3-5 个相关文档
 * - 用户可点击插入，或关闭隐藏
 * - 内容每变化 >500 字重新计算（节流 3s）
 */
export function SmartLinkSuggestions({ articlePath, content, onInsertLink }: SmartLinkSuggestionsProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastLenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 文档切换时重置
  useEffect(() => {
    setHidden(false);
    setMinimized(false);
    setMatches([]);
    lastLenRef.current = 0;
  }, [articlePath]);

  const fetchMatches = useCallback(async () => {
    if (!articlePath) return;
    try {
      const res = await fetch('/api/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, excludePath: articlePath, topK: 5 }),
      });
      const json = await res.json();
      if (json.ok) setMatches(json.data.matches || []);
    } catch { /* ignore */ }
  }, [articlePath, content]);

  useEffect(() => {
    if (hidden) return;
    const len = content.replace(/\s/g, '').length;
    if (len < 200) return;
    if (Math.abs(len - lastLenRef.current) < 500) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastLenRef.current = len;
      fetchMatches();
    }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content, fetchMatches, hidden]);

  if (hidden || matches.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '620px',
        width: 'calc(100% - 48px)',
        background: 'var(--c-bacPri)',
        border: '1px solid var(--c-borPri)',
        borderRadius: '10px',
        boxShadow: 'var(--c-shaOutMd)',
        zIndex: 130,
        padding: minimized ? '6px 12px' : '10px 14px',
        fontSize: '12px',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: minimized ? 0 : '8px' }}>
        <div className="flex items-center gap-1.5">
          <Link2 size={12} style={{ color: '#8b5cf6' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-texPri)' }}>相关文档推荐</span>
          <span style={{ fontSize: '10px', color: 'var(--c-texDis)' }}>（基于关键词匹配）</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized((v) => !v)}
            aria-label={minimized ? '展开' : '收起'}
            className="nx-hoverable rounded p-0.5"
            style={{ color: 'var(--c-icoSec)', fontSize: '10px' }}
          >
            {minimized ? '▲' : '▼'}
          </button>
          <button
            onClick={() => setHidden(true)}
            aria-label="关闭"
            className="nx-hoverable rounded p-0.5"
            style={{ color: 'var(--c-icoSec)' }}
          >
            <X size={11} />
          </button>
        </div>
      </div>
      {!minimized && (
        <div className="flex flex-wrap gap-1.5">
          {matches.map((m) => (
            <button
              key={m.path}
              onClick={() => onInsertLink(m.path, m.title)}
              title={`插入 [[${m.path}]] · 匹配: ${m.matched.slice(0, 3).join(', ')}`}
              className="nx-hoverable inline-flex items-center gap-1"
              style={{
                fontSize: '11px', padding: '3px 8px',
                background: 'var(--c-bacTer)',
                color: 'var(--c-texSec)',
                border: '1px solid var(--c-borSec)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <ArrowRightFromLine size={10} />
              {m.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
