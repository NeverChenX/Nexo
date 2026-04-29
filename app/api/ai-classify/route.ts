import { NextRequest, NextResponse } from 'next/server';
import { getRecursiveTree } from '@/lib/storage';
import { chat, LlmNotConfiguredError } from '@/lib/llm/client';

interface TreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeItem[];
}

function collectFolders(items: TreeItem[], out: string[] = []): string[] {
  for (const it of items) {
    if (it.isFolder) {
      out.push(it.path);
      if (it.children) collectFolders(it.children, out);
    }
  }
  return out;
}

/**
 * POST /api/ai-classify
 * Body: { path: string, content: string }
 * 返回: { suggestedFolders: string[], suggestedTags: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content: string = typeof body.content === 'string' ? body.content : '';
    const current: string = typeof body.path === 'string' ? body.path : '';
    if (!content.trim()) {
      return NextResponse.json({ ok: false, error: '缺少 content' }, { status: 400 });
    }

    // 1. 收集现有文件夹（作为候选目录）
    const tree = (await getRecursiveTree()) as TreeItem[];
    const folders = collectFolders(tree);
    const folderList = folders.slice(0, 80).join(', ') || '(暂无文件夹)';

    // 2. prompt
    const snippet = content.slice(0, 2000);
    const prompt = `你是一个知识库分类助手。根据以下文档内容，从现有目录中推荐 1-3 个**最合适**的目录（按相关性排序），并生成 3-5 个中文标签。

要求：
- 目录必须来自已存在的列表（若确实都不合适，可返回空数组）
- 标签简短（2-6 字），不要带 # 号
- 只返回严格的 JSON，不要解释

现有目录列表：
${folderList}

当前文档位置（可供参考但不一定最优）：${current || '(根目录)'}

文档内容（可能被截断）：
"""
${snippet}
"""

请以严格 JSON 返回：
{"folders": ["目录A", "目录B"], "tags": ["标签1", "标签2", "标签3"]}`;

    let raw = '';
    try {
      const r = await chat({ prompt, timeoutMs: 40_000 });
      raw = r.text;
    } catch (err) {
      if (err instanceof LlmNotConfiguredError) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
      }
      const msg = err instanceof Error ? err.message : 'AI 服务错误';
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }
    let suggestedFolders: string[] = [];
    let suggestedTags: string[] = [];
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed.folders)) suggestedFolders = parsed.folders.filter((s: unknown): s is string => typeof s === 'string').slice(0, 3);
      if (Array.isArray(parsed.tags)) suggestedTags = parsed.tags.filter((s: unknown): s is string => typeof s === 'string').slice(0, 5);
    } catch {
      // 解析失败降级
    }
    // 只保留在 folders 列表里的
    suggestedFolders = suggestedFolders.filter((f) => folders.includes(f));

    return NextResponse.json({ ok: true, data: { suggestedFolders, suggestedTags } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '分类失败';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
