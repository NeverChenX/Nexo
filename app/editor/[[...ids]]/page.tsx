'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { CreateArticleModal } from '@/components/CreateArticleModal';
import { Trash2, Share2, FileText, X, AlertCircle, Upload, ArchiveRestore, Star, Clock, Inbox } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BreadcrumbDropdown } from '@/components/BreadcrumbDropdown';
import { ExportMenu } from '@/components/ExportMenu';
import { addRecentDoc, removeRecentDoc } from '@/lib/recent';
import { computeStats } from '@/lib/doc-stats';
import { isFavorite, toggleFavorite, removeFavorite } from '@/lib/favorites';
import { AiAskPanel } from '@/components/AiAskPanel';
import { PermissionBadge } from '@/components/PermissionBadge';
import { parseFrontmatter, serializeFrontmatter } from '@/lib/frontmatter';

// --- 骨架屏组件 ---
function EditorSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse p-8" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div className="h-8 bg-nx-bg-secondary rounded w-2/3 mb-6" />
      <div className="space-y-3">
        <div className="h-4 bg-nx-bg-secondary rounded w-full" />
        <div className="h-4 bg-nx-bg-secondary rounded w-5/6" />
        <div className="h-4 bg-nx-bg-secondary rounded w-4/6" />
        <div className="h-4 bg-nx-bg-secondary rounded w-full" />
        <div className="h-4 bg-nx-bg-secondary rounded w-3/6" />
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex-1 animate-pulse p-8" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div className="h-7 bg-nx-bg-secondary rounded w-1/3 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-nx-bg-secondary rounded-lg" />)}
      </div>
      <div className="h-5 bg-nx-bg-secondary rounded w-1/4 mb-4" />
      <div className="space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-10 bg-nx-bg-secondary rounded" />)}
      </div>
    </div>
  );
}

// 重组件动态加载 — 不随首屏 bundle 打包
const EditorBlockEditor = dynamic(
  () => import('@/components/editor/EditorBlockEditor').then((m) => ({ default: m.EditorBlockEditor })),
  { ssr: false, loading: () => <EditorSkeleton /> },
);
const HomePage = dynamic(
  () => import('@/components/HomePage').then((m) => ({ default: m.HomePage })),
  { ssr: false, loading: () => <HomeSkeleton /> },
);
const ShareModal = dynamic(
  () => import('@/components/ShareModal').then((m) => ({ default: m.ShareModal })),
  { ssr: false },
);
const SearchPanel = dynamic(
  () => import('@/components/SearchPanel').then((m) => ({ default: m.SearchPanel })),
  { ssr: false },
);
const TrashPanel = dynamic(
  () => import('@/components/TrashPanel').then((m) => ({ default: m.TrashPanel })),
  { ssr: false },
);
const ImportModal = dynamic(
  () => import('@/components/ImportModal').then((m) => ({ default: m.ImportModal })),
  { ssr: false },
);
const KeyboardShortcutsModal = dynamic(
  () => import('@/components/KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal })),
  { ssr: false },
);
const SettingsModal = dynamic(
  () => import('@/components/SettingsModal').then((m) => ({ default: m.SettingsModal })),
  { ssr: false },
);
const HistoryPanel = dynamic(
  () => import('@/components/HistoryPanel').then((m) => ({ default: m.HistoryPanel })),
  { ssr: false },
);
const QuickCaptureModal = dynamic(
  () => import('@/components/QuickCaptureModal').then((m) => ({ default: m.QuickCaptureModal })),
  { ssr: false },
);
const AiClassifyHint = dynamic(
  () => import('@/components/AiClassifyHint').then((m) => ({ default: m.AiClassifyHint })),
  { ssr: false },
);
const SmartLinkSuggestions = dynamic(
  () => import('@/components/SmartLinkSuggestions').then((m) => ({ default: m.SmartLinkSuggestions })),
  { ssr: false },
);
const GraphView = dynamic(
  () => import('@/components/GraphView').then((m) => ({ default: m.GraphView })),
  { ssr: false },
);

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
  const params = useParams();
  // 打印模式：URL 带 ?print=1 时进入"所见即所得 PDF 模式"——隐藏所有 chrome，
  // 等内容加载完后自动触发 window.print()。详见 globals.css 中的 [data-print-mode] 规则。
  const [printMode, setPrintMode] = useState<boolean>(false);
  const printTriggeredRef = useRef(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentIdChain, setCurrentIdChain] = useState<string>('');
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState<number>(240);
  const [draggingSidebar, setDraggingSidebar] = useState(false);
  const [isCurrentFolder, setIsCurrentFolder] = useState(false);
  const [subPages, setSubPages] = useState<SubPage[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalParent, setCreateModalParent] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  // 标记"本次刚通过 create 动作创建的新页面"，用于编辑器聚焦标题 +
  // 离开空标题时自动补默认值；用户切换到其他文章或输入内容后即清除。
  const [isJustCreated, setIsJustCreated] = useState(false);

  // 从服务端拉真实 Inbox 数量（打开 editor 时 + 每次采集后）
  const refreshInboxCount = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox?count=1');
      const json = await res.json();
      if (json.ok) setInboxCount(json.data.unread || 0);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { void refreshInboxCount(); }, [refreshInboxCount]);
  const [graphOpen, setGraphOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiAskOpen, setAiAskOpen] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [favRefreshKey, setFavRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docPermission, setDocPermission] = useState<'editable' | 'readonly' | 'private'>('editable');

  // 解析权限
  useEffect(() => {
    if (!content) { setDocPermission('editable'); return; }
    const { frontmatter } = parseFrontmatter(content);
    const perm = frontmatter.permission as string;
    if (perm === 'readonly' || perm === 'private') {
      setDocPermission(perm);
    } else {
      setDocPermission('editable');
    }
  }, [content]);

  const { t } = useI18n();

  const [permError, setPermError] = useState<string | null>(null);
  const handlePermissionChange = async (perm: 'editable' | 'readonly' | 'private') => {
    const prevPerm = docPermission;
    setDocPermission(perm);
    if (!currentPath) return;
    try {
      // 先 GET 拿磁盘最新（避免 stale state.content 覆盖编辑器内的最新改动，例如刚拖动的 pageLink 顺序）
      const getRes = await fetch(`/api/articles?path=${encodeURIComponent(currentPath)}`);
      const getJson = await getRes.json();
      if (!getJson.ok) throw new Error(getJson.error || 'load latest failed');
      const latest = (getJson.data.content as string) || '';
      const { frontmatter, body } = parseFrontmatter(latest);
      if (perm === 'editable') {
        delete frontmatter.permission;
      } else {
        frontmatter.permission = perm;
      }
      const newContent = serializeFrontmatter(frontmatter, body);
      const res = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath, content: newContent }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'save failed');
      setContent(newContent);
    } catch (err) {
      // 回滚本地状态并提示
      setDocPermission(prevPerm);
      const msg = err instanceof Error ? err.message : '';
      setPermError(t('perm.changeFailed') + (msg ? `: ${msg}` : ''));
      setTimeout(() => setPermError(null), 3000);
    }
  };

  const pathRef = useRef(currentPath);
  const draggingSidebarRef = useRef(false);
  const latestLoadSeqRef = useRef(0);
  const currentArticleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = window.localStorage.getItem('editor_sidebar_width');
    if (!cached) return;
    const parsed = Number(cached);
    if (!Number.isNaN(parsed)) setSidebarWidth(Math.min(480, Math.max(200, parsed)));
  }, []);

  useEffect(() => { pathRef.current = currentPath; setIsFav(currentPath ? isFavorite(currentPath) : false); }, [currentPath]);
  useEffect(() => { currentArticleIdRef.current = articleData?.id || null; }, [articleData?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem('editor_sidebar_width', String(sidebarWidth));
  }, [sidebarWidth]);

  // 侧边栏拖拽
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingSidebarRef.current) {
        setSidebarWidth(Math.min(480, Math.max(200, e.clientX)));
      }
    };
    const onMouseUp = () => {
      if (draggingSidebarRef.current) {
        draggingSidebarRef.current = false;
        setDraggingSidebar(false);
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

  const loadArticle = useCallback(
    async (fetchParams: { path?: string; id?: string }) => {
      const requestSeq = ++latestLoadSeqRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const query = fetchParams.path
          ? `path=${encodeURIComponent(fetchParams.path)}`
          : `id=${encodeURIComponent(fetchParams.id || '')}`;
        const res = await fetch(`/api/articles?${query}`);
        const json = await res.json();
        if (requestSeq !== latestLoadSeqRef.current) return;
        if (json.ok) {
          currentArticleIdRef.current = json.data.id || null;
          setArticleData(json.data);
          setContent(json.data.content);
          setCurrentPath(json.data.path);
          const idChain = json.data.idChain || '';
          setCurrentIdChain(idChain);
          setSaveState('saved');
          // URL 用 /editor/id1/id2/id3 格式
          if (idChain) {
            window.history.replaceState(null, '', `/editor/${idChain}`);
          }
          // 记录最近访问（保存 idChain 用于首页链接）
          const titleMatch = json.data.content?.match(/^#\s+(.+)$/m);
          const docTitle = titleMatch ? titleMatch[1] : json.data.path.split('/').pop() || '';
          addRecentDoc(json.data.path, docTitle, idChain);
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
        } else {
          const attempted = fetchParams.path || fetchParams.id || '';
          setLoadError(`文档不存在或已移动：${decodeURIComponent(attempted)}`);
        }
      } catch (err) {
        console.error('加载文章失败:', err);
        if (requestSeq === latestLoadSeqRef.current) {
          setLoadError('网络错误，无法加载文档');
        }
      } finally {
        if (requestSeq === latestLoadSeqRef.current) setLoading(false);
      }
    },
    []
  );

  // 首次挂载时检测 ?print=1（导出排版 PDF 入口打开）。一旦进入打印模式，
  // 该次会话保持打印模式直到关闭标签页；打印对话框由后续 useEffect 触发。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('print') === '1') setPrintMode(true);
  }, []);

  // 打印模式：等内容加载完 + BlockNote 渲染稳定后触发 window.print()。
  // 浏览器自带的打印对话框处理"另存为 PDF"，所见即所得。
  useEffect(() => {
    if (!printMode || printTriggeredRef.current) return;
    if (loading || !content) return;
    printTriggeredRef.current = true;
    // 1500ms 给 BlockNote/图片/字体留足渲染时间；之前测过 800ms 不稳。
    const timer = setTimeout(() => { window.print(); }, 1500);
    return () => clearTimeout(timer);
  }, [printMode, loading, content]);

  // 从 URL 路径中的 ID 链加载文章（仅用于首次加载 /editor/id1/id2/id3）
  // Next.js 14.2 的 useParams 不跟踪 pushState，params.ids 每次重渲染又是新引用，
  // 所以用 window.location.pathname 作为权威来源，currentArticleIdRef 防重入。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const match = window.location.pathname.match(/^\/editor\/(.+)$/);
    if (!match) return;
    const segs = match[1].split('/').filter(Boolean);
    if (segs.length === 0) return;
    const lastSeg = segs[segs.length - 1];
    if (currentArticleIdRef.current === lastSeg) return;
    // 合法 8-16 位 base36 ID → 按 ID 加载；否则当中文路径，加载成功后会 replaceState 修正 URL
    if (/^[a-z0-9]{6,16}$/.test(lastSeg)) {
      void loadArticle({ id: lastSeg });
    } else {
      const decodedPath = segs.map((s) => decodeURIComponent(s)).join('/').replace(/\.md$/, '');
      void loadArticle({ path: decodedPath });
    }
  }, [params.ids, loadArticle]);

  // 监听浏览器后退/前进
  useEffect(() => {
    const onPopState = () => {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/editor\/(.+)$/);
      if (match) {
        const segs = match[1].split('/').filter(Boolean);
        const lastSeg = segs[segs.length - 1];
        if (!lastSeg || lastSeg === currentArticleIdRef.current) return;
        if (/^[a-z0-9]{6,16}$/.test(lastSeg)) {
          void loadArticle({ id: lastSeg });
        } else {
          const decodedPath = segs.map((s) => decodeURIComponent(s)).join('/').replace(/\.md$/, '');
          void loadArticle({ path: decodedPath });
        }
      } else if (pathname === '/editor') {
        setCurrentPath('');
        setCurrentIdChain('');
        setArticleData(null);
        setContent('');
        setIsCurrentFolder(false);
        setSubPages([]);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadArticle]);

  // 统一处理：重命名/移动后若当前路径命中（自身或子孙），跟随重定向到新路径
  const handlePathChanged = (oldPath: string, newPath: string) => {
    if (!currentPath) return;
    let remapped: string | null = null;
    if (currentPath === oldPath) {
      remapped = newPath;
    } else if (currentPath.startsWith(oldPath + '/')) {
      remapped = newPath + currentPath.slice(oldPath.length);
    }
    if (!remapped) return;
    setCurrentPath(remapped);
    if (articleData) setArticleData({ ...articleData, path: remapped });
    // 重新加载以拿到最新的 idChain 并更新 URL
    void loadArticle({ path: remapped });
  };

  // 编辑器内部触发的文件名同步：路径已改、内容未变；不要重载内容（会清掉用户正在打字的状态）
  const handleEditorRenamed = (oldPath: string, newPath: string) => {
    if (currentPath === oldPath) {
      setCurrentPath(newPath);
      if (articleData) setArticleData({ ...articleData, path: newPath });
    }
    setRefreshKey((k) => k + 1);
  };

  const handleMoveItem = async (_oldPath: string, _newParentPath: string, _isFolder: boolean) => {
    // 路径重定向已由 handlePathChanged 统一处理；这里仅刷新树
    setRefreshKey((k) => k + 1);
    return true;
  };

  const handleSelectItem = (itemPath: string, _isFolder: boolean, idChain?: string) => {
    if (itemPath === currentPath) return;
    setIsJustCreated(false);
    setCurrentPath(itemPath);
    // 用 idChain 构建 URL（如果有的话），否则先加载再通过 replaceState 更新
    if (idChain) {
      const lastId = idChain.split('/').filter(Boolean).pop() || null;
      // 预先写入 currentArticleIdRef，避免 params.ids useEffect 用 stale 的 URL 重新触发
      currentArticleIdRef.current = lastId;
      setCurrentIdChain(idChain);
      window.history.pushState(null, '', `/editor/${idChain}`);
    }
    void loadArticle({ path: itemPath });
  };

  const handleDeleteClick = () => {
    if (!currentPath) return;
    setDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteConfirm(false);
    if (!currentPath) return;
    const deletedPath = currentPath;
    try {
      // 先尝试软删除（移到回收站），回退到硬删除
      const trashRes = await fetch('/api/trash-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: deletedPath, isFolder: isCurrentFolder }),
      });
      const trashJson = await trashRes.json();
      if (!trashJson.ok) {
        // 回退到硬删除
        const res = await fetch(`/api/articles/${encodeURIComponent(deletedPath)}`, { method: 'DELETE' });
        const json = await res.json();
        if (!json.ok) return;
      }
      // 同步清掉 localStorage 里的 recent + favorites，避免首页继续展示
      removeRecentDoc(deletedPath);
      removeFavorite(deletedPath);
      setFavRefreshKey((k) => k + 1);
      setCurrentPath('');
      setContent('');
      setArticleData(null);
      setIsCurrentFolder(false);
      setSubPages([]);
      setSaveState('saved');
      setIsJustCreated(false);
      window.history.pushState(null, '', '/editor');
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCreateArticle = (parentPath: string) => {
    setCreateModalParent(parentPath);
    setCreateModalOpen(true);
  };

  // 斜杠菜单触发：跳过输入名称弹框，直接用默认名创建并跳转
  const handleQuickCreateSubPage = async (parentPath: string) => {
    const base = t('bn.defaultNewPageName') || '新页面';
    const existing = new Set(
      subPages.map((sp) => sp.name.replace(/\.md$/, ''))
    );
    let name = base;
    let counter = 2;
    while (existing.has(name)) {
      name = `${base} ${counter}`;
      counter += 1;
    }
    const articlePath = parentPath ? `${parentPath}/${name}` : name;
    // 新页面标题默认为空（仅一个空 H1），由编辑器聚焦后等待用户输入
    const finalContent = `# `;
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: articlePath, content: finalContent }),
      });
      const json = await res.json();
      if (!json.ok) {
        console.error('创建文章失败:', json.error);
        return;
      }
      setCurrentPath(articlePath);
      setIsCurrentFolder(false);
      setSubPages([]);
      setContent(finalContent);
      setArticleData(json.data);
      setSaveState('saved');
      setIsJustCreated(true);
      const newIdChain = json.data.idChain || '';
      setCurrentIdChain(newIdChain);
      if (newIdChain) {
        currentArticleIdRef.current = newIdChain.split('/').filter(Boolean).pop() || null;
        window.history.pushState(null, '', `/editor/${newIdChain}`);
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('创建文章失败:', err);
    }
  };

  const handleCreateConfirm = async (name: string, templateContent?: string) => {
    setCreateModalOpen(false);
    const articlePath = createModalParent ? `${createModalParent}/${name}` : name;
    // 有模板走模板；否则新页面给空 H1，让编辑器聚焦等用户输入
    const finalContent = templateContent || `# `;
    const usingTemplate = !!templateContent;
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: articlePath, content: finalContent }),
      });
      const json = await res.json();
      if (json.ok) {
        setCurrentPath(articlePath);
        setIsCurrentFolder(false);
        setSubPages([]);
        setContent(finalContent);
        setArticleData(json.data);
        setSaveState('saved');
        // 只有"未套模板"的新页面需要触发空标题聚焦兜底
        if (!usingTemplate) setIsJustCreated(true);
        const newIdChain = json.data.idChain || '';
        setCurrentIdChain(newIdChain);
        if (newIdChain) {
          currentArticleIdRef.current = newIdChain.split('/').filter(Boolean).pop() || null;
          window.history.pushState(null, '', `/editor/${newIdChain}`);
        }
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error('创建文章失败:', err);
    }
  };

  // 全局快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Cmd/Ctrl+Shift+N 快速采集
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setQuickCaptureOpen(true);
      }
      // ? 打开快捷键帮助（不在输入框中时）
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) {
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const breadcrumbParts = currentPath ? currentPath.split('/') : [];

  return (
    <div
      className="flex h-screen w-full"
      style={{ background: 'var(--c-bacPri)' }}
      data-print-mode={printMode ? '1' : undefined}
    >
      {/* 侧边栏 + 拖拽手柄 */}
      <div
        style={{ width: `${sidebarWidth}px`, background: 'var(--c-bacSec)' }}
        className="nx-print-sidebar h-full flex-shrink-0 min-w-0 flex"
      >
        <TreeMenu
          key={refreshKey}
          onSelectItem={handleSelectItem}
          onCreateArticle={handleCreateArticle}
          onQuickCreateArticle={handleQuickCreateSubPage}
          onMoveItem={handleMoveItem}
          onPathChanged={handlePathChanged}
          selectedPath={currentPath}
          className="h-full flex-1 min-w-0 border-r-0"
          onSearchClick={() => setSearchOpen(true)}
          onTrashClick={() => setTrashOpen(true)}
          onGraphClick={() => setGraphOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
          favRefreshKey={favRefreshKey}
          onHomeClick={() => {
            setCurrentPath('');
            setArticleData(null);
            setContent('');
            setIsCurrentFolder(false);
            setSubPages([]);
            setSaveState('saved');
            window.history.pushState(null, '', '/editor');
          }}
        />
        <div
          className={`nx-resize-handle h-full${draggingSidebar ? ' active' : ''}`}
          onMouseDown={startSidebarDrag}
          role="separator"
          aria-orientation="vertical"
          aria-label={t('editor.resizeSidebar')}
        >
          <div className="nx-resize-handle-line" />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <div
          className="nx-print-topbar flex items-center px-3 gap-2 flex-shrink-0"
          style={{ height: '45px', background: 'var(--c-bacPri)' }}
        >
          <div className="flex-1 min-w-0">
            {currentPath ? (
              <div className="flex items-center gap-1 text-sm truncate">
                {breadcrumbParts.map((seg, i) => {
                  const isLast = i === breadcrumbParts.length - 1;
                  const segPath = breadcrumbParts.slice(0, i + 1).join('/');
                  const parentPath = i === 0 ? '' : breadcrumbParts.slice(0, i).join('/');
                  return (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span style={{ color: 'var(--c-texDis)', fontSize: '12px' }}>›</span>}
                      <BreadcrumbDropdown
                        segment={seg}
                        segmentPath={segPath}
                        parentPath={parentPath}
                        isLast={isLast}
                        onSelect={handleSelectItem}
                      />
                    </span>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: '14px', color: 'var(--c-texTer)' }}>{t('editor.noDocSelected')}</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setQuickCaptureOpen(true)}
              title="快速采集 (Cmd+Shift+N)"
              aria-label="快速采集"
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded relative"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Inbox className="h-3.5 w-3.5" />
              {inboxCount > 0 && (
                <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--nx-red)', borderRadius: '50%' }} />
              )}
            </button>
            <button
              onClick={() => setAiAskOpen(true)}
              title={t('aiAsk.title')}
              aria-label={t('aiAsk.title')}
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded"
              style={{ color: 'var(--c-texSec)' }}
            >
              <span style={{ fontSize: '14px' }}>🧠</span>
            </button>
            <button
              onClick={() => setImportOpen(true)}
              title={t('import.title')}
              aria-label={t('import.title')}
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <LocaleSwitcher />
            <span
              className="text-xs whitespace-nowrap"
              style={{ color: saveState === 'unsaved' ? 'var(--nx-red)' : 'var(--c-texTer)' }}
            >
              {saveState === 'saving' ? t('editor.saving') : saveState === 'unsaved' ? t('editor.unsaved') : ''}
            </span>
            {currentPath && content && (() => {
              const stats = computeStats(content);
              return stats.wordCount > 0 ? (
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--c-texTer)' }}>
                  {t('stats.words', { count: stats.wordCount })} · {t('stats.readTime', { min: stats.readingTimeMin })}
                </span>
              ) : null;
            })()}
            {currentPath && (
              <PermissionBadge
                permission={docPermission}
                onChange={handlePermissionChange}
              />
            )}
            {currentPath && <ExportMenu articlePath={currentPath} />}
            {currentPath && (
              <button
                onClick={() => {
                  const titleMatch = content?.match(/^#\s+(.+)$/m);
                  const title = titleMatch ? titleMatch[1] : currentPath.split('/').pop() || '';
                  const { added } = toggleFavorite(currentPath, title);
                  setIsFav(added);
                  setFavRefreshKey((k) => k + 1);
                }}
                title={isFav ? t('favorites.remove') : t('favorites.add')}
                aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
                aria-pressed={isFav}
                className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded"
                style={{ color: isFav ? 'var(--nx-yellow)' : 'var(--c-texSec)' }}
              >
                <Star className="h-3.5 w-3.5" style={{ fill: isFav ? 'var(--nx-yellow)' : 'none' }} />
              </button>
            )}
            <button
              onClick={() => setHistoryOpen(true)}
              disabled={!currentPath}
              title="版本历史"
              aria-label="版本历史"
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded nx-disabled"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShareModalOpen(true)}
              disabled={!currentPath}
              title={t('editor.share')}
              aria-label={t('editor.share')}
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded nx-disabled"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={!currentPath}
              title={t('editor.delete')}
              aria-label={t('editor.delete')}
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded nx-disabled"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 编辑器 */}
        {loadError ? (
          <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--c-bacPri)', padding: '24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '480px' }}>
              <AlertCircle className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--nx-red)' }} />
              <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--c-texPri)', marginBottom: '8px' }}>{t('editor.loadFailed')}</p>
              <p style={{ fontSize: '13px', color: 'var(--c-texTer)', marginBottom: '16px', wordBreak: 'break-all' }}>{loadError}</p>
              <button
                onClick={() => {
                  setLoadError(null);
                  window.history.pushState(null, '', '/editor');
                }}
                className="nx-hoverable px-3 py-1.5 text-sm rounded-md"
                style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
              >
                {t('common.backHome')}
              </button>
            </div>
          </div>
        ) : currentPath ? (
          loading ? (
            <div className="flex-1 min-h-0 overflow-hidden" style={{ background: 'var(--c-bacPri)' }}>
              <div className="nx-layout" style={{ paddingTop: '48px' }}>
                <div className="nx-layout-content">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ height: '32px', width: '60%', background: 'var(--c-bacTer)', borderRadius: '4px', animation: 'shimmer 1.5s infinite linear' }} />
                    <div style={{ height: '16px', width: '90%', background: 'var(--c-borSec)', borderRadius: '4px' }} />
                    <div style={{ height: '16px', width: '75%', background: 'var(--c-borSec)', borderRadius: '4px' }} />
                    <div style={{ height: '16px', width: '85%', background: 'var(--c-borSec)', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {docPermission === 'readonly' && (
                <div style={{
                  padding: '6px 16px',
                  background: 'rgba(217, 115, 13, 0.08)',
                  borderBottom: '1px solid rgba(217, 115, 13, 0.15)',
                  fontSize: '12px',
                  color: 'var(--nx-orange)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  🔒 {t('perm.readonlyNotice')}
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-hidden">
                <EditorBlockEditor
                  content={content}
                  articlePath={currentPath}
                  articleId={articleData?.id || null}
                  isFolder={isCurrentFolder}
                  onSaveStateChange={setSaveState}
                  onCreatePage={handleQuickCreateSubPage}
                  subPages={subPages}
                  onSelectSubPage={(path) => handleSelectItem(path, false)}
                  isJustCreated={isJustCreated}
                  defaultTitleFallback={t('bn.defaultNewPageName') || '新页面'}
                  onJustCreatedConsumed={() => setIsJustCreated(false)}
                  onPathRenamed={handleEditorRenamed}
                />
              </div>
            </>
          )
        ) : (
          <HomePage
            onSelectItem={(path, idChain) => handleSelectItem(path, false, idChain)}
            onCreateArticle={() => handleCreateArticle('')}
            onSearchClick={() => setSearchOpen(true)}
            onImportClick={() => setImportOpen(true)}
            onGraphClick={() => setGraphOpen(true)}
            onGenerateReport={async (period) => {
              try {
                const res = await fetch('/api/reports', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ period }),
                });
                const json = await res.json();
                if (json.ok) {
                  setRefreshKey((k) => k + 1);
                  handleSelectItem(json.data.path, false);
                }
              } catch (err) { console.error('生成报告失败:', err); }
            }}
          />
        )}
      </div>

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <div
            className="w-[340px] overflow-hidden"
            style={{
              background: 'var(--c-bacPri)',
              borderRadius: '8px',
              boxShadow: 'var(--c-shaOutLg)',
              border: '1px solid var(--c-borPri)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
              <div className="flex items-center gap-2 text-sm" style={{ fontWeight: 500, color: 'var(--c-texPri)' }}>
                <AlertCircle className="h-4 w-4" style={{ color: 'var(--c-icoSec)' }} />
                {t('editor.confirmDelete')}
              </div>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="nx-hoverable rounded p-0.5"
                style={{ color: 'var(--c-icoSec)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                {isCurrentFolder
                  ? t('editor.confirmDeleteFolderMsg', { name: currentPath.split('/').pop() || '' })
                  : t('editor.confirmDeleteMsg', { name: currentPath.split('/').pop() || '' })}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="nx-hoverable px-3 py-1.5 text-sm rounded-md"
                style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 text-sm rounded-md text-white"
                style={{ background: 'var(--nx-red)' }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

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
      <SearchPanel
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(path) => handleSelectItem(path, false)}
      />
      <TrashPanel
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        onRestore={() => setRefreshKey((k) => k + 1)}
      />
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      {currentPath && (
        <HistoryPanel
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          articlePath={currentPath}
          onRestored={() => { void loadArticle({ path: currentPath }); }}
        />
      )}
      <QuickCaptureModal
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onCaptured={() => { setRefreshKey((k) => k + 1); void refreshInboxCount(); }}
      />

      {/* 双链智能建议（相关文档推荐） */}
      {currentPath && content && (
        <SmartLinkSuggestions
          articlePath={currentPath}
          content={content}
          onInsertLink={async (path, title, idChain) => {
            // 用绝对路径，避免渲染成相对路径后被 /editor/ 前缀解析为 /editor/中文
            // 优先 idChain（稳定，不随重命名失效）；缺失时退回 /<path> 由 catch-all 路由解析
            const href = idChain ? `/${idChain}` : `/${path.split('/').map(encodeURIComponent).join('/')}`;
            const line = `\n\n[${title}](${href})`;
            try {
              // 读磁盘最新再追加，避免 stale state.content 覆盖编辑器最新改动
              const getRes = await fetch(`/api/articles?path=${encodeURIComponent(currentPath)}`);
              const getJson = await getRes.json();
              if (!getJson.ok) return;
              const newContent = ((getJson.data.content as string) || '') + line;
              await fetch('/api/articles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentPath, content: newContent }),
              });
              setContent(newContent);
            } catch { /* ignore */ }
          }}
        />
      )}

      {/* AI 自动分类建议（编辑器内容超 300 字时分析） */}
      {currentPath && content && (
        <AiClassifyHint
          articlePath={currentPath}
          content={content}
          resetKey={currentPath}
          onMove={async (newParent) => {
            try {
              await fetch('/api/articles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath: currentPath, newParentPath: newParent }),
              });
              handleMoveItem(currentPath, newParent, false);
              setRefreshKey((k) => k + 1);
            } catch (err) { console.error('AI 分类移动失败:', err); }
          }}
          onApplyTags={async (tags) => {
            try {
              // 读磁盘最新再 merge tags，避免 stale state.content 覆盖编辑器最新改动
              const getRes = await fetch(`/api/articles?path=${encodeURIComponent(currentPath)}`);
              const getJson = await getRes.json();
              if (!getJson.ok) return;
              const latest = (getJson.data.content as string) || '';
              const { frontmatter, body } = parseFrontmatter(latest);
              const existing = Array.isArray(frontmatter.tags) ? frontmatter.tags as string[] : [];
              const merged = Array.from(new Set([...existing, ...tags]));
              frontmatter.tags = merged;
              const newContent = serializeFrontmatter(frontmatter, body);
              await fetch('/api/articles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentPath, content: newContent }),
              });
              setContent(newContent);
            } catch { /* ignore */ }
          }}
        />
      )}
      <GraphView
        isOpen={graphOpen}
        onClose={() => setGraphOpen(false)}
        onSelectDoc={(path) => handleSelectItem(path, false)}
        highlightPath={currentPath}
      />
      <AiAskPanel
        isOpen={aiAskOpen}
        onClose={() => setAiAskOpen(false)}
        onNavigate={(path) => { setAiAskOpen(false); handleSelectItem(path, false); }}
      />

      {/* 权限修改失败提示 Toast */}
      {permError && (
        <div
          className="nx-fadein-fast fixed bottom-6 right-6 z-[400] px-3 py-2 rounded-md flex items-center gap-2"
          style={{
            background: 'var(--c-bacPri)',
            border: '1px solid rgba(224,62,62,0.25)',
            boxShadow: 'var(--c-shaOutLg)',
            color: 'var(--nx-red)',
            fontSize: '13px',
            maxWidth: '360px',
          }}
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span style={{ wordBreak: 'break-word' }}>{permError}</span>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center" style={{ color: 'var(--c-texDis)' }}>...</div>}>
      <EditorPageInner />
    </Suspense>
  );
}
