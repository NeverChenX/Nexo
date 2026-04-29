import { NextRequest, NextResponse } from 'next/server';
import { chat, LlmNotConfiguredError } from '@/lib/llm/client';

const ACTION_PROMPTS: Record<string, string> = {
  summarize: '请用简洁的几句话总结以下内容，保留核心要点：\n\n{text}',
  expand: '请扩展以下内容，添加更多细节和解释，保持原文风格：\n\n{text}',
  rewrite: '请改写以下内容，使其更加清晰流畅，保持原意不变：\n\n{text}',
  continue: '请基于以下内容继续往下写，保持风格和主题一致：\n\n{text}',
  fix_grammar: '请修正以下内容中的语法和拼写错误，保持原意不变，只修正错误：\n\n{text}',
  translate_zh: '请将以下内容翻译为中文，保持专业术语准确：\n\n{text}',
  translate_en: '请将以下内容翻译为英文，保持专业术语准确：\n\n{text}',
  simplify: '请简化以下内容，使其更易于理解，去除不必要的复杂表达：\n\n{text}',
  formal: '请将以下内容改写为正式的书面语风格：\n\n{text}',
  bullet_points: '请将以下内容转换为简洁的要点列表格式：\n\n{text}',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, action } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ ok: false, error: '缺少 text 参数' }, { status: 400 });
    }
    if (!action || !(action in ACTION_PROMPTS)) {
      return NextResponse.json(
        { ok: false, error: `无效的 action，可选: ${Object.keys(ACTION_PROMPTS).join(', ')}` },
        { status: 400 }
      );
    }

    const prompt = ACTION_PROMPTS[action].replace('{text}', text);
    const { text: result } = await chat({ prompt, timeoutMs: 30_000 });
    return NextResponse.json({ ok: true, data: { result } });
  } catch (error: unknown) {
    if (error instanceof LlmNotConfiguredError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ ok: false, error: `AI 调用失败: ${message}` }, { status: 500 });
  }
}
