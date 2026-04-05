'use client';

import { useState, useEffect } from 'react';
import { TreeMenu } from '@/components/TreeMenu';
import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { ShareModal } from '@/components/ShareModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Edit, Eye, Trash2, Share2, Save } from 'lucide-react';

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

  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      setCurrentPath(path);
      setCurrentType('article');
      loadArticle(path);
    }
  };

  const handleSave = async () => {
    if (!currentPath) return;
    try {
      const res = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath, content }),
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

  const handleDelete = async () => {
    if (!currentPath || !confirm('确定要删除吗？')) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(currentPath)}`, { method: 'DELETE' });
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

  const handleCreateArticle = async (folderPath: string) => {
    const name = prompt('输入新文章名称:');
    if (name) {
      const articlePath = folderPath ? `${folderPath}/${name}` : name;
      try {
        const res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: articlePath, content: '# ' + name }),
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
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50">
        <TreeMenu
          onSelectItem={handleSelectItem}
          onCreateArticle={handleCreateArticle}
          onCreateFolder={handleCreateFolder}
          selectedPath={currentPath}
        />

        <div className="flex-1 flex flex-col">
          <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-600">{currentPath || '未选择文章'}</p>
            </div>
            {!saved && <span className="text-xs text-red-500 font-medium">未保存</span>}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!currentPath || saved} size="sm" className="gap-2">
                <Save className="h-4 w-4" /> 保存
              </Button>
              <Button onClick={() => setShareModalOpen(true)} disabled={!currentPath} variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" /> 分享
              </Button>
              <Button onClick={handleDelete} disabled={!currentPath} variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" /> 删除
              </Button>
            </div>
          </div>

          {currentPath ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="edit" className="flex flex-col h-full">
                <TabsList className="w-full rounded-none border-b bg-white">
                  <TabsTrigger value="edit" className="gap-2">
                    <Edit className="h-4 w-4" /> 编辑
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" /> 预览
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="flex-1 overflow-hidden">
                  <Editor content={content} onChange={(newContent) => { setContent(newContent); setSaved(false); }} />
                </TabsContent>

                <TabsContent value="preview" className="flex-1 overflow-hidden">
                  <Preview content={content} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400">选择或创建一篇文章开始编辑</p>
            </div>
          )}
        </div>
      </div>

      {currentPath && (
        <ShareModal path={currentPath} type={currentType} isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} />
      )}
    </SidebarProvider>
  );
}
