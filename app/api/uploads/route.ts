import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// 仅允许图片扩展名白名单，不回退到原始文件扩展名
const ALLOWED_EXTS = new Set(Object.values(MIME_EXT));

function getExtension(file: File): string {
  const byMime = MIME_EXT[file.type];
  if (byMime) return byMime;
  // MIME 类型不在白名单 → 回退到 png 而非原始扩展名（防止上传 .html/.svg 等）
  return 'png';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json(
        { ok: false, error: '缺少图片文件' },
        { status: 400 }
      );
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { ok: false, error: '仅支持图片文件' },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: '图片大小不能超过 10MB' },
        { status: 400 }
      );
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const ext = getExtension(image);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await image.arrayBuffer());

    await fs.writeFile(filepath, buffer);

    return NextResponse.json({
      ok: true,
      data: {
        url: `/uploads/${filename}`,
      },
    });
  } catch (error) {
    // 生产环境应使用结构化日志
    return NextResponse.json(
      { ok: false, error: '上传失败' },
      { status: 500 }
    );
  }
}
