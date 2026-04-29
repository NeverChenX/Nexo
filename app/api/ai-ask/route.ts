import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { chat, LlmNotConfiguredError } from '@/lib/llm/client';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

/** 递归读取所有 md 文件，返回 { path, content } */
function getAllDocs(dir: string, base = ''): { docPath: string; content: string }[] {
  const results: { docPath: string; content: string }[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // 文件夹的 index.md
      const indexPath = path.join(fullPath, 'index.md');
      if (fs.existsSync(indexPath)) {
        results.push({ docPath: relPath, content: fs.readFileSync(indexPath, 'utf-8') });
      }
      results.push(...getAllDocs(fullPath, relPath));
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      results.push({ docPath: relPath.replace(/\.md$/, ''), content: fs.readFileSync(fullPath, 'utf-8') });
    }
  }
  return results;
}

/** 简单关键词匹配搜索相关文档 */
function searchRelevant(question: string, docs: { docPath: string; content: string }[], topK = 5) {
  // 提取关键词（去掉常用停用词）
  const stopWords = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', 'the', 'a', 'is', 'are', 'was', 'be', 'to', 'of', 'and', 'in', 'that', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'from', 'what', 'how', 'why', 'when', 'where', 'which', 'who']);
  const keywords = question
    .toLowerCase()
    .split(/[\s,，。？?！!、]+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  const scored = docs.map((doc) => {
    const lower = doc.content.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      const matches = lower.split(kw).length - 1;
      score += matches;
    }
    return { ...doc, score };
  });

  return scored
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, history } = body as { question?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> };

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ ok: false, error: '缺少 question 参数' }, { status: 400 });
    }
    const chatHistory = Array.isArray(history) ? history.slice(-10) : [];

    // 1. 搜索相关文档
    const allDocs = getAllDocs(WIKI_DATA_DIR);
    const relevant = searchRelevant(question, allDocs);

    if (relevant.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          answer: '没有找到与问题相关的文档内容。请尝试用不同的关键词提问。',
          sources: [],
        },
      });
    }

    // 2. 构建上下文（截取每篇文档前 1500 字符）
    const context = relevant
      .map((doc, i) => `【文档${i + 1}: ${doc.docPath}】\n${doc.content.slice(0, 1500)}`)
      .join('\n\n---\n\n');

    // 把过往对话拼成上下文（仅最近 5 轮，避免 token 爆炸）
    const historyBlock = chatHistory.length > 0
      ? '\n\n【先前对话历史（最近）】\n' + chatHistory
          .slice(-10)
          .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content.slice(0, 500)}`)
          .join('\n') + '\n'
      : '';

    const prompt = `你是一个知识库助手。根据以下文档内容回答用户的问题。请在回答中标注引用来源（用【文档N: 路径】格式）。如果文档中没有相关信息，请如实说明。

${context}
${historyBlock}
---

当前问题：${question}

请基于以上文档内容 + 历史对话回答：`;

    // 3. 调用 AI
    const { text: answer } = await chat({ prompt, timeoutMs: 60_000 });

    return NextResponse.json({
      ok: true,
      data: {
        answer: answer || '未能生成回答',
        sources: relevant.map((d) => ({ path: d.docPath, score: d.score })),
      },
    });
  } catch (error: unknown) {
    if (error instanceof LlmNotConfiguredError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ ok: false, error: `知识问答失败: ${message}` }, { status: 500 });
  }
}
