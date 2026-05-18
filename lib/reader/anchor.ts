import Fuse from 'fuse.js';

export const PADDING = 15;
export const RENDERED_PAD = 30;

export interface Anchor {
  startOffset: number;
  endOffset: number;
  quote: string;
  selected?: string;
  prefix?: string;
  suffix?: string;
}

export interface ResolvedAnchor {
  startOffset: number;
  endOffset: number;
  drifted: boolean;
}

export interface RenderedContext {
  prefix: string;
  selected: string;
  suffix: string;
}

export function makeAnchor(
  source: string,
  start: number,
  end: number,
  rendered?: RenderedContext,
): Anchor {
  const lo = Math.max(0, start - PADDING);
  const hi = Math.min(source.length, end + PADDING);
  const fallbackSelected = rendered?.selected ?? source.slice(start, end);
  return {
    startOffset: start,
    endOffset: end,
    quote: source.slice(lo, hi) || fallbackSelected,
    ...(rendered ? rendered : {}),
  };
}

function selectedText(quote: string, prefix: number, selLen: number): string {
  return quote.slice(prefix, prefix + selLen);
}

export function resolveAnchor(
  source: string,
  anchor: Anchor,
): ResolvedAnchor | null {
  const selLen = anchor.endOffset - anchor.startOffset;
  if (selLen <= 0) return null;
  const quote = anchor.quote;

  const prefix = Math.min(PADDING, anchor.startOffset);

  // 1) Exact at original offset
  if (
    anchor.endOffset <= source.length &&
    source.slice(anchor.startOffset, anchor.endOffset) ===
      selectedText(quote, prefix, selLen)
  ) {
    return {
      startOffset: anchor.startOffset,
      endOffset: anchor.endOffset,
      drifted: false,
    };
  }

  // 2) Exact substring of full quote anywhere
  const idx = source.indexOf(quote);
  if (idx >= 0) {
    return {
      startOffset: idx + prefix,
      endOffset: idx + prefix + selLen,
      drifted: true,
    };
  }

  // 3) Selected text alone, anywhere
  const sel = selectedText(quote, prefix, selLen);
  const idx2 = source.indexOf(sel);
  if (idx2 >= 0) {
    return {
      startOffset: idx2,
      endOffset: idx2 + sel.length,
      drifted: true,
    };
  }

  // 4) Fuzzy on sliding windows of source (stride PADDING)
  const stride = Math.max(8, PADDING);
  const windowSize = quote.length;
  if (windowSize <= 0 || source.length < windowSize) return null;
  const windows: { text: string; pos: number }[] = [];
  for (let i = 0; i + windowSize <= source.length; i += stride) {
    windows.push({ text: source.slice(i, i + windowSize), pos: i });
  }
  if (windows.length === 0) return null;
  const fuse = new Fuse(windows, {
    keys: ['text'],
    includeScore: true,
    threshold: 0.4,
  });
  const r = fuse.search(quote);
  if (r.length === 0) return null;
  const best = r[0];
  if ((best.score ?? 1) > 0.45) return null;
  const pos = best.item.pos;
  return {
    startOffset: pos + prefix,
    endOffset: pos + prefix + selLen,
    drifted: true,
  };
}

export function isSameAnchor(a: Anchor, b: Anchor): boolean {
  if (a.selected && b.selected) {
    return (
      a.selected === b.selected &&
      (a.prefix ?? '') === (b.prefix ?? '') &&
      (a.suffix ?? '') === (b.suffix ?? '')
    );
  }
  return a.startOffset === b.startOffset && a.endOffset === b.endOffset;
}

/**
 * Resolve an anchor against the rendered DOM text (root.innerText). This is
 * used when anchor.selected is set, which is robust to inline markdown
 * formatting because it operates on rendered plain text.
 */
export function findRenderedRange(
  rootInnerText: string,
  anchor: Anchor,
): { start: number; end: number } | null {
  const sel = anchor.selected;
  if (!sel) return null;
  const prefix = anchor.prefix ?? '';
  const suffix = anchor.suffix ?? '';

  // 1. Exact prefix+selected+suffix
  if (prefix || suffix) {
    const needle = prefix + sel + suffix;
    const i = rootInnerText.indexOf(needle);
    if (i >= 0) return { start: i + prefix.length, end: i + prefix.length + sel.length };
  }
  // 2. prefix+selected
  if (prefix) {
    const needle = prefix + sel;
    const i = rootInnerText.indexOf(needle);
    if (i >= 0) return { start: i + prefix.length, end: i + prefix.length + sel.length };
  }
  // 3. selected+suffix
  if (suffix) {
    const needle = sel + suffix;
    const i = rootInnerText.indexOf(needle);
    if (i >= 0) return { start: i, end: i + sel.length };
  }
  // 4. selected alone
  const i = rootInnerText.indexOf(sel);
  if (i >= 0) return { start: i, end: i + sel.length };
  return null;
}
