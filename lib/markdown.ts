// Markdown 处理工具
// 此文件预留用于 markdown 特殊处理，目前基本功能由 react-markdown 和 easymde 处理

/** @deprecated 使用 rehype-sanitize 替代，此函数基于正则的消毒方式不够安全 */
export function sanitizeMarkdown(content: string): string {
  // 移除危险的 HTML 标签和属性（script, iframe, on* 事件处理器, javascript: 协议）
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<iframe[^>]*\/?>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*\/?>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*\S+/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
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
