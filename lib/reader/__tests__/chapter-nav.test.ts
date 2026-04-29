import { describe, it, expect } from 'vitest';
import { resolveChapterNav, type ArticleNode } from '../chapter-nav';

const make = (id: string, parentPath: string, order: number, title = id): ArticleNode => ({
  id,
  idChain: parentPath ? `${parentPath}/${id}` : id,
  title,
  path: parentPath ? `${parentPath}/${title}` : title,
  parentPath,
  order,
});

describe('resolveChapterNav', () => {
  it('returns next sibling in same folder', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const c = make('c3', 'root', 2);
    const r = resolveChapterNav(b, [a, b, c]);
    expect(r.prev?.id).toBe('a1');
    expect(r.next?.id).toBe('c3');
  });

  it('first article has no prev (within tree)', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const r = resolveChapterNav(a, [a, b]);
    expect(r.prev).toBeUndefined();
    expect(r.next?.id).toBe('b2');
  });

  it('last article has no next (within tree)', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const r = resolveChapterNav(b, [a, b]);
    expect(r.prev?.id).toBe('a1');
    expect(r.next).toBeUndefined();
  });

  it('frontmatter override by id', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const c = make('c3', 'other', 0);
    const r = resolveChapterNav(a, [a, b, c], { next: 'c3' });
    expect(r.next?.id).toBe('c3');
  });

  it('frontmatter override by path', () => {
    const a = make('a1', 'root', 0, 'Alpha');
    const c = make('c3', 'other', 0, 'Charlie');
    const r = resolveChapterNav(a, [a, c], { next: 'other/Charlie' });
    expect(r.next?.id).toBe('c3');
  });

  it('override missing → fall back to default', () => {
    const a = make('a1', 'root', 0);
    const b = make('b2', 'root', 1);
    const r = resolveChapterNav(a, [a, b], { next: 'missing' });
    expect(r.next?.id).toBe('b2');
  });

  it('siblings sorted by order asc', () => {
    const a = make('a1', 'root', 5);
    const b = make('b2', 'root', 1);
    const c = make('c3', 'root', 3);
    // current = c (order 3), prev order 1 = b, next order 5 = a
    const r = resolveChapterNav(c, [a, b, c]);
    expect(r.prev?.id).toBe('b2');
    expect(r.next?.id).toBe('a1');
  });
});
