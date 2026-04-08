import { NextRequest, NextResponse } from 'next/server';

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

    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL ?? 'http://127.0.0.1:18789';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN ?? '';

    const res = await fetch(`${gatewayUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: 'openclaw/main',
        input: `请解释以下内容（简明扼要）：\n\n${text}`,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `openclaw 响应错误: ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    const explanation: string =
      json?.output?.[0]?.content?.[0]?.text ?? json?.output?.[0]?.content ?? '';

    if (!explanation) {
      return NextResponse.json({ ok: false, error: 'openclaw 未返回解释内容' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, data: { explanation } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ ok: false, error: `调用 openclaw 失败: ${message}` }, { status: 500 });
  }
}
