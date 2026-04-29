import { describe, it, expect } from 'vitest';
import { countWords, estimateMinutes } from '../reading-time';

describe('reading-time', () => {
  it('counts pure CJK chars', () => {
    expect(countWords('你好世界')).toBe(4);
  });
  it('counts pure English words', () => {
    expect(countWords('hello world foo bar')).toBe(4);
  });
  it('mixed CJK + English', () => {
    expect(countWords('你好 hello 世界')).toBe(2 + 1 + 2);
  });
  it('strips markdown code fences when stripCode=true', () => {
    const md = 'hello ```\nlots of code\n``` world';
    expect(countWords(md, { stripCode: true })).toBe(2);
  });
  it('estimateMinutes uses 350 wpm baseline', () => {
    expect(estimateMinutes(0)).toBe(1);
    expect(estimateMinutes(350)).toBe(1);
    expect(estimateMinutes(351)).toBe(2);
    expect(estimateMinutes(700)).toBe(2);
    expect(estimateMinutes(1050)).toBe(3);
  });
});
