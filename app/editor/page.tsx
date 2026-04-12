'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { EditorBlockEditor } from '@/components/editor/EditorBlockEditor';
import { ShareModal } from '@/components/ShareModal';
import { CreateArticleModal } from '@/components/CreateArticleModal';
import { Trash2, Share2, FileText, X, AlertCircle } from 'lucide-react';

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
      } catch {
        // 加载失败
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
      const res = await fetch(`/api/articles/${encodeURIComponent(currentPath)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) {
        setCurrentPath('');
        setContent('');
        setArticleData(null);
        setIsCurrentFolder(false);
        setSubPages([]);
        setSaveState('saved');
        router.replace('/editor');
        setRefreshKey((prev) => prev + 1);
      }
    } catch {
      // 删除失败
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
        body: JSON.stringify({ path: articlePath, content: `# ${name}` }),
      });
      const json = await res.json();
      if (json.ok) {
        setCurrentPath(articlePath);
        setIsCurrentFolder(false);
        setSubPages([]);
        setContent(`# ${name}`);
        setArticleData(json.data);
        setSaveState('saved');
        if (json.data?.id) router.replace(`/editor?id=${encodeURIComponent(json.data.id)}`);
        setRefreshKey((prev) => prev + 1);
      }
    } catch {
      // 创建失败
    }
  };

  const breadcrumbParts = currentPath ? currentPath.split('/') : [];

  return (
    <div className="flex h-screen w-full" style={{ background: 'var(--c-bacPri)' }}>
      {/* 侧边栏 */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="h-full flex-shrink-0 min-w-0"
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
        className={`notion-resize-handle h-full${draggingSidebar ? ' active' : ''}`}
        onMouseDown={startSidebarDrag}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整左侧菜单宽度"
      >
        <div className="notion-resize-handle-line" />
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
                  return (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span style={{ color: 'var(--c-texDis)', fontSize: '12px' }}>/</span>}
                      {isLast ? (
                        <span style={{ fontSize: '13px', color: 'var(--c-texPri)' }}>
                          {seg.replace(/\.md$/, '')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectItem(segPath, true)}
                          className="notion-hoverable rounded px-1"
                          style={{ fontSize: '13px', color: 'var(--c-texTer)' }}
                        >
                          {seg.replace(/\.md$/, '')}
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--c-texTer)' }}>未选择文档</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              className="text-xs whitespace-nowrap"
              style={{ color: saveState === 'unsaved' ? 'var(--notion-red)' : 'var(--c-texTer)' }}
            >
              {saveState === 'saving' ? '保存中...' : saveState === 'unsaved' ? '未保存' : currentPath ? '已保存' : ''}
            </span>
            <button
              onClick={() => setShareModalOpen(true)}
              disabled={!currentPath}
              title="分享"
              className="notion-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded disabled:opacity-40"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={!currentPath}
              title="删除"
              className="notion-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded disabled:opacity-40"
              style={{ color: 'var(--c-texSec)' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 编辑器 */}
        {currentPath ? (
          loading ? (
            <div className="flex-1 min-h-0 overflow-hidden" style={{ background: 'var(--c-bacPri)' }}>
              <div className="notion-layout" style={{ paddingTop: '48px' }}>
                <div className="notion-layout-content">
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
            <p style={{ color: 'var(--c-texTer)', fontSize: '15px' }}>选择或创建一篇文档开始编辑</p>
            <p style={{ color: 'var(--c-texDis)', fontSize: '13px' }}>从左侧目录选择，或右键新建</p>
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
                确认删除
              </div>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="notion-hoverable rounded p-0.5"
                style={{ color: 'var(--c-icoSec)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                {isCurrentFolder
                  ? `确定要删除 "${currentPath.split('/').pop()}" 吗？子页面也会一并删除。`
                  : `确定要删除 "${currentPath.split('/').pop()}" 吗？`}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="notion-hoverable px-3 py-1.5 text-sm rounded-md"
                style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 text-sm rounded-md text-white"
                style={{ background: 'var(--notion-red)' }}
              >
                删除
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
