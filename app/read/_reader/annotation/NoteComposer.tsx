'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  initialText?: string;
  title?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function NoteComposer({
  open,
  initialText = '',
  title = '写一段笔记',
  onSubmit,
  onCancel,
}: Props) {
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [open, initialText]);

  if (!open) return null;
  return (
    <div
      className="rd-composer__overlay"
      onClick={onCancel}
      data-rd-no-toggle="true"
    >
      <div className="rd-composer" onClick={(e) => e.stopPropagation()}>
        <div className="rd-composer__title">{title}</div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="输入文字…（⌘+Enter 提交）"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSubmit(text);
          }}
        />
        <div className="rd-composer__actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="rd-composer__primary"
            onClick={() => onSubmit(text)}
            disabled={!text.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
