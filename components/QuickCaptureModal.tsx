'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Check, Inbox } from 'lucide-react';
import { useModalFocus } from '@/lib/useModalFocus';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured?: (path: string) => void;
}

export function QuickCaptureModal({ isOpen, onClose, onCaptured }: QuickCaptureModalProps) {
  useModalFocus(isOpen);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [target, setTarget] = useState<'quick' | 'item'>('quick');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setContent(''); setTitle(''); setUrl(''); setTags(''); setTarget('quick');
      setSaving(false); setDone(null); setErr(null);
      return;
    }
    const id = window.requestAnimationFrame(() => taRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  const submit = async () => {
    if (!content.trim() && !url.trim()) { setErr('内容或 URL 至少填一个'); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          title: title.trim(),
          url: url.trim(),
          tags: tags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean),
          target,
          kind: 'note',
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setDone(json.data.path);
        onCaptured?.(json.data.path);
        setTimeout(onClose, 800);
      } else {
        setErr(json.error || '保存失败');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '网络错误');
    }
    setSaving(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh]" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose}>
      <div
        className="nx-fadein-fast"
        style={{
          width: '92%', maxWidth: '560px',
          background: 'var(--c-bacPri)', borderRadius: '10px',
          boxShadow: 'var(--c-shaOutLg)', border: '1px solid var(--c-borPri)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
          <div className="flex items-center gap-2">
            <Inbox size={14} style={{ color: 'var(--c-icoSec)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--c-texPri)' }}>快速采集</span>
            <span style={{ fontSize: '11px', color: 'var(--c-texDis)' }}>Cmd/Ctrl+Enter 保存 · Esc 关闭</span>
          </div>
          <button onClick={onClose} aria-label="关闭" className="nx-hoverable rounded p-1" style={{ color: 'var(--c-icoSec)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            ref={taRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写点什么，或粘贴内容…"
            rows={6}
            style={{
              width: '100%', resize: 'vertical', minHeight: '120px',
              padding: '10px 12px', fontSize: '14px', lineHeight: 1.6,
              color: 'var(--c-texPri)', background: 'var(--c-bacPri)',
              border: '1px solid var(--c-borPri)', borderRadius: '6px', outline: 'none',
            }}
          />
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题（可选）"
              style={{ flex: 1, padding: '6px 10px', fontSize: '13px', color: 'var(--c-texPri)', background: 'var(--c-bacPri)', border: '1px solid var(--c-borPri)', borderRadius: '6px', outline: 'none' }}
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL（可选）"
              style={{ flex: 1, padding: '6px 10px', fontSize: '13px', color: 'var(--c-texPri)', background: 'var(--c-bacPri)', border: '1px solid var(--c-borPri)', borderRadius: '6px', outline: 'none' }}
            />
          </div>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签（用空格或逗号分隔，可选）"
            style={{ width: '100%', padding: '6px 10px', fontSize: '13px', color: 'var(--c-texPri)', background: 'var(--c-bacPri)', border: '1px solid var(--c-borPri)', borderRadius: '6px', outline: 'none' }}
          />
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '12px', color: 'var(--c-texTer)' }}>存储:</span>
            {(['quick', 'item'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTarget(mode)}
                style={{
                  padding: '4px 10px', fontSize: '12px',
                  border: `1px solid ${target === mode ? 'var(--nx-blue)' : 'var(--c-borPri)'}`,
                  background: target === mode ? 'var(--nx-badge-bg)' : 'var(--c-bacPri)',
                  color: target === mode ? 'var(--nx-blue)' : 'var(--c-texSec)',
                  borderRadius: '4px', cursor: 'pointer',
                }}
              >
                {mode === 'quick' ? '追加到当日快速笔记' : '独立文档'}
              </button>
            ))}
          </div>
          {err && <p style={{ fontSize: '12px', color: 'var(--nx-red)' }}>{err}</p>}
          {done && (
            <div className="flex items-center gap-2" style={{ fontSize: '12px', color: 'var(--nx-green)' }}>
              <Check size={14} /> 已保存到 {done}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="nx-hoverable"
            style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--c-texSec)', background: 'var(--c-bacTer)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={saving || (!content.trim() && !url.trim())}
            className="disabled:opacity-40"
            style={{ padding: '6px 14px', fontSize: '13px', background: 'var(--nx-blue)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
