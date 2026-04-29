import Fuse from 'fuse.js';

export const PADDING = 15;

export interface Anchor {
  startOffset: number;
  endOffset: number;
  quote: string;
}

export interface ResolvedAnchor {
  startOffset: number;
  endOffset: number;
  drifted: boolean;
}

export function makeAnchor(source: string, start: number, end: number): Anchor {
  const lo = Math.max(0, start - PADDING);
  const hi = Math.min(source.length, end + PADDING);
  return {
    startOffset: start,
    endOffset: end,
    quote: source.slice(lo, hi),
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
  return a.startOffset === b.startOffset && a.endOffset === b.endOffset;
}
