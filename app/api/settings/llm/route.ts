import { NextRequest, NextResponse } from 'next/server';
import { getLlmConfigPublic, updateLlmConfig, type LlmConfig } from '@/lib/llm/config';

/**
 * GET  /api/settings/llm  → 返回当前配置（apiKey 明文，本地单用户部署）
 * PUT  /api/settings/llm  → 更新配置（仅写 wiki-data/_config/llm.json）
 *
 * 认证策略：与其他 AI 路由保持一致（本地单用户部署，同源调用）。
 */

export async function GET() {
  try {
    const data = await getLlmConfigPublic();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '读取配置失败';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<LlmConfig> & { apiKey?: string | null };
    await updateLlmConfig({
      baseUrl: body.baseUrl,
      model: body.model,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      timeoutMs: body.timeoutMs,
      thinking: body.thinking,
      apiKey: body.apiKey,
    });
    const data = await getLlmConfigPublic();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '保存配置失败';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
