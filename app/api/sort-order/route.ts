import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ORDER_FILE = path.join(process.cwd(), 'wiki-data', '.order.json');

// 进程内互斥锁，防止并发读-改-写丢失数据
let _lock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = _lock;
  let release: () => void;
  _lock = new Promise<void>((r) => { release = r; });
  return prev.then(fn).finally(() => release!());
}

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

    if (typeof parentPath !== 'string') {
      return NextResponse.json({ ok: false, error: 'parentPath 必须是字符串' }, { status: 400 });
    }
    if (!Array.isArray(order)) {
      return NextResponse.json({ ok: false, error: '无效的排序数据' }, { status: 400 });
    }

    await withLock(async () => {
      const orders = await readOrders();
      orders[parentPath] = order;
      await fs.writeFile(ORDER_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('保存排序失败:', error);
    return NextResponse.json({ ok: false, error: '保存排序失败' }, { status: 500 });
  }
}
