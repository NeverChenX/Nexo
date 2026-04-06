'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { Preview } from '@/components/Preview';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

export default function ViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const latestLoadSeqRef = useRef(0);
  const currentArticleIdRef = useRef<string | null>(null);

  const loadArticle = useCallback(
    async (params: { path?: string; id?: string }) => {
      const requestSeq = ++latestLoadSeqRef.current;
      setLoading(true);
      try {
        const query = params.path
          ? `path=${encodeURIComponent(params.path)}`
          : `id=${encodeURIComponent(params.id || '')}`;
        const res = await fetch(`/api/articles?${query}`);
        const json = await res.json();
        if (requestSeq !== latestLoadSeqRef.current) return;
        if (json.ok) {
          currentArticleIdRef.current = json.data.id || null;
          setCurrentPath(json.data.path);
          setArticleId(json.data.id || null);
          setContent(json.data.content);
          if (json.data.id) {
            router.replace(`/view?id=${encodeURIComponent(json.data.id)}`);
          }
        }
      } catch (error) {
        if (requestSeq !== latestLoadSeqRef.current) return;
        console.error('Failed to load article:', error);
      } finally {
        if (requestSeq === latestLoadSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [router]
  );

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    const pathFromUrl = searchParams.get('path');
    if (idFromUrl && currentArticleIdRef.current === idFromUrl) return;
    if (pathFromUrl && pathFromUrl === currentPath) return;
    if (idFromUrl) {
      void loadArticle({ id: idFromUrl });
      return;
    }
    if (pathFromUrl) {
      void loadArticle({ path: pathFromUrl });
    }
  }, [searchParams, currentPath, loadArticle]);

  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      if (path === currentPath) return;
      void loadArticle({ path });
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <TreeMenu
        onSelectItem={handleSelectItem}
        onCreateArticle={() => {}}
        onCreateFolder={() => {}}
        selectedPath={currentPath}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 truncate">{currentPath || '未选择文章'}</p>
          </div>
          {loading && <span className="text-xs text-gray-400 flex-shrink-0">加载中...</span>}
          <Button
            onClick={() => router.push(articleId ? `/editor?id=${encodeURIComponent(articleId)}` : '/editor')}
            disabled={!articleId}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <Pencil className="h-4 w-4 mr-1" /> 编辑
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {content ? (
            <Preview content={content} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">选择一篇文章查看</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
