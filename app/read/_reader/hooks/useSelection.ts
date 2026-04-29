'use client';

import { useEffect, useState, useCallback } from 'react';

export interface SelectionInfo {
  text: string;
  startOffset: number; // 在 markdown source 里的字符 offset
  endOffset: number;
  rect: DOMRect; // 选区可见区的位置（fixed）
}

interface Options {
  contentRoot: HTMLElement | null;
  source: string; // 原 markdown
  enabled: boolean;
}

/** 把 DOM Range 映射回 markdown 源 offset：使用 data-sourcepos 行号 + 行内字节偏移。*/
function rangeToSourceOffset(
  range: Range,
  root: HTMLElement,
  source: string,
): { start: number; end: number } | null {
  const findEl = (n: Node | null): HTMLElement | null => {
    let e: Node | null = n;
    while (e && e !== root) {
      if (e instanceof HTMLElement && e.dataset.sourcepos) return e;
      e = e.parentNode;
    }
    return null;
  };
  const a = findEl(range.startContainer);
  const b = findEl(range.endContainer);
  if (!a || !b) return null;
  const parse = (sp: string) => {
    const m = sp.match(/^(\d+):\d+-(\d+):\d+$/);
    if (!m) return null;
    return { startLine: parseInt(m[1], 10), endLine: parseInt(m[2], 10) };
  };
  const aPos = parse(a.dataset.sourcepos!);
  const bPos = parse(b.dataset.sourcepos!);
  if (!aPos || !bPos) return null;
  const startLine = Math.min(aPos.startLine, bPos.startLine);
  const endLine = Math.max(aPos.endLine, bPos.endLine);
  if (startLine < 1 || endLine < startLine) return null;

  const lines = source.split('\n');
  if (endLine > lines.length) return null;

  // crude: take all lines [startLine..endLine] and find selected text within
  const blockText = lines.slice(startLine - 1, endLine).join('\n');
  const selText = range.toString();
  const idxInBlock = blockText.indexOf(selText);
  if (idxInBlock < 0) return null;

  // start char offset in source = sum lengths of lines before startLine + 1 (\n) per line
  let baseOffset = 0;
  for (let i = 0; i < startLine - 1; i++) baseOffset += lines[i].length + 1;
  return {
    start: baseOffset + idxInBlock,
    end: baseOffset + idxInBlock + selText.length,
  };
}

export function useSelection({ contentRoot, source, enabled }: Options) {
  const [info, setInfo] = useState<SelectionInfo | null>(null);

  const compute = useCallback(() => {
    if (!enabled || !contentRoot) {
      setInfo(null);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setInfo(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!contentRoot.contains(range.commonAncestorContainer)) {
      setInfo(null);
      return;
    }
    const offsets = rangeToSourceOffset(range, contentRoot, source);
    if (!offsets) {
      setInfo(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) {
      setInfo(null);
      return;
    }
    setInfo({
      text: sel.toString(),
      startOffset: offsets.start,
      endOffset: offsets.end,
      rect,
    });
  }, [enabled, contentRoot, source]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      document.removeEventListener('selectionchange', onChange);
      cancelAnimationFrame(raf);
    };
  }, [enabled, compute]);

  const clear = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setInfo(null);
  }, []);

  return { info, clear };
}
