/**
 * 文档统计：字数、字符数、阅读时间
 */
export interface DocStats {
  wordCount: number;
  charCount: number;
  readingTimeMin: number;
}

export function computeStats(content: string): DocStats {
  if (!content.trim()) return { wordCount: 0, charCount: 0, readingTimeMin: 0 };

  // 去掉 markdown 语法标记
  const cleaned = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`>|[\]()!-]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  const charCount = cleaned.length;

  // CJK 字符每个算一词，非 CJK 按空格分词
  const cjkChars = cleaned.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
  const cjkCount = cjkChars ? cjkChars.length : 0;

  // 去掉 CJK 字符后按空格分词
  const nonCjk = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ').trim();
  const latinWords = nonCjk ? nonCjk.split(/\s+/).filter(Boolean).length : 0;

  const wordCount = cjkCount + latinWords;

  // 中文 ~400字/分钟，英文 ~200词/分钟，取平均
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 350));

  return { wordCount, charCount, readingTimeMin };
}
