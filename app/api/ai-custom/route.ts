import { NextRequest, NextResponse } from 'next/server';
import { chat, LlmNotConfiguredError } from '@/lib/llm/client';

// 用户自定义 prompt：针对选中的内容，用任意指令让 AI 生成回答
// 例：selectedText="爱因斯坦的相对论..."，instruction="用数学模型解释这个内容"
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedText, instruction } = body as {
      selectedText?: string;
      instruction?: string;
    };

    if (!selectedText || typeof selectedText !== 'string' || !selectedText.trim()) {
      return NextResponse.json({ ok: false, error: '缺少 selectedText 参数' }, { status: 400 });
    }
    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      return NextResponse.json({ ok: false, error: '缺少 instruction 参数' }, { status: 400 });
    }

    // 简单长度防护，避免 prompt 过长
    const text = selectedText.slice(0, 8000);
    const ins = instruction.slice(0, 1000);

    const prompt = `用户选中了下面这段内容：

"""
${text}
"""

用户的要求是：${ins}

请直接给出回答，不要重复用户的指令，不要加套话开场白。如果回答涉及公式 / 代码 / 列表，请用 Markdown 输出。`;

    const { text: result } = await chat({ prompt, timeoutMs: 60_000 });
    return NextResponse.json({ ok: true, data: { result } });
  } catch (error: unknown) {
    if (error instanceof LlmNotConfiguredError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ ok: false, error: `AI 自定义提问失败: ${message}` }, { status: 500 });
  }
}
