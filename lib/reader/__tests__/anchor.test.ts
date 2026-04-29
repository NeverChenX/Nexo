import { describe, it, expect } from 'vitest';
import { makeAnchor, resolveAnchor, PADDING } from '../anchor';

describe('anchor', () => {
  it('makeAnchor builds quote with padding', () => {
    const src = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    const start = 12; // "dolor"
    const end = 17;
    const a = makeAnchor(src, start, end);
    expect(a.startOffset).toBe(12);
    expect(a.endOffset).toBe(17);
    expect(a.quote).toContain('dolor');
    expect(a.quote.length).toBeLessThanOrEqual(5 + 2 * PADDING);
  });

  it('resolveAnchor exact match preserves offsets', () => {
    const src = 'A'.repeat(100) + 'TARGET' + 'B'.repeat(100);
    const start = 100;
    const end = 106;
    const a = makeAnchor(src, start, end);
    const r = resolveAnchor(src, a)!;
    expect(r.startOffset).toBe(100);
    expect(r.endOffset).toBe(106);
    expect(r.drifted).toBe(false);
  });

  it('resolveAnchor handles small drift (insertion before anchor)', () => {
    const src = 'A'.repeat(100) + 'TARGET' + 'B'.repeat(100);
    const a = makeAnchor(src, 100, 106);
    const drifted = 'XX' + src; // anchor moves +2
    const r = resolveAnchor(drifted, a)!;
    expect(r.startOffset).toBe(102);
    expect(r.endOffset).toBe(108);
    expect(r.drifted).toBe(true);
  });

  it('resolveAnchor returns null when text completely changed', () => {
    const a = makeAnchor('hello world target world', 13, 19);
    expect(resolveAnchor('something completely different', a)).toBeNull();
  });

  it('resolveAnchor uses fuzzy fallback for minor edits inside quote', () => {
    const original = 'A'.repeat(50) + 'protocol handler runs' + 'B'.repeat(50);
    const a = makeAnchor(original, 50, 50 + 'protocol handler runs'.length);
    // Edit: handler -> hAndler (single char change)
    const drifted = 'A'.repeat(50) + 'protocol hAndler runs' + 'B'.repeat(50);
    const r = resolveAnchor(drifted, a)!;
    expect(r.drifted).toBe(true);
    // The found range should still cover ~the same area
    expect(r.startOffset).toBeGreaterThanOrEqual(45);
    expect(r.startOffset).toBeLessThanOrEqual(55);
  });

  it('CJK selection round-trips', () => {
    const src = '前面前面前面' + '协调器处理虚拟 DOM 差异' + '后面后面后面';
    const start = 6;
    const end = start + '协调器处理虚拟 DOM 差异'.length;
    const a = makeAnchor(src, start, end);
    const r = resolveAnchor(src, a)!;
    expect(r.startOffset).toBe(start);
    expect(r.endOffset).toBe(end);
  });
});
