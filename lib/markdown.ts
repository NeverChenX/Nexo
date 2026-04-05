// Markdown 处理工具
// 此文件预留用于 markdown 特殊处理，目前基本功能由 react-markdown 和 easymde 处理

export function sanitizeMarkdown(content: string): string {
  // 防止 XSS 攻击：移除危险的 HTML 标签
  return content.replace(/<script[^>]*>.*?<\/script>/gi, '');
}

export function extractTitle(content: string): string {
  // 从 markdown 内容中提取第一个 H1 标题作为文章标题
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : '无标题';
}

export function extractSummary(content: string, length: number = 200): string {
  // 提取摘要（移除 markdown 语法）
  const text = content
    .replace(/[#*_\[\]()]/g, '')
    .split('\n')
    .filter((line) => line.trim())
    .join(' ');
  return text.substring(0, length) + (text.length > length ? '...' : '');
}
