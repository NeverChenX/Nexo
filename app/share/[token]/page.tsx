'use client';

import { useState, useEffect } from 'react';
import { Preview } from '@/components/Preview';
import { Card } from '@/components/ui/card';
import { useParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-600">加载中...</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-6 max-w-md">
          <div className="flex gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!shareData) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">没有内容</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {shareData.type === 'article' ? (
          <Card className="p-8">
            <Preview content={shareData.content || ''} />
          </Card>
        ) : (
          <Card className="p-8">
            <h1 className="text-3xl font-bold mb-6">{shareData.path}</h1>
            {shareData.contents && shareData.contents.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold mb-4">文件列表</h2>
                <ul className="space-y-2">
                  {shareData.contents.map((item: any) => (
                    <li key={item.path} className="flex items-center gap-2">
                      <span>{item.isFolder ? '📁' : '📄'}</span>
                      <span className="text-gray-700">{item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-400">该文件夹为空</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
