'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { TreeMenu } from '@/components/TreeMenu';
import { ReadTOC } from '@/components/ReadTOC';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

function ImageLightbox({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!src) return null;
  return (
    <>
      <img src={src} alt={alt || ''} onClick={() => setOpen(true)} />
      {open && (
        <div className="image-lightbox-overlay" role="dialog" aria-label="Image preview" onClick={() => setOpen(false)}>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            style={{ position: 'fixed', top: '16px', right: '16px', color: '#fff', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}
            aria-label="Close"
          >
            ✕
          </button>
          <img src={src} alt={alt || ''} />
        </div>
      )}
    </>
  );
}

function ReadPageInner() {
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [content, setContent] = useState('');
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  const loadSeqRef = useRef(0);

  const loadArticle = useCallback(async (articlePath: string) => {
    if (!articlePath) return;
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);
    setContent('');
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(articlePath)}`);
      if (seq !== loadSeqRef.current) return; // 竞态保护
      const json = (await res.json()) as {
        ok: boolean;
        data?: { content: string; path: string };
        error?: string;
      };
      if (seq !== loadSeqRef.current) return;
      if (json.ok && json.data) {
        setContent(json.data.content);
        const parts = articlePath.split('/');
        const filename = parts[parts.length - 1]
          .replace(/\.md$/, '')
          .replace(/^_index$/, parts[parts.length - 2] ?? '');
        setTitle(filename);
      } else {
        setError(json.error || t('read.loadFailed'));
      }
    } catch {
      if (seq === loadSeqRef.current) setError(t('read.networkError'));
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
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
    if (articleRef.current) articleRef.current.scrollTop = 0;
  };

  const safeUrlTransform = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    // 相对路径直接放行
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('#')) return trimmed;
    try {
      const parsed = new URL(trimmed, 'https://placeholder.invalid');
      const safe = new Set(['http:', 'https:', 'mailto:']);
      if (!safe.has(parsed.protocol)) return '';
      return trimmed;
    } catch {
      return trimmed;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--c-bacPri)' }}>
      {/* 手机端侧栏遮罩 */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 左侧栏 */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          flex flex-col
          transition-all duration-200
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-4 lg:overflow-hidden' : 'w-60 overflow-hidden'}
        `}
        style={{ background: 'var(--c-bacSec)', boxShadow: 'inset -1px 0 0 0 var(--c-borSec)' }}
      >
        {/* 桌面端：展开状态头部 */}
        {!sidebarCollapsed && (
          <div
            className="hidden lg:flex items-center justify-between px-3 py-2.5 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--c-borSec)' }}
          >
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-texSec)' }}>{t('read.catalog')}</span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="nx-hoverable p-1 rounded"
              style={{ color: 'var(--c-icoSec)' }}
              title={t('read.collapseSidebar')}
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
              className="nx-hoverable p-1 rounded"
              style={{ color: 'var(--c-icoSec)' }}
              title={t('read.expandSidebar')}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 手机端头部 */}
        <div
          className="lg:hidden flex items-center justify-between px-3 py-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--c-borSec)' }}
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-texSec)' }}>目录</span>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--c-icoSec)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 文章树 */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto">
            <TreeMenu
              mode="read"
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
        <header
          className="flex items-center justify-between px-4 flex-shrink-0 lg:hidden"
          style={{ height: '44px', background: 'var(--c-bacPri)', borderBottom: '1px solid var(--c-borSec)' }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="nx-hoverable p-1.5 rounded"
            style={{ color: 'var(--c-icoSec)' }}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate max-w-[200px]" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--c-texPri)' }}>
            {title || t('read.selectArticle')}
          </span>
          <div className="w-9" />
        </header>

        {/* Nexo 风格扁平布局 */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 文章内容 */}
          <article ref={articleRef} className="flex-1 min-w-0 overflow-y-auto" style={{ paddingTop: '32px', paddingBottom: '80px' }}>
            <div className="nx-layout">
              <div className="nx-layout-content">
                {/* 面包屑 */}
                {currentPath && (
                  <div className="flex items-center gap-1 mb-2" style={{ paddingBottom: '12px' }}>
                    {currentPath.split('/').map((seg, i, arr) => {
                      const isLast = i === arr.length - 1;
                      const segPath = arr.slice(0, i + 1).join('/');
                      return (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span style={{ color: 'var(--c-texDis)', fontSize: '12px' }}>/</span>}
                          {isLast ? (
                            <span style={{ fontSize: '12px', color: 'var(--c-texSec)' }}>
                              {seg.replace(/\.md$/, '')}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSelectItem(segPath, true)}
                              className="nx-hoverable rounded px-0.5"
                              style={{ fontSize: '12px', color: 'var(--c-texTer)' }}
                            >
                              {seg.replace(/\.md$/, '')}
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {loading && (
                  <div style={{ color: 'var(--c-texTer)', fontSize: '14px' }}>{t('common.loadingEllipsis')}</div>
                )}

                {!loading && error && (
                  <div className="text-center" style={{ padding: '40px 0' }}>
                    <p style={{ fontSize: '14px', color: 'var(--nx-red)' }}>{error}</p>
                  </div>
                )}

                {!loading && !content && !error && (
                  <div className="text-center" style={{ padding: '80px 0' }}>
                    <p style={{ fontSize: '16px', color: 'var(--c-texTer)', marginBottom: '8px' }}>{t('read.selectArticle')}</p>
                    <p style={{ fontSize: '14px', color: 'var(--c-texDis)' }}>{t('read.selectFromSidebar')}</p>
                  </div>
                )}

                {!loading && content && (
                  <div className="nx-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[
                        rehypeSlug,
                        [rehypeSanitize, { ...defaultSchema, attributes: { ...defaultSchema.attributes, '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'className'] } }],
                      ]}
                      urlTransform={safeUrlTransform}
                      components={{
                        img: ({ src, alt }) => <ImageLightbox src={src} alt={alt} />,
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* 右侧目录（仅超宽桌面端） */}
          {content && (
            <aside className="hidden xl:block flex-shrink-0 overflow-y-auto" style={{ width: '220px', paddingTop: '32px', paddingRight: '16px' }}>
              <div className="sticky" style={{ top: '32px' }}>
                <ReadTOC contentKey={currentPath} containerSelector=".nx-content" />
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
        <div className="flex h-screen items-center justify-center" style={{ color: 'var(--c-texDis)' }}>
          加载中...
        </div>
      }
    >
      <ReadPageInner />
    </Suspense>
  );
}
