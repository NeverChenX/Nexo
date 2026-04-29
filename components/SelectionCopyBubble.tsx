'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check } from 'lucide-react';

interface SelectionCopyBubbleProps {
  containerRef: React.RefObject<HTMLElement | null>;
  resolveMarkdown: (selection: Selection) => string | null;
  label?: string;
  copiedLabel?: string;
}

export function SelectionCopyBubble({
  containerRef,
  resolveMarkdown,
  label = '复制 Markdown',
  copiedLabel = '已复制',
}: SelectionCopyBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const recompute = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setVisible(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container) {
        setVisible(false);
        return;
      }
      const touchesContainer =
        container.contains(range.startContainer) || container.contains(range.endContainer);
      if (!touchesContainer) {
        setVisible(false);
        return;
      }
      const text = sel.toString();
      if (!text.trim()) {
        setVisible(false);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setVisible(false);
        return;
      }
      const bubbleWidth = 120;
      setPos({
        top: rect.bottom + window.scrollY + 6,
        left: Math.max(
          8 + window.scrollX,
          Math.min(rect.right + window.scrollX - bubbleWidth, window.innerWidth - bubbleWidth - 8 + window.scrollX),
        ),
      });
      setCopied(false);
      setVisible(true);
    };

    const onSelectionChange = () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(recompute, 60);
    };
    const onScroll = () => setVisible(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };
    const onDocMouseDown = (e: MouseEvent) => {
      if (bubbleRef.current && bubbleRef.current.contains(e.target as Node)) return;
    };
    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDocMouseDown);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocMouseDown);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [containerRef]);

  const handleCopy = async () => {
    const sel = window.getSelection();
    if (!sel) return;
    const md = resolveMarkdown(sel);
    const text = md ?? sel.toString();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setVisible(false), 1200);
  };

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={bubbleRef}
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleCopy}
      role="button"
      aria-label={copied ? copiedLabel : label}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        background: 'rgba(25,25,25,0.92)',
        color: '#fff',
        borderRadius: 6,
        fontSize: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        userSelect: 'none',
        lineHeight: 1,
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span>{copied ? copiedLabel : label}</span>
    </div>,
    document.body,
  );
}
