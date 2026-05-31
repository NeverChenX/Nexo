'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// 已删除的功能路径前缀；命中后渲染本地 404 UI，不再静默跳转到 /editor。
const DEAD_PREFIXES = new Set(['read', 'reader', 'clip']);

export default function CatchAllPage() {
  const router = useRouter();
  const params = useParams();
  const slugParts = (params.slug as string[]) || [];
  const isDeadRoute = slugParts.length > 0 && DEAD_PREFIXES.has(slugParts[0]);

  useEffect(() => {
    if (isDeadRoute) return;
    if (slugParts.length === 0) {
      router.replace('/editor');
      return;
    }

    // 如果 slug 全是 8 位 base36 ID 格式，当作 ID 链直接跳转
    const isIdChain = slugParts.every((s) => /^[a-z0-9]{6,16}$/.test(s));
    if (isIdChain) {
      router.replace(`/editor/${slugParts.join('/')}`);
      return;
    }

    // 否则当作旧的中文路径，通过 path 参数跳转
    // API 会通过 path 加载文章并返回 idChain，前端会自动 replaceState
    let docPath = slugParts.map(decodeURIComponent).join('/');
    if (docPath.endsWith('.md')) {
      docPath = docPath.slice(0, -3);
    }

    fetch(`/api/articles?path=${encodeURIComponent(docPath)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data?.idChain) {
          router.replace(`/editor/${json.data.idChain}`);
        } else {
          router.replace('/editor');
        }
      })
      .catch(() => {
        router.replace('/editor');
      });
  }, [isDeadRoute, slugParts, router]);

  if (isDeadRoute) {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--c-bacPri)' }}
      >
        <div style={{ fontSize: '72px', fontWeight: 700, color: 'var(--c-texTer)', letterSpacing: '-0.04em', lineHeight: 1 }}>404</div>
        <div style={{ fontSize: '14px', color: 'var(--c-texTer)', marginTop: '12px', marginBottom: '20px' }}>
          该功能已下线
        </div>
        <a
          href="/editor"
          style={{ fontSize: '13px', color: 'var(--c-texSec)', textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.2)', textUnderlineOffset: '3px' }}
        >
          返回编辑器
        </a>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex items-center justify-center"
      style={{ color: 'var(--c-texDis)' }}
    >
      跳转中...
    </div>
  );
}
