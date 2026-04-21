'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { TreeMenu } from '@/components/TreeMenu';
import { ReadTOC } from '@/components/ReadTOC';
import { Menu, X, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

// Mermaid 图表组件（懒加载 + 异步渲染）
function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
        const id = 'mermaid-' + Math.random().toString(36).slice(2, 8);
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setErr(null);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setErr(msg);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);
  if (err) {
    return (
      <pre style={{ background: 'rgba(224,62,62,0.04)', border: '1px solid rgba(224,62,62,0.15)', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: 'var(--nx-red)', whiteSpace: 'pre-wrap' }}>
        Mermaid 渲染失败: {err}{'\n\n'}{code}
      </pre>
    );
  }
  return <div ref={ref} style={{ margin: '12px 0', textAlign: 'center' }} />;
}

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  // 从 children 提取代码文本（ReactMarkdown 会把 <code> 包进来）
  const codeText = typeof children === 'string'
    ? children
    : (Array.isArray(children) ? children.map((c) => (typeof c === 'string' ? c : (c as any)?.props?.children ?? '')).join('') : '');
  // 语言从 code 的 className "language-xxx" 抽出
  let language = '';
  const childArr = Array.isArray(children) ? children : [children];
  for (const c of childArr) {
    const cls = (c as any)?.props?.className;
    if (typeof cls === 'string') {
      const m = cls.match(/language-(\w+)/);
      if (m) { language = m[1]; break; }
    }
  }
  // Mermaid 分支
  if (language === 'mermaid' && typeof codeText === 'string') {
    return <MermaidBlock code={codeText} />;
  }
  const onCopy = async () => {
    const text = typeof codeText === 'string' ? codeText : '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div style={{ position: 'relative' }} className={className}>
      <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 1 }}>
        {language && (
          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(0,0,0,0.06)', color: 'var(--c-texTer)', fontFamily: 'ui-monospace, monospace', textTransform: 'lowercase' }}>
            {language}
          </span>
        )}
        <button
          onClick={onCopy}
          aria-label={copied ? '已复制' : '复制代码'}
          title={copied ? '已复制' : '复制代码'}
          className="nx-hoverable"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', padding: 0, background: 'rgba(255,255,255,0.85)', border: '1px solid var(--c-borSec)', borderRadius: '4px', cursor: 'pointer', color: 'var(--c-icoSec)' }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <pre className={className}>{children}</pre>
    </div>
  );
}

function ImageLightbox({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
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
  const routeParams = useParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentIdChain, setCurrentIdChain] = useState<string>('');
  const currentArticleIdRef = useRef<string | null>(null);
  const skipParamsEffectRef = useRef(false);
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

  const loadArticle = useCallback(async (fetchParams: { path?: string; id?: string }) => {
    const query = fetchParams.path
      ? `path=${encodeURIComponent(fetchParams.path)}`
      : `id=${encodeURIComponent(fetchParams.id || '')}`;
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);
    setContent('');
    try {
      const res = await fetch(`/api/articles?${query}`);
      if (seq !== loadSeqRef.current) return;
      const json = (await res.json()) as {
        ok: boolean;
        data?: { content: string; path: string; id: string; idChain: string };
        error?: string;
      };
      if (seq !== loadSeqRef.current) return;
      if (json.ok && json.data) {
        setContent(json.data.content);
        setCurrentPath(json.data.path);
        currentArticleIdRef.current = json.data.id;
        const idChain = json.data.idChain || '';
        setCurrentIdChain(idChain);
        if (idChain) {
          window.history.replaceState(null, '', `/read/${idChain}`);
        }
        const parts = json.data.path.split('/');
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

  // 从 URL 路径加载文章（仅用于首次加载 /read/id1/id2/id3）
  // handleSelectItem 的 pushState 也会触发 routeParams 变化，用 skipParamsEffectRef 跳过
  useEffect(() => {
    if (skipParamsEffectRef.current) {
      skipParamsEffectRef.current = false;
      return;
    }
    const ids = routeParams.ids as string[] | undefined;
    if (!ids || ids.length === 0) return;
    const lastId = ids[ids.length - 1];
    if (currentArticleIdRef.current === lastId) return;
    void loadArticle({ id: lastId });
  }, [routeParams.ids, loadArticle]);

  // 监听浏览器后退/前进
  useEffect(() => {
    const onPopState = () => {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/read\/(.+)$/);
      if (match) {
        const ids = match[1].split('/');
        const lastId = ids[ids.length - 1];
        if (lastId && lastId !== currentArticleIdRef.current) {
          void loadArticle({ id: lastId });
        }
      } else if (pathname === '/read') {
        setCurrentPath('');
        setCurrentIdChain('');
        setContent('');
        setTitle('');
        setError(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadArticle]);

  const handleSelectItem = (itemPath: string, _isFolder: boolean, idChain?: string) => {
    setCurrentPath(itemPath);
    if (idChain) {
      setCurrentIdChain(idChain);
      // pushState 会触发 routeParams 变化，设置标志跳过 useEffect 中的重复加载
      skipParamsEffectRef.current = true;
      window.history.pushState(null, '', `/read/${idChain}`);
    }
    void loadArticle({ path: itemPath });
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
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-texSec)' }}>{t('read.catalog')}</span>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            aria-label={t('common.close')}
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
          style={{ height: '45px', background: 'var(--c-bacPri)' }}
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

        {/* Notion 风格扁平布局 */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 文章内容 */}
          <article ref={articleRef} className="flex-1 min-w-0 overflow-y-auto" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
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
                          {i > 0 && <span style={{ color: 'var(--c-texDis)', fontSize: '12px' }}>›</span>}
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
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[
                        rehypeSlug,
                        rehypeKatex,
                        [rehypeSanitize, { ...defaultSchema, attributes: { ...defaultSchema.attributes, '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'className', 'style'] } }],
                      ]}
                      urlTransform={safeUrlTransform}
                      components={{
                        pre: (props) => <CodeBlock className={props.className}>{props.children}</CodeBlock>,
                        img: ({ src, alt }) => <ImageLightbox src={src} alt={alt} />,
                        a: ({ href, children, ...props }) => {
                          if (!href || href.startsWith('#')) {
                            return <a href={href} {...props}>{children}</a>;
                          }
                          if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
                            return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                          }
                          // 内部链接：点击后在应用内导航
                          return (
                            <a
                              href={href}
                              {...props}
                              onClick={(e) => {
                                e.preventDefault();
                                let docPath = decodeURIComponent(href);
                                docPath = docPath.replace(/^\//, '').replace(/\.md$/, '');
                                if (!docPath.startsWith('/') && currentPath.includes('/')) {
                                  const parentDir = currentPath.split('/').slice(0, -1).join('/');
                                  docPath = parentDir + '/' + docPath;
                                }
                                handleSelectItem(docPath, false);
                              }}
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* 右侧目录（桌面 + 平板横屏） */}
          {content && (
            <aside className="hidden lg:block flex-shrink-0 overflow-y-auto" style={{ width: '220px', paddingTop: '40px', paddingRight: '16px' }}>
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
          <span aria-hidden style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '8px' }}>⟳</span>
        </div>
      }
    >
      <ReadPageInner />
    </Suspense>
  );
}
