export interface ArticleNode {
  id: string;
  idChain: string;
  title: string;
  path: string;
  parentPath: string;
  order: number;
}

export interface ChapterNavLink {
  id: string;
  idChain: string;
  title: string;
  path: string;
}

export interface ChapterNavResult {
  prev?: ChapterNavLink;
  next?: ChapterNavLink;
}

function findOverride(token: string, all: readonly ArticleNode[]): ArticleNode | undefined {
  return (
    all.find((n) => n.id === token) ||
    all.find((n) => n.idChain === token) ||
    all.find((n) => n.path === token)
  );
}

function toLink(n: ArticleNode): ChapterNavLink {
  return { id: n.id, idChain: n.idChain, title: n.title, path: n.path };
}

/**
 * 给定全文章列表 + 当前 article，解析上/下一篇。
 * 优先级：frontmatter override > 同父目录兄弟 (按 order 升序) > undefined。
 */
export function resolveChapterNav(
  current: ArticleNode,
  all: readonly ArticleNode[],
  override?: { prev?: string; next?: string },
): ChapterNavResult {
  const result: ChapterNavResult = {};

  // 1) Override first
  if (override?.prev) {
    const o = findOverride(override.prev, all);
    if (o) result.prev = toLink(o);
  }
  if (override?.next) {
    const o = findOverride(override.next, all);
    if (o) result.next = toLink(o);
  }

  // 2) Same-folder siblings (sorted by order asc)
  if (!result.prev || !result.next) {
    const siblings = all
      .filter((n) => n.parentPath === current.parentPath)
      .slice()
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((n) => n.id === current.id);
    if (idx >= 0) {
      if (!result.prev && idx > 0) result.prev = toLink(siblings[idx - 1]);
      if (!result.next && idx < siblings.length - 1) result.next = toLink(siblings[idx + 1]);
    }
  }

  return result;
}
