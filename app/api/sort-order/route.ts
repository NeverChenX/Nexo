import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ORDER_FILE = path.join(process.cwd(), 'wiki-data', '.order.json');

async function readOrders(): Promise<Record<string, string[]>> {
  try {
    const raw = await fs.readFile(ORDER_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET() {
  const orders = await readOrders();
  return NextResponse.json({ ok: true, data: orders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentPath, order } = body as { parentPath: string; order: string[] };

    if (!Array.isArray(order)) {
      return NextResponse.json({ ok: false, error: '无效的排序数据' }, { status: 400 });
    }

    const orders = await readOrders();
    orders[parentPath] = order;
    await fs.writeFile(ORDER_FILE, JSON.stringify(orders, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: '保存排序失败' }, { status: 500 });
  }
}
