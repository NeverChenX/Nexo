'use client';

import { useEffect, useState } from 'react';
import { X, Clock, RotateCcw, FileText } from 'lucide-react';
import { useModalFocus } from '@/lib/useModalFocus';

interface Snapshot {
  timestamp: string;
  size: number;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  articlePath: string;
  onRestored?: () => void;
}

function formatTs(ts: string): string {
  // ts 形如 2026-04-20T15-30-00-123Z
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/);
  if (!m) return ts;
  return `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
}

export function HistoryPanel({ isOpen, onClose, articlePath, onRestored }: HistoryPanelProps) {
  useModalFocus(isOpen);
  const [list, setList] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [restoring, setRestoring] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setList([]);
    setSelected(null);
    setPreview('');
    setErr(null);
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/history?path=${encodeURIComponent(articlePath)}`);
        const json = await res.json();
        if (json.ok) setList(json.data);
        else setErr(json.error || '加载失败');
      } catch (e) {
        setErr(e instanceof Error ? e.message : '加载失败');
      }
      setLoading(false);
    })();
  }, [isOpen, articlePath]);

  const loadPreview = async (ts: string) => {
    setSelected(ts);
    setPreview('');
    try {
      const res = await fetch(`/api/history?path=${encodeURIComponent(articlePath)}&ts=${encodeURIComponent(ts)}`);
      const json = await res.json();
      if (json.ok) setPreview(json.data.content);
    } catch { /* ignore */ }
  };

  const restore = async () => {
    if (!selected) return;
    if (!window.confirm('确定要回滚到此版本？当前版本会自动做一次快照以便再次回滚。')) return;
    setRestoring(true);
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: articlePath, ts: selected }),
      });
      const json = await res.json();
      if (json.ok) {
        onRestored?.();
        onClose();
      } else {
        setErr(json.error || '回滚失败');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '回滚失败');
    }
    setRestoring(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="nx-fadein-fast"
        style={{
          width: '80vw',
          maxWidth: '900px',
          height: '70vh',
          background: 'var(--c-bacPri)',
          borderRadius: '12px',
          boxShadow: 'var(--c-shaOutLg)',
          border: '1px solid var(--c-borPri)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: 'var(--c-icoSec)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--c-texPri)' }}>版本历史</span>
            <span style={{ fontSize: '12px', color: 'var(--c-texTer)' }}>· {articlePath}</span>
          </div>
          <button onClick={onClose} aria-label="关闭" className="nx-hoverable rounded p-1" style={{ color: 'var(--c-icoSec)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧列表 */}
          <div style={{ width: '240px', borderRight: '1px solid var(--c-borSec)', overflowY: 'auto' }}>
            {loading && <div className="p-4 text-sm" style={{ color: 'var(--c-texTer)' }}>加载中...</div>}
            {err && <div className="p-4 text-sm" style={{ color: 'var(--nx-red)' }}>{err}</div>}
            {!loading && !err && list.length === 0 && (
              <div className="p-4 text-sm" style={{ color: 'var(--c-texTer)' }}>暂无历史快照</div>
            )}
            {list.map((s) => (
              <button
                key={s.timestamp}
                onClick={() => loadPreview(s.timestamp)}
                className="nx-hoverable w-full text-left p-3 flex items-start gap-2"
                style={{
                  borderBottom: '1px solid var(--c-borSec)',
                  background: selected === s.timestamp ? 'var(--ca-butHovBac)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--c-texPri)',
                }}
              >
                <FileText size={14} style={{ color: 'var(--c-icoSec)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--c-texPri)' }}>{formatTs(s.timestamp)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--c-texDis)', marginTop: '2px' }}>{(s.size / 1024).toFixed(1)} KB</div>
                </div>
              </button>
            ))}
          </div>

          {/* 右侧预览 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {selected ? (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '13px', lineHeight: 1.6, color: 'var(--c-texPri)', fontFamily: 'ui-monospace, monospace' }}>
                  {preview}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full" style={{ color: 'var(--c-texDis)', fontSize: '13px' }}>
                  从左侧选择一个版本以预览
                </div>
              )}
            </div>
            {selected && (
              <div className="p-3" style={{ borderTop: '1px solid var(--c-borSec)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={restore}
                  disabled={restoring}
                  className="disabled:opacity-40"
                  style={{ padding: '6px 14px', fontSize: '13px', background: 'var(--nx-blue)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={14} />
                  {restoring ? '回滚中...' : '回滚到此版本'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
