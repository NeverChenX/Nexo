'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TreeMenu } from '@/components/TreeMenu';
import { Preview } from '@/components/Preview';
import { ShareModal } from '@/components/ShareModal';
import { Button } from '@/components/ui/button';
import { Pencil, Share2, Trash2, FileText, Folder, Sparkles, Wand2, BookOpen } from 'lucide-react';

interface FolderItem {
  name: string;
  path: string;
  isFolder: boolean;
}

export default function ViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [folderItems, setFolderItems] = useState<FolderItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [draggingSidebar, setDraggingSidebar] = useState(false);
  const draggingSidebarRef = useRef(false);

  // AI panel state
  const [selectedText, setSelectedText] = useState<string>('');
  const [explainLoading, setExplainLoading] = useState(false);
  const [addingToArticle, setAddingToArticle] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelPosition, setAiPanelPosition] = useState({ y: 0 });
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const latestLoadSeqRef = useRef(0);
  const currentArticleIdRef = useRef<string | null>(null);
  const currentPathRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = window.localStorage.getItem('view_sidebar_width');
    if (!cached) return;
    const parsed = Number(cached);
    if (!Number.isNaN(parsed)) {
      setSidebarWidth(Math.min(560, Math.max(180, parsed)));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('view_sidebar_width', String(sidebarWidth));
    }
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!draggingSidebarRef.current) return;
      const next = Math.min(560, Math.max(180, event.clientX));
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
          currentPathRef.current = json.data.path;
          setCurrentPath(json.data.path);
          setArticleId(json.data.id || null);
          setContent(json.data.content);
          setFolderItems(null);
          if (json.data.id) {
            router.replace(`/view?id=${encodeURIComponent(json.data.id)}`);
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

  const loadFolder = useCallback(async (folderPath: string) => {
    if (folderPath === currentPathRef.current) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/folders?path=${encodeURIComponent(folderPath)}`);
      const json = await res.json();
      if (json.ok) {
        currentArticleIdRef.current = null;
        currentPathRef.current = folderPath;
        setCurrentPath(folderPath);
        setArticleId(null);
        setContent('');
        setFolderItems(json.data);
        router.replace(`/view?folder=${encodeURIComponent(folderPath)}`);
      }
    } catch (error) {
      console.error('Failed to load folder:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    const pathFromUrl = searchParams.get('path');
    const folderFromUrl = searchParams.get('folder');
    if (idFromUrl && currentArticleIdRef.current === idFromUrl) return;
    if ((pathFromUrl || folderFromUrl) && (pathFromUrl || folderFromUrl) === currentPathRef.current) return;
    if (idFromUrl) {
      void loadArticle({ id: idFromUrl });
      return;
    }
    if (folderFromUrl) {
      void loadFolder(folderFromUrl);
      return;
    }
    if (pathFromUrl) {
      void loadArticle({ path: pathFromUrl });
    }
  }, [searchParams, loadArticle, loadFolder]);

  const handleDelete = async () => {
    if (!currentPath || !confirm('确定要删除吗？')) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(currentPath)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.ok) {
        setCurrentPath('');
        setArticleId(null);
        setContent('');
        setFolderItems(null);
        router.replace('/view');
      } else {
        alert('删除失败: ' + json.error);
      }
    } catch (error) {
      alert('删除失败: ' + error);
    }
  };

  const handleExplain = async () => {
    if (!selectedText || !currentPath || !articleId) return;
    setExplainLoading(true);
    setAiExplanation(null);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, articlePath: currentPath }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert('解释失败: ' + json.error);
        return;
      }
      setAiExplanation(json.data.explanation);
    } catch (error) {
      alert('解释说明出错: ' + error);
    } finally {
      setExplainLoading(false);
    }
  };

  const handleAddExplanationToArticle = async () => {
    if (!aiExplanation || !currentPath || !articleId) return;
    setAddingToArticle(true);
    try {
      const snippet = selectedText.length > 100 ? selectedText.slice(0, 100) + '…' : selectedText;
      const appendBlock = `\n\n---\n\n> **📝 AI 解释**\n>\n> **选中内容：** ${snippet}\n>\n> ${aiExplanation.replace(/\n/g, '\n> ')}`;
      const newContent = content + appendBlock;

      const saveRes = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath, content: newContent }),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.ok) {
        alert('保存失败: ' + saveJson.error);
        return;
      }

      setContent(newContent);
      setShowAIPanel(false);
      setSelectedText('');
      setAiExplanation(null);
    } catch (error) {
      alert('添加到文章失败: ' + error);
    } finally {
      setAddingToArticle(false);
    }
  };

  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (path === currentPathRef.current) return;
    if (isFolder) {
      void loadFolder(path);
    } else {
      void loadArticle({ path });
    }
  };

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';

    if (text && contentContainerRef.current) {
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        const containerRect = contentContainerRef.current.getBoundingClientRect();
        const panelY = Math.max(16, rect.top - containerRect.top + contentContainerRef.current.scrollTop - 50);
        setAiPanelPosition({ y: panelY });
      }
      setSelectedText(text);
      setShowAIPanel(true);
      setAiExplanation(null);
    } else {
      setShowAIPanel(false);
      setSelectedText('');
      setAiExplanation(null);
    }
  }, []);

  // Listen for text selection
  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10);
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.ai-panel') && !target.closest('.prose-preview')) {
        setShowAIPanel(false);
        setSelectedText('');
        setAiExplanation(null);
      }
    };

    container.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleTextSelection, content]);

  const folderName = currentPath.split('/').pop() || currentPath;

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <div style={{ width: `${sidebarWidth}px` }} className="h-full flex-shrink-0 min-w-0">
        <TreeMenu
          onSelectItem={handleSelectItem}
          onCreateArticle={() => {}}
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
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 truncate">{currentPath || '未选择文章'}</p>
          </div>
          {loading && <span className="text-xs text-gray-400 flex-shrink-0">加载中...</span>}
          <Button
            onClick={() => router.push(articleId ? `/editor?id=${encodeURIComponent(articleId)}` : '/editor')}
            disabled={!articleId}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <Pencil className="h-4 w-4 mr-1" /> 编辑
          </Button>
          <Button
            onClick={() => setShareModalOpen(true)}
            disabled={!articleId}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <Share2 className="h-4 w-4 mr-1" /> 分享
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!articleId}
            variant="destructive"
            size="sm"
            className="flex-shrink-0"
          >
            <Trash2 className="h-4 w-4 mr-1" /> 删除
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left content area - 2/3 */}
          <div 
            className="w-2/3 h-full overflow-auto bg-white"
            ref={contentContainerRef}
          >
            <div
              className="h-full transition-opacity duration-150"
              style={{ opacity: loading ? 0.4 : 1 }}
            >
              {folderItems !== null ? (
                <div className="max-w-2xl mx-auto px-8 py-10">
                  <h1 className="text-2xl font-semibold text-slate-800 mb-6">{folderName}</h1>
                  {folderItems.length === 0 ? (
                    <p className="text-slate-400 text-sm">此目录暂无内容</p>
                  ) : (
                    <ul className="space-y-1">
                      {folderItems.map((item) => (
                        <li key={item.path}>
                          <button
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-100 transition-colors group"
                            onClick={() => handleSelectItem(item.path, item.isFolder)}
                          >
                            {item.isFolder ? (
                              <Folder className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="text-sm text-slate-700 group-hover:text-slate-900">{item.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : content ? (
                <Preview content={content} maxWidth="900px" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">选择一篇文章查看</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Right AI area - 1/3 */}
          <div className="w-1/3 h-full bg-gray-50 border-l border-gray-200 relative">
            {/* AI floating panel - sticky within right area */}
            {showAIPanel && selectedText && (
              <div
                className="ai-panel absolute z-50 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-in fade-in slide-in-from-right-2 duration-200 overflow-y-auto"
                style={{
                  left: '16px',
                  top: `${Math.min(Math.max(16, aiPanelPosition.y), contentContainerRef.current?.clientHeight ? contentContainerRef.current.clientHeight - 480 : 16)}px`,
                  maxHeight: '460px'
                }}
              >
                {/* Selected text preview */}
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">选中的内容</p>
                  <p className="text-sm text-slate-600 line-clamp-3">{selectedText}</p>
                </div>

                {aiExplanation ? (
                  /* Explanation result view */
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      <p className="text-xs font-medium text-slate-600">AI 解释</p>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-4 max-h-48 overflow-y-auto bg-slate-50 rounded-lg p-3">
                      {aiExplanation}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleAddExplanationToArticle}
                        disabled={addingToArticle}
                      >
                        {addingToArticle ? '添加中...' : '📎 添加到文章'}
                      </button>
                      <button
                        className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setAiExplanation(null)}
                      >
                        返回
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action buttons view */
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 mb-2">快捷操作</p>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleExplain}
                      disabled={explainLoading || !articleId}
                    >
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      {explainLoading ? '解释中...' : '解释说明'}
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left opacity-40 cursor-not-allowed">
                      <Wand2 className="h-4 w-4 text-purple-500" />
                      改进写作
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left opacity-40 cursor-not-allowed">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      润色校对
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {currentPath && articleId && (
        <ShareModal
          path={currentPath}
          type="article"
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
