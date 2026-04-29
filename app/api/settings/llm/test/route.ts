import { NextRequest, NextResponse } from 'next/server';
import { chat, LlmNotConfiguredError } from '@/lib/llm/client';
import type { LlmConfig } from '@/lib/llm/config';

/**
 * POST /api/settings/llm/test
 * Body: { apiKey?, baseUrl?, model? }  传入临时覆盖以测试连通性
 * 返回：{ ok, data: { reply, latencyMs } } 或 { ok: false, error }
 */
export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<LlmConfig>;
    const override: Partial<LlmConfig> = {};
    if (body.baseUrl) override.baseUrl = body.baseUrl;
    if (body.model) override.model = body.model;
    if (body.apiKey) override.apiKey = body.apiKey;
    const thinking = body.thinking;

    const result = await chat({
      prompt: '只回复两个字：OK',
      maxTokens: 256,
      timeoutMs: 15_000,
      override,
      thinking:
        thinking === 'disabled' || thinking === 'enabled' || thinking === 'auto'
          ? thinking
          : 'disabled',
    });
    return NextResponse.json({
      ok: true,
      data: { reply: result.text.slice(0, 200), latencyMs: Date.now() - started, usage: result.usage },
    });
  } catch (err) {
    if (err instanceof LlmNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : '连通性测试失败';
    return NextResponse.json({ ok: false, error: msg, latencyMs: Date.now() - started }, { status: 502 });
  }
}
