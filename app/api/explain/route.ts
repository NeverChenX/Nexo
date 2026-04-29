import { NextRequest, NextResponse } from 'next/server';
import { chat, LlmNotConfiguredError } from '@/lib/llm/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, articlePath } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ ok: false, error: '缺少 text 参数' }, { status: 400 });
    }
    if (!articlePath || typeof articlePath !== 'string') {
      return NextResponse.json({ ok: false, error: '缺少 articlePath 参数' }, { status: 400 });
    }

    const { text: explanation } = await chat({
      prompt: `请解释以下内容（简明扼要）：\n\n${text}`,
      timeoutMs: 30_000,
    });
    return NextResponse.json({ ok: true, data: { explanation } });
  } catch (error: unknown) {
    if (error instanceof LlmNotConfiguredError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ ok: false, error: `AI 解释失败: ${message}` }, { status: 500 });
  }
}
