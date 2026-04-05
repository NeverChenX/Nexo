'use client';

import { useState, useEffect } from 'react';
import { TreeMenu } from '@/components/TreeMenu';
import { Preview } from '@/components/Preview';

interface ArticleData {
  path: string;
  content: string;
}

export default function ViewPage() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 加载文章内容
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

  // 处理菜单项选择
  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      setCurrentPath(path);
      loadArticle(path);
    }
  };

  return (
    <div className="editor-container">
      <TreeMenu
        onSelectItem={handleSelectItem}
        onCreateArticle={() => {}}
        onCreateFolder={() => {}}
        selectedPath={currentPath}
      />

      <div className="content-container">
        <div className="toolbar">
          <span className="text-sm">{currentPath || '未选择文章'}</span>
          {loading && <span className="text-gray-500 text-sm">加载中...</span>}
        </div>

        <div className="flex-1">
          {content ? (
            <Preview content={content} />
          ) : (
            <div className="p-4 text-gray-500">选择一篇文章查看</div>
          )}
        </div>
      </div>
    </div>
  );
}
