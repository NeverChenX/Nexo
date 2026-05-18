'use client';

import { useEffect } from 'react';
import { resolveAnchor, findRenderedRange } from '@/lib/reader/anchor';
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

/**
 * 把根元素里 [startCharInRoot, endCharInRoot)（按 textContent 字符位置）
 * 的内容包裹成若干 .rd-mark span。
 *
 * 关键点：
 * 1. 全部用 textContent 语义计算位置（与 anchor.prefix/selected/suffix 一致），
 *    不能混入 innerText 的块边界换行符 — 它会造成偏移漂移。
 * 2. 选区可能横跨多个 inline 元素（粗体/链接/段落分割）。range.surroundContents
 *    要求 range 边界在同一父节点，跨界直接抛 InvalidStateError → 静默失败。
 *    所以这里改成：先把范围内涉及的每个 Text 节点都收集起来，再对每个文本节点
 *    单独裁一段 range 做 surroundContents，全部带相同 mark-id。
 */
function wrapRange(
  root: HTMLElement,
  startCharInRoot: number,
  endCharInRoot: number,
  attrs: Record<string, string>,
): boolean {
  if (endCharInRoot <= startCharInRoot) return false;

  // Pass 1：先快照所有相关的文本节点及其文本位置（mutate 前完成）。
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const slices: Array<{ node: Text; localStart: number; localEnd: number }> = [];
  let acc = 0;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const len = t.data.length;
    if (len === 0) continue;
    const nodeStart = acc;
    const nodeEnd = acc + len;
    acc = nodeEnd;
    // 这个文本节点完全在选区之前/之后，跳过
    if (nodeEnd <= startCharInRoot) continue;
    if (nodeStart >= endCharInRoot) break;
    const localStart = Math.max(0, startCharInRoot - nodeStart);
    const localEnd = Math.min(len, endCharInRoot - nodeStart);
    if (localEnd <= localStart) continue;
    slices.push({ node: t, localStart, localEnd });
  }
  if (slices.length === 0) return false;

  // Pass 2：逐段 surroundContents。每段都是同一文本节点内的子 range，
  // surroundContents 在这种"单 Text 节点内部"场景一定成功。
  let wrapped = false;
  for (const { node, localStart, localEnd } of slices) {
    // 该 Text 节点可能已被前一段 wrap 切短/搬走，但只要它还有父节点就还能继续。
    if (!node.parentNode) continue;
    const range = document.createRange();
    try {
      range.setStart(node, localStart);
      range.setEnd(node, localEnd);
    } catch {
      continue;
    }
    const span = document.createElement('span');
    span.classList.add('rd-mark');
    Object.entries(attrs).forEach(([k, v]) => span.setAttribute(k, v));
    try {
      range.surroundContents(span);
      wrapped = true;
    } catch {
      // 走到这里说明该子 range 仍跨节点（理论上不应发生，因为 setStart/End 都在同一 Text 节点上）
      // 静默跳过这一段，其他段继续。
    }
  }
  return wrapped;
}

function plainTextOffsetForSourceOffset(
  contentRoot: HTMLElement,
  source: string,
  sourceStart: number,
  sourceEnd: number,
): { plainStart: number; plainEnd: number } | null {
  // 用 textContent 与 wrapRange 的累计语义保持一致；innerText 会塞入块边界换行
  // 导致 indexOf 命中的位置与 wrapRange 的字符计数体系不对齐。
  const sel = source.slice(sourceStart, sourceEnd);
  const plain = contentRoot.textContent || '';
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
      // 注意：textContent 与 anchor.prefix/selected/suffix（来自 range.toString()）
      // 共享同一套字符位置体系；wrapRange 也用 textContent 走 TreeWalker 累计。
      // 千万不要换成 innerText（会引入块边界 \n，位置全错）。
      const plain = contentRoot.textContent || '';
      for (const m of marks) {
        let plainStart: number | null = null;
        let plainEnd: number | null = null;
        let drifted = false;

        // v2: rendered-text matching (robust to inline markdown)
        const rendered = findRenderedRange(plain, m.anchor);
        if (rendered) {
          plainStart = rendered.start;
          plainEnd = rendered.end;
        } else {
          // legacy source-offset fallback
          const r = resolveAnchor(source, m.anchor);
          if (!r) continue;
          const p = plainTextOffsetForSourceOffset(
            contentRoot,
            source,
            r.startOffset,
            r.endOffset,
          );
          if (!p) continue;
          plainStart = p.plainStart;
          plainEnd = p.plainEnd;
          drifted = r.drifted;
        }

        if (plainStart == null || plainEnd == null) continue;
        wrapRange(contentRoot, plainStart, plainEnd, {
          'data-mark-id': m.id,
          'data-color': m.color,
          'data-drifted': drifted ? '1' : '0',
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
