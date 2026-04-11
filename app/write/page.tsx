'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TreeMenu } from '@/components/TreeMenu';
import { ArrowLeft, PanelLeft, PanelLeftClose } from 'lucide-react';

const Editor = dynamic(
  () => import('@/components/Editor').then((m) => ({ default: m.Editor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        加载编辑器...
      </div>
    ),
  }
);

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

function WritePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey] = useState(0);

  const contentRef = useRef(content);
  const pathRef = useRef(currentPath);
  const savingRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadArticle = useCallback(async (path: string) => {
    if (!path) return;
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: { content: string; path: string };
      };
      if (json.ok && json.data) {
        setContent(json.data.content);
        contentRef.current = json.data.content;
        setSaveState('saved');
      }
    } catch {
      // 加载失败静默处理
    }
  }, []);

  useEffect(() => {
    const path = searchParams.get('path') ?? '';
    setCurrentPath(path);
    pathRef.current = path;
    void loadArticle(path);
  }, [searchParams, loadArticle]);

  const saveArticle = useCallback(async () => {
    const path = pathRef.current;
    if (!path || savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentRef.current }),
      });
      const json = (await res.json()) as { ok: boolean };
      setSaveState(json.ok ? 'saved' : 'error');
    } catch {
      setSaveState('error');
    } finally {
      savingRef.current = false;
    }
  }, []);

  const handleContentChange = useCallback(
    (val: string) => {
      setContent(val);
      contentRef.current = val;
      setSaveState('dirty');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        void saveArticle();
      }, 2000);
    },
    [saveArticle]
  );

  // 组件卸载时清理自动保存定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        void saveArticle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveArticle]);

  const handleSelectItem = (itemPath: string, _isFolder: boolean) => {
    if (itemPath === currentPath) return;
    setCurrentPath(itemPath);
    pathRef.current = itemPath;
    void loadArticle(itemPath);
    const url = new URL(window.location.href);
    url.searchParams.set('path', itemPath);
    window.history.replaceState(null, '', url.toString());
  };

  const saveLabel: Record<SaveState, string> = {
    saved: '已保存',
    dirty: '未保存',
    saving: '保存中...',
    error: '保存失败',
  };

  const saveColor: Record<SaveState, string> = {
    saved: 'text-green-600',
    dirty: 'text-gray-400',
    saving: 'text-blue-500',
    error: 'text-red-500',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 侧栏遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧栏 */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 w-60 bg-[#f7f6f3] border-r border-gray-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
          <span className="text-sm font-medium text-gray-600">文章列表</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-200 text-gray-500"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TreeMenu
            onSelectItem={handleSelectItem}
            onCreateArticle={() => {}}
            selectedPath={currentPath}
            refreshKey={refreshKey}
          />
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between px-4 h-10 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                router.push(
                  currentPath
                    ? `/editor?path=${encodeURIComponent(currentPath)}`
                    : '/editor'
                )
              }
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              title="返回编辑器"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              title="打开侧栏"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-400 truncate max-w-xs">
              {currentPath || '未选择文章'}
            </span>
          </div>
          <span className={`text-xs ${saveColor[saveState]}`}>{saveLabel[saveState]}</span>
        </header>

        {/* 编辑器 */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 mx-auto w-full" style={{ maxWidth: '860px' }}>
            <Editor content={content} onChange={handleContentChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-gray-400">
          加载中...
        </div>
      }
    >
      <WritePageInner />
    </Suspense>
  );
}
