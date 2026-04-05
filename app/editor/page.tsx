'use client';

import { useState, useEffect } from 'react';
import { TreeMenu } from '@/components/TreeMenu';
import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { ShareModal } from '@/components/ShareModal';

interface ArticleData {
  path: string;
  content: string;
}

export default function EditorPage() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentType, setCurrentType] = useState<'article' | 'folder'>('article');
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // 加载文章内容
  const loadArticle = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`);
      const json = await res.json();
      if (json.ok) {
        setArticleData(json.data);
        setContent(json.data.content);
        setSaved(true);
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
      setCurrentType('article');
      loadArticle(path);
    }
  };

  // 保存文章
  const handleSave = async () => {
    if (!currentPath) return;

    try {
      const res = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          content,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSaved(true);
        alert('保存成功');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败');
    }
  };

  // 删除文章
  const handleDelete = async () => {
    if (!currentPath || !confirm('确定要删除吗？')) return;

    try {
      const res = await fetch(
        `/api/articles/${encodeURIComponent(currentPath)}`,
        { method: 'DELETE' }
      );

      const json = await res.json();
      if (json.ok) {
        setCurrentPath('');
        setContent('');
        setArticleData(null);
        alert('删除成功');
        location.reload();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('删除失败');
    }
  };

  // 创建文章
  const handleCreateArticle = async (folderPath: string) => {
    const name = prompt('输入新文章名称:');
    if (name) {
      const articlePath = folderPath ? `${folderPath}/${name}` : name;

      try {
        const res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: articlePath,
            content: '# ' + name,
          }),
        });

        const json = await res.json();
        if (json.ok) {
          setCurrentPath(articlePath);
          setCurrentType('article');
          setContent('# ' + name);
          setSaved(true);
          location.reload();
        }
      } catch (error) {
        console.error('Failed to create article:', error);
      }
    }
  };

  // 创建文件夹
  const handleCreateFolder = async (parentPath: string) => {
    const name = prompt('输入新文件夹名称:');
    if (name) {
      const folderPath = parentPath ? `${parentPath}/${name}` : name;

      try {
        const res = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: folderPath }),
        });

        const json = await res.json();
        if (json.ok) {
          alert('创建成功');
          location.reload();
        }
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    }
  };

  return (
    <div className="editor-container">
      <TreeMenu
        onSelectItem={handleSelectItem}
        onCreateArticle={handleCreateArticle}
        onCreateFolder={handleCreateFolder}
        selectedPath={currentPath}
      />

      <div className="content-container">
        <div className="toolbar">
          <span className="text-sm">{currentPath || '未选择文章'}</span>
          {!saved && <span className="text-red-500 text-sm">*未保存</span>}

          <div className="ml-auto flex gap-2">
            <button
              onClick={handleSave}
              disabled={!currentPath || saved}
              className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              保存
            </button>
            <button
              onClick={() => setShareModalOpen(true)}
              disabled={!currentPath}
              className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              分享
            </button>
            <button
              onClick={handleDelete}
              disabled={!currentPath}
              className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              删除
            </button>
          </div>
        </div>

        <div className="editor-main">
          <Editor
            content={content}
            onChange={(newContent) => {
              setContent(newContent);
              setSaved(false);
            }}
          />
          <Preview content={content} />
        </div>
      </div>

      {currentPath && (
        <ShareModal
          path={currentPath}
          type={currentType}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
