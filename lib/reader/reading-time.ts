const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
const FENCE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]+`/g;

export function countWords(text: string, opts?: { stripCode?: boolean }): number {
  let t = text;
  if (opts?.stripCode) {
    t = t.replace(FENCE_RE, '').replace(INLINE_CODE_RE, '');
  }
  const cjkCount = (t.match(CJK_RE) || []).length;
  const stripped = t.replace(CJK_RE, ' ');
  const words = stripped.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)).length;
  return cjkCount + words;
}

export function estimateMinutes(words: number, wpm = 350): number {
  return Math.max(1, Math.ceil(words / wpm));
}
