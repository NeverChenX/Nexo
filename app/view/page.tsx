'use client';

import { useState, useEffect } from 'react';
import { TreeMenu } from '@/components/TreeMenu';
import { Preview } from '@/components/Preview';
import { SidebarProvider } from '@/components/ui/sidebar';

interface ArticleData {
  path: string;
  content: string;
}

export default function ViewPage() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const loadArticle = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`);
      const json = await res.json();
      if (json.ok) {
        setArticleData(json.data);
        setContent(json.data.content);
      }
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      setCurrentPath(path);
      loadArticle(path);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50">
        <TreeMenu onSelectItem={handleSelectItem} onCreateArticle={() => {}} onCreateFolder={() => {}} selectedPath={currentPath} />

        <div className="flex-1 flex flex-col">
          <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
            <p className="text-sm text-gray-600">{currentPath || '未选择文章'}</p>
            {loading && <span className="text-xs text-gray-400 ml-auto">加载中...</span>}
          </div>

          <div className="flex-1 overflow-auto">
            {content ? <Preview content={content} /> : <div className="flex items-center justify-center h-full"><p className="text-gray-400">选择一篇文章查看</p></div>}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
