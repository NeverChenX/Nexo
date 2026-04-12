'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

interface ShareTreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children?: ShareTreeItem[];
}

interface ShareData {
  type: 'article' | 'folder';
  path: string;
  content?: string;
  contents?: ShareTreeItem[];
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
      } finally {
        setLoading(false);
      }
    };

    loadSharedContent();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bacPri)' }}>
        <div style={{ color: 'var(--c-texTer)' }}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bacPri)' }}>
        <div
          className="flex gap-3 p-6 rounded-lg max-w-md"
          style={{ border: '1px solid var(--c-borPri)', color: 'var(--nx-red)' }}
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bacPri)' }}>
        <p style={{ color: 'var(--c-texDis)' }}>没有内容</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bacPri)', paddingTop: '48px', paddingBottom: '80px' }}>
      <div className="nx-layout">
        <div className="nx-layout-content">
          {shareData.type === 'article' ? (
            <div className="nx-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {shareData.content || ''}
              </ReactMarkdown>
            </div>
          ) : (
            <div>
              <h1 style={{ fontSize: '1.875em', fontWeight: 700, color: 'var(--c-texPri)', marginBottom: '16px' }}>
                {shareData.path}
              </h1>
              {shareData.contents && shareData.contents.length > 0 ? (
                <div>
                  <h2 style={{ fontSize: '1.25em', fontWeight: 600, color: 'var(--c-texPri)', marginBottom: '12px' }}>文件列表</h2>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {shareData.contents.map((item: ShareTreeItem) => (
                      <li
                        key={item.path}
                        className="nx-hoverable flex items-center gap-2 px-2 py-1.5 rounded"
                      >
                        <span style={{ fontSize: '14px' }}>{item.isFolder ? '📁' : '📄'}</span>
                        <span style={{ color: 'var(--c-texPri)', fontSize: '14px' }}>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ color: 'var(--c-texDis)' }}>该文件夹为空</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
