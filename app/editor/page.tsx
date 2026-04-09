'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { Editor } from '@/components/Editor';
import { ShareModal } from '@/components/ShareModal';
import { Button } from '@/components/ui/button';
import { Preview } from '@/components/Preview';
import { Trash2, Share2, Eye, PanelRightClose, PanelRightOpen, FileText } from 'lucide-react';

interface ArticleData {
  path: string;
  id: string;
  content: string;
}

interface FolderItem {
  name: string;
  path: string;
  isFolder: boolean;
  title?: string;
  updatedAt?: string;
  childCount?: number;
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
  const [showPreview, setShowPreview] = useState(true);
  const [editorWidthPercent, setEditorWidthPercent] = useState<number>(50);
  const [draggingEditor, setDraggingEditor] = useState(false);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [folderContents, setFolderContents] = useState<FolderItem[]>([]);

  const contentRef = useRef(content);
  const pathRef = useRef(currentPath);
  const savedRef = useRef(saved);
  const savingRef = useRef(false);
  const queuedAutoSaveRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingSidebarRef = useRef(false);
  const draggingEditorRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
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
    if (typeof window === 'undefined') return;
    const cached = window.localStorage.getItem('editor_width_percent');
    if (!cached) return;
    const parsed = Number(cached);
    if (!Number.isNaN(parsed)) {
      setEditorWidthPercent(Math.min(80, Math.max(20, parsed)));
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
    if (!idFromUrl && !pathFromUrl) return;
    if (idFromUrl && currentArticleIdRef.current === idFromUrl) return;
    if (pathFromUrl && pathFromUrl === pathRef.current) return;
    setCurrentType('article');
    setFolderPath(null);
    setFolderContents([]);
    if (idFromUrl) {
      void loadArticle({ id: idFromUrl });
      return;
    }
    if (pathFromUrl) {
      void loadArticle({ path: pathFromUrl });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadArticle]);

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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('editor_width_percent', String(editorWidthPercent));
    }
  }, [editorWidthPercent]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (draggingSidebarRef.current) {
        const next = Math.min(560, Math.max(240, event.clientX));
        setSidebarWidth(next);
      }
      if (draggingEditorRef.current && editorContainerRef.current) {
        const rect = editorContainerRef.current.getBoundingClientRect();
        const relativeX = event.clientX - rect.left;
        const percent = Math.min(80, Math.max(20, (relativeX / rect.width) * 100));
        setEditorWidthPercent(percent);
      }
    };

    const onMouseUp = () => {
      const wasDragging = draggingSidebarRef.current || draggingEditorRef.current;
      if (draggingSidebarRef.current) {
        draggingSidebarRef.current = false;
        setDraggingSidebar(false);
      }
      if (draggingEditorRef.current) {
        draggingEditorRef.current = false;
        setDraggingEditor(false);
      }
      if (wasDragging) {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
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

  const startEditorDrag = () => {
    draggingEditorRef.current = true;
    setDraggingEditor(true);
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

  const loadFolderContents = useCallback(async (folderPath: string) => {
    try {
      const res = await fetch(`/api/folders?path=${encodeURIComponent(folderPath)}`);
      const json = await res.json();
      if (json.ok) {
        setFolderContents(json.data);
      }
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    }
  }, []);

  const handleMoveItem = async (oldPath: string, newParentPath: string, isFolder: boolean) => {
    // 如果当前正在编辑被移动的文档，更新路径
    if (currentPath === oldPath) {
      const newPath = newParentPath ? `${newParentPath}/${oldPath.split('/').pop()}` : oldPath.split('/').pop() || '';
      setCurrentPath(newPath);
      if (articleData) {
        setArticleData({ ...articleData, path: newPath });
      }
      // 更新 URL
      if (articleData?.id) {
        router.replace(`/editor?id=${encodeURIComponent(articleData.id)}`);
      } else {
        router.replace(`/editor?path=${encodeURIComponent(newPath)}`);
      }
    }
    return true;
  };

  const handleSelectItem = (itemPath: string, isFolder: boolean) => {
    if (isFolder) {
      if (itemPath === folderPath) return;
      currentArticleIdRef.current = null;
      pathRef.current = '';
      setCurrentPath('');
      setArticleData(null);
      setContent('');
      setSaved(true);
      setSaveState('saved');
      setCurrentType('folder');
      setFolderPath(itemPath);
      window.history.replaceState(null, '', '/editor');
      void loadFolderContents(itemPath);
    } else {
      if (itemPath === currentPath) return;
      setFolderPath(null);
      setFolderContents([]);
      setCurrentPath(itemPath);
      setCurrentType('article');
      void loadArticle({ path: itemPath });
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
    const name = prompt('输入新文档名称:');
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
    const name = prompt('输入新父文档名称:');
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
          onMoveItem={handleMoveItem}
          selectedPath={currentPath || folderPath || ''}
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
            <p className="text-sm text-gray-500 truncate">{currentPath || folderPath || '未选择文档'}</p>
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
              onClick={() => setShowPreview((prev) => !prev)}
              disabled={!currentPath}
              variant="outline"
              size="sm"
              title={showPreview ? '隐藏预览' : '显示预览'}
            >
              {showPreview ? <PanelRightClose className="h-4 w-4 mr-1" /> : <PanelRightOpen className="h-4 w-4 mr-1" />}
              预览
            </Button>
            <Button
              onClick={() => router.push(articleData?.id ? `/view?id=${encodeURIComponent(articleData.id)}` : '/view')}
              disabled={!articleData}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-1" /> 查看
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
          <div ref={editorContainerRef} className="flex-1 min-h-0 flex">
            <div
              style={{ width: showPreview ? `${editorWidthPercent}%` : '100%' }}
              className="min-w-0 border-r border-gray-200"
            >
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
            {showPreview && (
              <>
                <div
                  className={`h-full w-1.5 cursor-col-resize bg-slate-200 transition-colors flex-shrink-0 ${
                    draggingEditor ? 'bg-blue-400' : 'hover:bg-slate-300'
                  }`}
                  onMouseDown={startEditorDrag}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="调整编辑区和预览区宽度"
                />
                <div style={{ width: `${100 - editorWidthPercent}%` }} className="min-w-0 h-full overflow-auto">
                  <Preview content={content} />
                </div>
              </>
            )}
          </div>
        ) : folderPath !== null ? (
          <div className="flex-1 overflow-auto bg-white">
            {/* Notion 风格标题区 */}
            <div className="max-w-[900px] mx-auto px-24 pt-20 pb-8">
              <div className="text-5xl mb-4">
                {folderContents.length > 0 ? '\uD83D\uDCC2' : '\uD83D\uDCC4'}
              </div>
              <h1 className="text-[40px] font-bold text-[#37352f] leading-tight tracking-tight">
                {folderPath.split('/').pop()}
              </h1>
              {folderPath.includes('/') && (
                <p className="text-sm text-[#9b9a97] mt-2">
                  {folderPath.split('/').slice(0, -1).join(' / ')}
                </p>
              )}
            </div>

            {/* 子文档列表 */}
            <div className="max-w-[900px] mx-auto px-24 pb-20">
              {folderContents.length === 0 ? (
                <p className="text-[#9b9a97] text-sm py-3">暂无子文档</p>
              ) : (
                <div>
                  <div className="flex items-center px-2 py-1.5 text-xs text-[#9b9a97] uppercase tracking-wider border-b border-[#e9e9e7]">
                    <span className="flex-1">名称</span>
                    <span className="w-28 text-right">更新时间</span>
                  </div>
                  {folderContents.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleSelectItem(item.path, item.isFolder)}
                      className="w-full text-left px-2 py-1.5 flex items-center rounded-[3px] hover:bg-[#f1f1ef] transition-colors group"
                    >
                      <span className="text-base mr-2 flex-shrink-0 opacity-80">
                        {item.isFolder ? '\uD83D\uDCC2' : '\uD83D\uDCC4'}
                      </span>
                      <span className="text-sm text-[#37352f] truncate flex-1 min-w-0 group-hover:underline">
                        {item.title || item.name}
                      </span>
                      {item.isFolder && item.childCount !== undefined && (
                        <span className="text-xs text-[#9b9a97] flex-shrink-0 mr-4">
                          {item.childCount} 篇
                        </span>
                      )}
                      {item.updatedAt && (
                        <span className="w-28 text-right text-xs text-[#9b9a97] flex-shrink-0">
                          {new Date(item.updatedAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">选择或创建一篇文档开始编辑</p>
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
