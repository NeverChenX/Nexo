/**
 * 简易 frontmatter 解析器
 * 支持 YAML-like 格式的 tags 字段
 */

export interface Frontmatter {
  tags?: string[];
  [key: string]: unknown;
}

interface ParsedContent {
  frontmatter: Frontmatter;
  body: string;
}

/**
 * 解析 markdown 内容中的 frontmatter
 */
export function parseFrontmatter(content: string): ParsedContent {
  if (!content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const fmRaw = content.slice(4, endIndex).trim();
  const body = content.slice(endIndex + 4).replace(/^\n/, '');
  const frontmatter: Frontmatter = {};

  for (const line of fmRaw.split('\n')) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;

    if (key === 'tags') {
      // 支持 [tag1, tag2] 和 tag1, tag2 格式
      const cleaned = value.replace(/^\[|\]$/g, '').trim();
      if (cleaned) {
        frontmatter.tags = cleaned.split(',').map((t) => t.trim()).filter(Boolean);
      } else {
        frontmatter.tags = [];
      }
    } else {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * 将 frontmatter 和 body 重新序列化
 */
export function serializeFrontmatter(frontmatter: Frontmatter, body: string): string {
  const entries: string[] = [];

  if (frontmatter.tags && frontmatter.tags.length > 0) {
    entries.push(`tags: [${frontmatter.tags.join(', ')}]`);
  }

  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === 'tags') continue;
    if (value !== undefined && value !== null) {
      entries.push(`${key}: ${String(value)}`);
    }
  }

  if (entries.length === 0) return body;

  return `---\n${entries.join('\n')}\n---\n${body}`;
}

