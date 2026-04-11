'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { TreeMenu } from '@/components/TreeMenu';
import { ReadTOC } from '@/components/ReadTOC';
import { Menu, X, PenLine, ChevronLeft, ChevronRight } from 'lucide-react';

function ReadPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('请选择一篇文章');
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshKey] = useState(0);
  const articleRef = useRef<HTMLElement>(null);

  const loadArticle = useCallback(async (path: string) => {
    if (!path) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: { content: string; path: string };
      };
      if (json.ok && json.data) {
        setContent(json.data.content);
        const parts = path.split('/');
        const filename = parts[parts.length - 1]
          .replace(/\.md$/, '')
          .replace(/^_index$/, parts[parts.length - 2] ?? '');
        setTitle(filename);
      }
    } catch {
      // 加载失败静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const path = searchParams.get('path') ?? '';
    setCurrentPath(path);
    if (path) void loadArticle(path);
  }, [searchParams, loadArticle]);

  const handleSelectItem = (itemPath: string, _isFolder: boolean) => {
    setCurrentPath(itemPath);
    void loadArticle(itemPath);
    const url = new URL(window.location.href);
    url.searchParams.set('path', itemPath);
    window.history.replaceState(null, '', url.toString());
    setMobileSidebarOpen(false);
    // 滚动到顶部
    if (articleRef.current) articleRef.current.scrollTop = 0;
  };

  const safeUrlTransform = (url: string): string => {
    const next = url.trim();
    if (!next) return '';
    if (next.toLowerCase().startsWith('javascript:')) return '';
    return next;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 手机端侧栏遮罩 */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 左侧栏 */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          flex flex-col bg-[#f7f6f3] border-r border-gray-200
          transition-all duration-200
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-4 overflow-hidden' : 'w-60'}
        `}
      >
        {/* 桌面端：展开状态头部 */}
        {!sidebarCollapsed && (
          <div className="hidden lg:flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">文章</span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded hover:bg-gray-200 text-gray-400"
              title="折叠侧栏"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 桌面端：折叠状态展开按钮 */}
        {sidebarCollapsed && (
          <div className="hidden lg:flex flex-col items-center py-3">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-1 rounded hover:bg-gray-200 text-gray-400"
              title="展开侧栏"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 手机端头部 */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">文章</span>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-200 text-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 文章树 */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto">
            <TreeMenu
              onSelectItem={handleSelectItem}
              onCreateArticle={() => {}}
              selectedPath={currentPath}
              refreshKey={refreshKey}
            />
          </div>
        )}
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* 手机端 / iPad 顶部栏 */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-gray-100 flex-shrink-0 bg-white lg:hidden">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
            {title}
          </span>
          <button
            onClick={() =>
              router.push(
                currentPath
                  ? `/editor?path=${encodeURIComponent(currentPath)}`
                  : '/editor'
              )
            }
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            title="编辑此文章"
          >
            <PenLine className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 文章内容 */}
          <article ref={articleRef} className="flex-1 min-w-0 overflow-y-auto px-6 py-10 lg:py-12">
            <div className="mx-auto" style={{ maxWidth: '700px' }}>
              {/* 桌面端操作栏 */}
              <div className="hidden lg:flex items-center justify-between mb-8">
                <span className="text-xs text-gray-400 truncate max-w-sm">
                  {currentPath}
                </span>
                {currentPath && (
                  <button
                    onClick={() =>
                      router.push(
                        `/editor?path=${encodeURIComponent(currentPath)}`
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0 ml-4"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    编辑
                  </button>
                )}
              </div>

              {loading && (
                <div className="text-gray-400 text-sm">加载中...</div>
              )}

              {!loading && !content && (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg mb-2">选择一篇文章开始阅读</p>
                  <p className="text-sm">从左侧目录中选择文章</p>
                </div>
              )}

              {!loading && content && (
                <div className="read-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSlug]}
                    urlTransform={safeUrlTransform}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </article>

          {/* 右侧目录（仅超宽桌面端） */}
          {content && (
            <aside className="hidden xl:block w-52 flex-shrink-0 overflow-y-auto px-4 py-12 border-l border-gray-100">
              <div className="sticky top-12">
                <ReadTOC contentKey={currentPath} containerSelector=".read-content" />
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-gray-400">
          加载中...
        </div>
      }
    >
      <ReadPageInner />
    </Suspense>
  );
}
