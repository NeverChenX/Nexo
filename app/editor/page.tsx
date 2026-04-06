'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { ShareModal } from '@/components/ShareModal';
import { Button } from '@/components/ui/button';
import { Trash2, Share2, Eye } from 'lucide-react';

interface ArticleData {
  path: string;
  id: string;
  content: string;
}

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentType, setCurrentType] = useState<'article' | 'folder'>('article');
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(true);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string>('');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [draggingSidebar, setDraggingSidebar] = useState(false);

  const contentRef = useRef(content);
  const pathRef = useRef(currentPath);
  const savedRef = useRef(saved);
  const savingRef = useRef(false);
  const queuedAutoSaveRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingSidebarRef = useRef(false);
  const latestLoadSeqRef = useRef(0);
  const currentArticleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = window.localStorage.getItem('editor_sidebar_width');
    if (!cached) return;
    const parsed = Number(cached);
    if (!Number.isNaN(parsed)) {
      setSidebarWidth(Math.min(560, Math.max(240, parsed)));
    }
  }, []);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    pathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    currentArticleIdRef.current = articleData?.id || null;
  }, [articleData?.id]);

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
          setArticleData(json.data);
          setContent(json.data.content);
          setCurrentPath(json.data.path);
          setSaved(true);
          setSaveState('saved');
          setSaveError('');
          setLastSavedAt(Date.now());
          if (json.data.id) {
            router.replace(`/editor?id=${encodeURIComponent(json.data.id)}`);
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
    setCurrentType('article');
    if (idFromUrl) {
      void loadArticle({ id: idFromUrl });
      return;
    }
    if (pathFromUrl) {
      void loadArticle({ path: pathFromUrl });
    }
  }, [searchParams, currentPath, loadArticle]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('editor_sidebar_width', String(sidebarWidth));
    }
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!draggingSidebarRef.current) return;
      const next = Math.min(560, Math.max(240, event.clientX));
      setSidebarWidth(next);
    };

    const onMouseUp = () => {
      if (!draggingSidebarRef.current) return;
      draggingSidebarRef.current = false;
      setDraggingSidebar(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startSidebarDrag = () => {
    draggingSidebarRef.current = true;
    setDraggingSidebar(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const saveArticle = useCallback(async (force = false) => {
    const path = pathRef.current;
    if (!path) return;
    if (!force && savedRef.current) return;

    if (savingRef.current) {
      queuedAutoSaveRef.current = true;
      return;
    }

    savingRef.current = true;
    setSaveState('saving');
    setSaveError('');

    try {
      const res = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: contentRef.current }),
      });
      const json = await res.json();
      if (json.ok) {
        setSaved(true);
        savedRef.current = true;
        setSaveState('saved');
        setLastSavedAt(Date.now());
      } else {
        setSaveState('error');
        setSaveError(json.error || '保存失败');
        setTimeout(() => {
          if (!savedRef.current && pathRef.current) {
            void saveArticle();
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveState('error');
      setSaveError(String(error));
      setTimeout(() => {
        if (!savedRef.current && pathRef.current) {
          void saveArticle();
        }
      }, 3000);
    } finally {
      savingRef.current = false;
      if (queuedAutoSaveRef.current) {
        queuedAutoSaveRef.current = false;
        if (!savedRef.current) {
          void saveArticle();
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!currentPath || saved || loading) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      void saveArticle();
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentPath, content, saved, loading, saveArticle]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveArticle(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveArticle]);

  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      if (path === currentPath) return;
      setCurrentPath(path);
      setCurrentType('article');
      void loadArticle({ path });
    }
  };

  const handleDelete = async () => {
    if (!currentPath || !confirm('确定要删除吗？')) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(currentPath)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.ok) {
        setCurrentPath('');
        setContent('');
        setArticleData(null);
        setSaved(true);
        setSaveState('saved');
        setSaveError('');
        setLastSavedAt(null);
        router.replace('/editor');
        alert('删除成功');
        setRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('删除失败: ' + error);
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
          setArticleData(json.data);
          setSaved(true);
          setSaveState('saved');
          setSaveError('');
          setLastSavedAt(Date.now());
          if (json.data?.id) {
            router.replace(`/editor?id=${encodeURIComponent(json.data.id)}`);
          }
          setRefreshKey((prev) => prev + 1);
          alert('创建成功');
        } else {
          alert('创建失败: ' + json.error);
        }
      } catch (error) {
        console.error('Failed to create article:', error);
        alert('创建失败: ' + error);
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
          setRefreshKey((prev) => prev + 1);
          alert('创建成功');
        } else {
          alert('创建失败: ' + json.error);
        }
      } catch (error) {
        console.error('Failed to create folder:', error);
        alert('创建失败: ' + error);
      }
    }
  };

  const formatRelativeTime = (time: number | null): string => {
    if (!time) return '未保存';
    const diffSeconds = Math.max(0, Math.floor((nowTs - time) / 1000));
    if (diffSeconds < 5) return '刚刚';
    if (diffSeconds < 60) return `${diffSeconds}秒前`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
  };

  const relativeTime = formatRelativeTime(lastSavedAt);
  const lastSavedText = currentPath ? `上次保存 ${relativeTime}` : '';
  const saveStatusText =
    saveState === 'dirty'
      ? `正在输入… ${lastSavedText}`
      : saveState === 'saving'
        ? `自动保存中… ${lastSavedText}`
        : saveState === 'error'
          ? `自动保存失败，3 秒后重试 ${lastSavedText}`
          : lastSavedText
            ? `已自动保存 ${relativeTime}`
            : '';

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <div style={{ width: `${sidebarWidth}px` }} className="h-full flex-shrink-0 min-w-0">
        <TreeMenu
          key={refreshKey}
          onSelectItem={handleSelectItem}
          onCreateArticle={handleCreateArticle}
          onCreateFolder={handleCreateFolder}
          selectedPath={currentPath}
          className="h-full w-full border-r-0"
        />
      </div>
      <div
        className={`h-full w-1 cursor-col-resize bg-slate-200 transition-colors ${
          draggingSidebar ? 'bg-blue-400' : 'hover:bg-slate-300'
        }`}
        onMouseDown={startSidebarDrag}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整左侧菜单宽度"
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 truncate">{currentPath || '未选择文章'}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-xs whitespace-nowrap ${
                saveState === 'error' ? 'text-red-500' : 'text-gray-500'
              }`}
              title={saveError || '自动保存状态'}
            >
              {saveStatusText}
            </span>
            <Button
              onClick={() => router.push(articleData?.id ? `/view?id=${encodeURIComponent(articleData.id)}` : '/view')}
              disabled={!articleData}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-1" /> 预览
            </Button>
            <Button
              onClick={() => setShareModalOpen(true)}
              disabled={!currentPath}
              variant="outline"
              size="sm"
            >
              <Share2 className="h-4 w-4 mr-1" /> 分享
            </Button>
            <Button onClick={handleDelete} disabled={!currentPath} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1" /> 删除
            </Button>
          </div>
        </div>

        {currentPath ? (
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            <div className="flex-1 min-h-0 md:border-r border-gray-200 bg-white">
              <Editor
                content={content}
                onChange={(newContent) => {
                  setContent(newContent);
                  setSaved(false);
                  savedRef.current = false;
                  setSaveState('dirty');
                  setSaveError('');
                }}
              />
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-white">
              {content ? <Preview content={content} /> : <div className="p-6 text-gray-400">无内容预览</div>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">选择或创建一篇文章开始编辑</p>
          </div>
        )}
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
