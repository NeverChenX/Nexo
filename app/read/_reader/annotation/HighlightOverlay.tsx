'use client';

import { useEffect } from 'react';
import { resolveAnchor } from '@/lib/reader/anchor';
import type { Mark } from '@/lib/reader/types';

interface Props {
  contentRoot: HTMLElement | null;
  source: string;
  marks: Mark[];
  onClickMark: (mark: Mark, rect: DOMRect) => void;
}

const COLOR_VAR: Record<Mark['color'], string> = {
  yellow: 'var(--rd-mark-yellow)',
  red: 'var(--rd-mark-red)',
  green: 'var(--rd-mark-green)',
  blue: 'var(--rd-mark-blue)',
};

function unwrapAll(root: HTMLElement) {
  const spans = root.querySelectorAll<HTMLElement>('.rd-mark');
  spans.forEach((s) => {
    const parent = s.parentNode;
    if (!parent) return;
    while (s.firstChild) parent.insertBefore(s.firstChild, s);
    parent.removeChild(s);
    parent.normalize();
  });
}

/** Walk text nodes inside element and wrap chars [start, end) of plain text. */
function wrapRange(
  root: HTMLElement,
  startCharInRoot: number,
  endCharInRoot: number,
  attrs: Record<string, string>,
): boolean {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0;
  let startNode: Text | null = null;
  let startOff = 0;
  let endNode: Text | null = null;
  let endOff = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const len = t.data.length;
    if (!startNode && acc + len > startCharInRoot) {
      startNode = t;
      startOff = startCharInRoot - acc;
    }
    if (!endNode && acc + len >= endCharInRoot) {
      endNode = t;
      endOff = endCharInRoot - acc;
      break;
    }
    acc += len;
  }
  if (!startNode || !endNode) return false;
  const range = document.createRange();
  range.setStart(startNode, startOff);
  range.setEnd(endNode, endOff);
  const span = document.createElement('span');
  span.classList.add('rd-mark');
  Object.entries(attrs).forEach(([k, v]) => span.setAttribute(k, v));
  try {
    range.surroundContents(span);
    return true;
  } catch {
    return false;
  }
}

function plainTextOffsetForSourceOffset(
  contentRoot: HTMLElement,
  source: string,
  sourceStart: number,
  sourceEnd: number,
): { plainStart: number; plainEnd: number } | null {
  // Approximate: use root.innerText and find quote substring
  // (we already resolved to source offsets so the text exists somewhere).
  const sel = source.slice(sourceStart, sourceEnd);
  const plain = contentRoot.innerText;
  const idx = plain.indexOf(sel);
  if (idx < 0) return null;
  return { plainStart: idx, plainEnd: idx + sel.length };
}

export function HighlightOverlay({
  contentRoot,
  source,
  marks,
  onClickMark,
}: Props) {
  useEffect(() => {
    if (!contentRoot) return;

    const apply = () => {
      unwrapAll(contentRoot);
      for (const m of marks) {
        const r = resolveAnchor(source, m.anchor);
        if (!r) continue;
        const p = plainTextOffsetForSourceOffset(
          contentRoot,
          source,
          r.startOffset,
          r.endOffset,
        );
        if (!p) continue;
        wrapRange(contentRoot, p.plainStart, p.plainEnd, {
          'data-mark-id': m.id,
          'data-color': m.color,
          'data-drifted': r.drifted ? '1' : '0',
          'data-rd-no-toggle': 'true',
          style: `--mc:${COLOR_VAR[m.color]}`,
        });
      }
    };
    apply();
    return () => unwrapAll(contentRoot);
  }, [contentRoot, source, marks]);

  // Click delegation: any click on .rd-mark surfaces to onClickMark
  useEffect(() => {
    if (!contentRoot) return;
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest(
        '.rd-mark',
      ) as HTMLElement | null;
      if (!t) return;
      const id = t.dataset.markId;
      if (!id) return;
      const m = marks.find((x) => x.id === id);
      if (!m) return;
      e.preventDefault();
      e.stopPropagation();
      onClickMark(m, t.getBoundingClientRect());
    };
    contentRoot.addEventListener('click', onClick);
    return () => contentRoot.removeEventListener('click', onClick);
  }, [contentRoot, marks, onClickMark]);

  return null;
}
