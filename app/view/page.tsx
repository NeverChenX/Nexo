'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { Preview } from '@/components/Preview';
import { ShareModal } from '@/components/ShareModal';
import { Button } from '@/components/ui/button';
import { Pencil, Share2, Trash2 } from 'lucide-react';

export default function ViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const latestLoadSeqRef = useRef(0);
  const currentArticleIdRef = useRef<string | null>(null);
  const currentPathRef = useRef<string>('');

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
          currentPathRef.current = json.data.path;
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
    if (pathFromUrl && pathFromUrl === currentPathRef.current) return;
    if (idFromUrl) {
      void loadArticle({ id: idFromUrl });
      return;
    }
    if (pathFromUrl) {
      void loadArticle({ path: pathFromUrl });
    }
  }, [searchParams, loadArticle]);

  const handleDelete = async () => {
    if (!currentPath || !confirm('确定要删除吗？')) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(currentPath)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.ok) {
        setCurrentPath('');
        setArticleId(null);
        setContent('');
        router.replace('/view');
      } else {
        alert('删除失败: ' + json.error);
      }
    } catch (error) {
      alert('删除失败: ' + error);
    }
  };

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
          <Button
            onClick={() => setShareModalOpen(true)}
            disabled={!currentPath}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <Share2 className="h-4 w-4 mr-1" /> 分享
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!currentPath}
            variant="destructive"
            size="sm"
            className="flex-shrink-0"
          >
            <Trash2 className="h-4 w-4 mr-1" /> 删除
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <div
            className="h-full transition-opacity duration-150"
            style={{ opacity: loading ? 0.4 : 1 }}
          >
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
      {currentPath && (
        <ShareModal
          path={currentPath}
          type="article"
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
