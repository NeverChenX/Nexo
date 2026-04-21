import { NextRequest, NextResponse } from 'next/server';

/**
 * 验证外部 API 调用的 API Key。
 * 从环境变量 WIKI_API_KEY 读取，通过 Authorization: Bearer <key> 头传递。
 */
export function verifyApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.WIKI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: '服务端未配置 WIKI_API_KEY，请在 .env.local 中设置' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { ok: false, error: '缺少 Authorization 头，格式: Bearer <your-api-key>' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (token !== apiKey) {
    return NextResponse.json(
      { ok: false, error: 'API Key 无效' },
      { status: 403 }
    );
  }

  return null; // 验证通过
}
