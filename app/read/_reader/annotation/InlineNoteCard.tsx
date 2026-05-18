'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Note, Thought } from '@/lib/reader/types';

interface Card {
  hostEl: HTMLElement;
  kind: 'note' | 'thought';
  data: Note | Thought;
}

interface Props {
  contentRoot: HTMLElement | null;
  notes: Note[];
  thoughts: Thought[];
  visibility: 'always' | 'collapsed' | 'hidden';
  onEdit: (kind: 'note' | 'thought', id: string) => void;
  onDelete: (kind: 'note' | 'thought', id: string) => void;
}

function findAnchorParagraph(
  root: HTMLElement,
  anchor: { quote: string; selected?: string },
): HTMLElement | null {
  // Prefer the rendered selected text — it's plain text from the DOM and
  // therefore matches paragraph.textContent reliably even when the source
  // contains inline markdown formatting.
  const probeSrc = anchor.selected || anchor.quote;
  if (!probeSrc) return null;
  const probe = probeSrc.slice(0, Math.min(20, probeSrc.length));
  if (!probe) return null;
  const paragraphs = root.querySelectorAll<HTMLElement>(
    'p, li, blockquote, h1, h2, h3, h4',
  );
  for (const p of paragraphs) {
    if (p.textContent && p.textContent.includes(probe)) {
      return p;
    }
  }
  return null;
}

export function InlineNoteCard({
  contentRoot,
  notes,
  thoughts,
  visibility,
  onEdit,
  onDelete,
}: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const hostsRef = useRef<HTMLElement[]>([]);

  // Build host elements after each item paragraph
  useEffect(() => {
    if (!contentRoot) return;
    if (visibility === 'hidden') {
      hostsRef.current.forEach((h) => h.remove());
      hostsRef.current = [];
      setCards([]);
      return;
    }
    // cleanup previous hosts
    hostsRef.current.forEach((h) => h.remove());
    hostsRef.current = [];

    const items: { kind: 'note' | 'thought'; data: Note | Thought }[] = [
      ...notes.map((n) => ({ kind: 'note' as const, data: n })),
      ...thoughts.map((t) => ({ kind: 'thought' as const, data: t })),
    ];

    const newCards: Card[] = [];
    for (const it of items) {
      const para = findAnchorParagraph(contentRoot, it.data.anchor);
      if (!para) continue;
      const host = document.createElement('div');
      host.className = `rd-inline-host rd-inline-host--${it.kind}`;
      host.setAttribute('data-rd-no-toggle', 'true');
      para.after(host);
      hostsRef.current.push(host);
      newCards.push({ hostEl: host, kind: it.kind, data: it.data });
    }
    setCards(newCards);

    return () => {
      hostsRef.current.forEach((h) => h.remove());
      hostsRef.current = [];
    };
  }, [contentRoot, notes, thoughts, visibility]);

  return (
    <>
      {cards.map((c) =>
        createPortal(
          <InlineNoteRender
            card={c}
            collapsed={visibility === 'collapsed'}
            onEdit={() => onEdit(c.kind, c.data.id)}
            onDelete={() => onDelete(c.kind, c.data.id)}
          />,
          c.hostEl,
          c.data.id,
        ),
      )}
    </>
  );
}

function InlineNoteRender({
  card,
  collapsed,
  onEdit,
  onDelete,
}: {
  card: Card;
  collapsed: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(!collapsed);
  if (collapsed && !open) {
    return (
      <button
        type="button"
        className={`rd-inline-dot rd-inline-dot--${card.kind}`}
        onClick={() => setOpen(true)}
        aria-label="展开笔记"
      />
    );
  }
  return (
    <div className={`rd-inline-card rd-inline-card--${card.kind}`}>
      <div className="rd-inline-card__head">
        <span className="rd-inline-card__label">
          {card.kind === 'note' ? '▍笔记' : '💭想法'}
        </span>
        <span className="rd-inline-card__date">
          {new Date(card.data.createdAt).toLocaleDateString()}
        </span>
        {collapsed && (
          <button
            type="button"
            className="rd-inline-card__collapse"
            onClick={() => setOpen(false)}
          >
            −
          </button>
        )}
      </div>
      <div className="rd-inline-card__text">{card.data.text}</div>
      <div className="rd-inline-card__actions">
        <button type="button" onClick={onEdit}>
          编辑
        </button>
        <button
          type="button"
          className="rd-inline-card__danger"
          onClick={onDelete}
        >
          删除
        </button>
      </div>
    </div>
  );
}
