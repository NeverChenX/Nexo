'use client';

import { useState, useEffect } from 'react';
import { Preview } from '@/components/Preview';
import { useParams } from 'next/navigation';

interface ShareData {
  type: 'article' | 'folder';
  path: string;
  content?: string;
  contents?: Array<any>;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedContent = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const json = await res.json();

        if (json.ok) {
          setShareData(json.data);
        } else {
          setError(json.error || '加载失败');
        }
      } catch (err) {
        setError('加载失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSharedContent();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>没有内容</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div className="preview-area prose prose-sm max-w-4xl mx-auto py-8">
        {shareData.type === 'article' ? (
          <Preview content={shareData.content || ''} />
        ) : (
          <div>
            <h1 className="text-3xl font-bold mb-4">{shareData.path}</h1>
            <div className="border rounded p-4">
              {shareData.contents && shareData.contents.length > 0 ? (
                <ul className="list-disc list-inside">
                  {shareData.contents.map((item: any) => (
                    <li key={item.path} className="mb-2">
                      {item.isFolder ? '📁' : '📄'} {item.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>该文件夹为空</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
