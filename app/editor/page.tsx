'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { EditorBlockEditor } from '@/components/editor/EditorBlockEditor';
import { ShareModal } from '@/components/ShareModal';
import { CreateArticleModal } from '@/components/CreateArticleModal';
import { Trash2, Share2, FileText, X, AlertCircle, Search, Upload } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { SearchPanel } from '@/components/SearchPanel';
import { BreadcrumbDropdown } from '@/components/BreadcrumbDropdown';
import { ExportMenu } from '@/components/ExportMenu';
import { TrashPanel } from '@/components/TrashPanel';
import { ImportModal } from '@/components/ImportModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { addRecentDoc } from '@/lib/recent';
import { computeStats } from '@/lib/doc-stats';

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

  useEffect(() => { pathRef.current = currentPath; }, [currentPath]);
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
          setSaveState('saved');
          if (json.data.id) {
            router.replace(`/editor?id=${encodeURIComponent(json.data.id)}`);
          }
          // 记录最近访问
          const titleMatch = json.data.content?.match(/^#\s+(.+)$/m);
          const docTitle = titleMatch ? titleMatch[1] : json.data.path.split('/').pop() || '';
          addRecentDoc(json.data.path, docTitle);
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
      } catch (err) {
        console.error('加载文章失败:', err);
      } finally {
        if (requestSeq === latestLoadSeqRef.current) setLoading(false);
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
    if (idFromUrl) { void loadArticle({ id: idFromUrl }); return; }
    if (pathFromUrl) void loadArticle({ path: pathFromUrl });
  }, [searchParams, loadArticle]);

  const handleMoveItem = async (oldPath: string, newParentPath: string, _isFolder: boolean) => {
    if (currentPath === oldPath) {
      const newPath = newParentPath
        ? `${newParentPath}/${oldPath.split('/').pop()}`
        : oldPath.split('/').pop() || '';
      setCurrentPath(newPath);
      if (articleData) setArticleData({ ...articleData, path: newPath });
      if (articleData?.id) router.replace(`/editor?id=${encodeURIComponent(articleData.id)}`);
    }
    setRefreshKey((k) => k + 1);
    return true;
  };

  const handleSelectItem = (itemPath: string, _isFolder: boolean) => {
    if (itemPath === currentPath) return;
    setCurrentPath(itemPath);
    void loadArticle({ path: itemPath });
  };

  const handleDeleteClick = () => {
    if (!currentPath) return;
    setDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteConfirm(false);
    if (!currentPath) return;
    try {
      // 先尝试软删除（移到回收站），回退到硬删除
      const trashRes = await fetch('/api/trash-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath, isFolder: isCurrentFolder }),
      });
      const trashJson = await trashRes.json();
      if (!trashJson.ok) {
        // 回退到硬删除
        const res = await fetch(`/api/articles/${encodeURIComponent(currentPath)}`, { method: 'DELETE' });
        const json = await res.json();
        if (!json.ok) return;
      }
      setCurrentPath('');
      setContent('');
      setArticleData(null);
      setIsCurrentFolder(false);
      setSubPages([]);
      setSaveState('saved');
      router.replace('/editor');
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCreateArticle = (parentPath: string) => {
    setCreateModalParent(parentPath);
    setCreateModalOpen(true);
  };

  const handleCreateConfirm = async (name: string, templateContent?: string) => {
    setCreateModalOpen(false);
    const articlePath = createModalParent ? `${createModalParent}/${name}` : name;
    const finalContent = templateContent || `# ${name}`;
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
        if (json.data?.id) router.replace(`/editor?id=${encodeURIComponent(json.data.id)}`);
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error('创建文章失败:', err);
    }
  };

  const { t } = useI18n();

  // 全局快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
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
    <div className="flex h-screen w-full" style={{ background: 'var(--c-bacPri)' }}>
      {/* 侧边栏 */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="h-full flex-shrink-0 min-w-0 overflow-hidden"
      >
        <TreeMenu
          mode="editor"
          key={refreshKey}
          onSelectItem={handleSelectItem}
          onCreateArticle={handleCreateArticle}
          onMoveItem={handleMoveItem}
          selectedPath={currentPath}
          className="h-full w-full border-r-0"
        />
      </div>

      {/* 拖拽手柄 */}
      <div
        className={`nx-resize-handle h-full${draggingSidebar ? ' active' : ''}`}
        onMouseDown={startSidebarDrag}
        role="separator"
        aria-orientation="vertical"
        aria-label={t('editor.resizeSidebar')}
      >
        <div className="nx-resize-handle-line" />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <div
          className="flex items-center px-3 gap-2 flex-shrink-0"
          style={{ height: '44px', background: 'var(--c-bacPri)', borderBottom: '1px solid var(--c-borSec)' }}
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
                      {i > 0 && <span style={{ color: 'var(--c-texDis)', fontSize: '12px' }}>/</span>}
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
              onClick={() => setSearchOpen(true)}
              title={t('common.search') + ' (⌘K)'}
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setImportOpen(true)}
              title={t('import.title')}
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
              {saveState === 'saving' ? t('editor.saving') : saveState === 'unsaved' ? t('editor.unsaved') : currentPath ? t('editor.saved') : ''}
            </span>
            {currentPath && content && (() => {
              const stats = computeStats(content);
              return stats.wordCount > 0 ? (
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--c-texDis)' }}>
                  {t('stats.words', { count: stats.wordCount })} · {t('stats.readTime', { min: stats.readingTimeMin })}
                </span>
              ) : null;
            })()}
            {currentPath && <ExportMenu articlePath={currentPath} />}
            <button
              onClick={() => setShareModalOpen(true)}
              disabled={!currentPath}
              title={t('editor.share')}
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded disabled:opacity-40"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={!currentPath}
              title={t('editor.delete')}
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded disabled:opacity-40"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTrashOpen(true)}
              title={t('trash.title')}
              className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded"
              style={{ color: 'var(--c-texTer)' }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 编辑器 */}
        {currentPath ? (
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
            <div className="flex-1 min-h-0 overflow-hidden">
              <EditorBlockEditor
                content={content}
                articlePath={currentPath}
                articleId={articleData?.id || null}
                onSaveStateChange={setSaveState}
                onCreatePage={handleCreateArticle}
                subPages={subPages}
                onSelectSubPage={(path) => handleSelectItem(path, false)}
              />
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <FileText className="h-10 w-10" style={{ color: 'var(--c-borPri)' }} />
            <p style={{ color: 'var(--c-texTer)', fontSize: '15px' }}>{t('editor.selectOrCreate')}</p>
            <p style={{ color: 'var(--c-texDis)', fontSize: '13px' }}>{t('editor.selectFromSidebar')}</p>
          </div>
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
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center" style={{ color: 'var(--c-texDis)' }}>加载中...</div>}>
      <EditorPageInner />
    </Suspense>
  );
}
