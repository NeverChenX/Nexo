'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function CatchAllPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const slugParts = params.slug as string[];
    if (!slugParts || slugParts.length === 0) {
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

    // 通过 API 查询获取 ID 后跳转
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
  }, [params, router]);

  return (
    <div
      className="h-screen flex items-center justify-center"
      style={{ color: 'var(--c-texDis)' }}
    >
      跳转中...
    </div>
  );
}
