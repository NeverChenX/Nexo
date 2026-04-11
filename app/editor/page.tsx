'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { Editor } from '@/components/Editor';
import { ShareModal } from '@/components/ShareModal';
import { CreateArticleModal } from '@/components/CreateArticleModal';
import { Button } from '@/components/ui/button';
import { Preview } from '@/components/Preview';
import { Trash2, Share2, Eye, PanelRightClose, PanelRightOpen, FileText, BookOpen, PenLine } from 'lucide-react';

interface ArticleData {
  path: string;
  id: string;
  content: string;
  isFolder?: boolean;
}

interface SubPage {
  name: string;
  path: string;
  isFolder: boolean;
}

function EditorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
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
  const [isCurrentFolder, setIsCurrentFolder] = useState(false);
  const [subPages, setSubPages] = useState<SubPage[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalParent, setCreateModalParent] = useState('');

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
          const isFolderPage = !!json.data.isFolder;
          setIsCurrentFolder(isFolderPage);
          if (isFolderPage) {
            try {
              const subRes = await fetch(`/api/folders?path=${encodeURIComponent(json.data.path)}`);
              const subJson = await subRes.json();
              if (subJson.ok) setSubPages(subJson.data);
            } catch { setSubPages([]); }
          } else {
            setSubPages([]);
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

  const handleSelectItem = (itemPath: string, _isFolder: boolean) => {
    if (itemPath === currentPath) return;
    setCurrentPath(itemPath);
    void loadArticle({ path: itemPath });
  };

  const handleDelete = async () => {
    if (!currentPath) return;
    const msg = isCurrentFolder ? '确定要删除吗？（子页面也会一并删除）' : '确定要删除吗？';
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(currentPath)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.ok) {
        setCurrentPath('');
        setContent('');
        setArticleData(null);
        setIsCurrentFolder(false);
        setSubPages([]);
        setSaved(true);
        setSaveState('saved');
        setSaveError('');
        setLastSavedAt(null);
        router.replace('/editor');
        setRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCreateArticle = (parentPath: string) => {
    setCreateModalParent(parentPath);
    setCreateModalOpen(true);
  };

  const handleCreateConfirm = async (name: string) => {
    setCreateModalOpen(false);
    const articlePath = createModalParent ? `${createModalParent}/${name}` : name;
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: articlePath, content: '# ' + name }),
      });
      const json = await res.json();
      if (json.ok) {
        setCurrentPath(articlePath);
        setIsCurrentFolder(false);
        setSubPages([]);
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
      }
    } catch (error) {
      console.error('Failed to create article:', error);
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
            <p className="text-sm text-gray-500 truncate">{currentPath || '未选择文档'}</p>
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
              onClick={() => router.push(currentPath ? `/write?path=${encodeURIComponent(currentPath)}` : '/write')}
              disabled={!currentPath}
              variant="outline"
              size="sm"
              title="无干扰写作模式"
            >
              <PenLine className="h-4 w-4 mr-1" /> 专注
            </Button>
            <Button
              onClick={() => router.push(currentPath ? `/read?path=${encodeURIComponent(currentPath)}` : '/read')}
              disabled={!currentPath}
              variant="outline"
              size="sm"
              title="阅读模式"
            >
              <BookOpen className="h-4 w-4 mr-1" /> 阅读
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
          <div ref={editorContainerRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div
                style={{ width: showPreview ? `${editorWidthPercent}%` : '100%' }}
                className="min-w-0 border-r border-gray-200 h-full"
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

            {isCurrentFolder && (
              <div className="border-t border-gray-100 bg-[#fbfbfa] flex-shrink-0 flex flex-col" style={{ maxHeight: '40%' }}>
                <div className="px-6 pt-3 pb-1 flex items-center justify-between flex-shrink-0">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    子页面 {subPages.length > 0 && <span className="text-slate-300 font-normal">({subPages.length})</span>}
                  </p>
                  <button
                    onClick={() => handleCreateArticle(currentPath)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded hover:bg-slate-100"
                  >
                    <span className="text-sm leading-none">+</span>
                    <span>新建子页面</span>
                  </button>
                </div>
                <div className="overflow-y-auto px-6 pb-3">
                  {subPages.length === 0 ? (
                    <p className="text-sm text-slate-400 py-1">暂无子页面</p>
                  ) : (
                    <div className="space-y-0.5">
                      {subPages.map((sub) => (
                        <button
                          key={sub.path}
                          onClick={() => handleSelectItem(sub.path, sub.isFolder)}
                          className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span>{sub.name || sub.path.split('/').pop()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
          type="article"
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
      <CreateArticleModal
        isOpen={createModalOpen}
        parentPath={createModalParent}
        onConfirm={handleCreateConfirm}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-400">加载中...</div>}>
      <EditorPageInner />
    </Suspense>
  );
}
