'use client';

import type { Mark, Note } from '@/lib/reader/types';
import type { MarkColor } from '@/lib/reader/prefs';
import { ColorPalette } from './ColorPalette';
import { useState } from 'react';

interface Props {
  mark: Mark;
  rect: DOMRect;
  note?: Note;
  onClose: () => void;
  onChangeColor: (color: MarkColor) => void;
  onEditNote: () => void;
  onDelete: () => void;
}

export function MarkPopover({
  mark,
  rect,
  note,
  onClose,
  onChangeColor,
  onEditNote,
  onDelete,
}: Props) {
  const [palette, setPalette] = useState(false);
  const top = rect.bottom + 6;
  const left = Math.min(window.innerWidth - 240, Math.max(8, rect.left));
  return (
    <>
      <div
        className="rd-mark-pop__catcher"
        onClick={onClose}
        data-rd-no-toggle="true"
      />
      <div
        className="rd-mark-pop"
        style={{ top, left }}
        role="dialog"
        aria-label="划线操作"
        data-rd-no-toggle="true"
      >
        <div className="rd-mark-pop__meta">
          {new Date(mark.createdAt).toLocaleString()}
          {' · '}
          <span style={{ color: `var(--rd-mark-${mark.color})` }}>
            ● {mark.color}
          </span>
        </div>
        {note && <div className="rd-mark-pop__note">{note.text}</div>}
        {palette ? (
          <ColorPalette
            onPick={(c) => {
              onChangeColor(c);
              setPalette(false);
            }}
          />
        ) : (
          <div className="rd-mark-pop__actions">
            <button type="button" onClick={onEditNote}>
              ✎ 笔记
            </button>
            <button type="button" onClick={() => setPalette(true)}>
              🎨 改色
            </button>
            <button
              type="button"
              className="rd-mark-pop__danger"
              onClick={onDelete}
            >
              ✕ 删除
            </button>
          </div>
        )}
      </div>
    </>
  );
}
