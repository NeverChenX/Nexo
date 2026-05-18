'use client';

import { useEffect, useRef, useState } from 'react';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import { ColorPalette } from './ColorPalette';
import type { MarkColor } from '@/lib/reader/prefs';

interface Props {
  rect: DOMRect | null;
  onMark: (color: MarkColor) => void;
  onNote: () => void;
  onThought: () => void;
  onCopy: () => void;
  onShare: () => void;
}

export function SelectionToolbar({
  rect,
  onMark,
  onNote,
  onThought,
  onCopy,
  onShare,
}: Props) {
  const { prefs, patch } = useReaderPrefs();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isPhone = typeof window !== 'undefined' && window.innerWidth < 768;
  const pressTimer = useRef<number | null>(null);

  useEffect(() => setPaletteOpen(false), [rect]);

  if (!rect) return null;

  const left = isPhone ? '50%' : `${rect.left + rect.width / 2}px`;
  const top = isPhone ? 'auto' : `${rect.top - 8}px`;
  const bottom = isPhone ? '20px' : 'auto';
  const transform = isPhone ? 'translateX(-50%)' : 'translate(-50%, -100%)';

  const onMarkClick = () => {
    onMark(prefs.lastMarkColor);
  };
  const onPickColor = (c: MarkColor) => {
    patch({ lastMarkColor: c });
    onMark(c);
    setPaletteOpen(false);
  };

  // long-press to expand palette
  const onMarkPointerDown = () => {
    pressTimer.current = window.setTimeout(() => setPaletteOpen(true), 350);
  };
  const onMarkPointerUp = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div
      ref={ref}
      className="rd-seltoolbar"
      style={{ left, top, bottom, transform }}
      role="toolbar"
      aria-label="选区操作"
      data-rd-no-toggle="true"
      // 阻止 mousedown 默认行为：默认情况下点击工具栏会把选区折叠掉，
      // 紧接着 selectionchange → useSelection.compute → setInfo(null)，
      // 等真正 onClick 触发时 selInfo 已是 null，onMark 就直接 return 不画线。
      // preventDefault 后选区保留，整个高亮链路才能正常完成。
      onMouseDown={(e) => e.preventDefault()}
    >
      {paletteOpen ? (
        <ColorPalette onPick={onPickColor} />
      ) : (
        <>
          <button
            type="button"
            className="rd-seltoolbar__btn rd-seltoolbar__btn--mark"
            style={{
              background: `var(--rd-mark-${prefs.lastMarkColor})`,
              color: '#000',
            }}
            onClick={onMarkClick}
            onPointerDown={onMarkPointerDown}
            onPointerUp={onMarkPointerUp}
            onPointerLeave={onMarkPointerUp}
            onContextMenu={(e) => {
              e.preventDefault();
              setPaletteOpen(true);
            }}
            aria-label="划线（长按选色）"
          >
            划线
          </button>
          <button
            type="button"
            className="rd-seltoolbar__btn"
            onClick={onNote}
          >
            笔记
          </button>
          <button
            type="button"
            className="rd-seltoolbar__btn"
            onClick={onThought}
          >
            想法
          </button>
          <button
            type="button"
            className="rd-seltoolbar__btn"
            onClick={onCopy}
          >
            复制 MD
          </button>
          <button
            type="button"
            className="rd-seltoolbar__btn"
            onClick={onShare}
          >
            分享
          </button>
        </>
      )}
    </div>
  );
}
