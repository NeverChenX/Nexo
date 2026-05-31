'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useModalFocus } from '@/lib/useModalFocus';
import { ChevronRight, ChevronDown, FileText, Pencil, Trash2, X, AlertCircle, Plus, Search, ArchiveRestore, Home, GitFork, Star, Settings } from 'lucide-react';
import { getFavorites, FavoriteItem } from '@/lib/favorites';
import { useI18n } from '@/lib/i18n';

interface TreeItem {
  name: string;
  path: string;
  id?: string;
  idChain?: string;
  isFolder: boolean;
  mtime?: number;
  children?: TreeItem[];
}

interface TreeMenuProps {
  onSelectItem: (path: string, isFolder: boolean, idChain?: string) => void;
  onCreateArticle: (parentPath: string) => void;
  onQuickCreateArticle?: (parentPath: string) => void;
  onMoveItem?: (oldPath: string, newParentPath: string, isFolder: boolean) => Promise<boolean>;
  /** 当树中某个路径发生前缀变更（重命名或移动）时触发 */
  onPathChanged?: (oldPath: string, newPath: string) => void;
  selectedPath?: string;
  className?: string;
  refreshKey?: number;
  onSearchClick?: () => void;
  onTrashClick?: () => void;
  onHomeClick?: () => void;
  onGraphClick?: () => void;
  onSettingsClick?: () => void;
  favRefreshKey?: number;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

type ModalConfig =
  | { type: 'alert'; message: string; onClose: () => void }
  | { type: 'confirm'; message: string; onConfirm: () => void; onCancel: () => void }
  | { type: 'prompt'; message: string; defaultValue: string; onConfirm: (v: string) => void; onCancel: () => void };

function Modal({ config, modalLabels }: { config: ModalConfig; modalLabels: { tip: string; confirm: string; input: string; cancel: string; delete: string; ok: string } }) {
  useModalFocus(true);
  const [inputValue, setInputValue] = useState(
    config.type === 'prompt' ? config.defaultValue : ''
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config.type === 'prompt') {
      setTimeout(() => {
        inputRef.current?.select();
      }, 50);
    }
  }, [config.type]);

  // Focus trap：Tab 在 Modal 内循环，不跳到背景编辑器
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', handler);
    return () => root.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)' }}>
      <div
        ref={containerRef}
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
            {config.type === 'alert' ? modalLabels.tip : config.type === 'confirm' ? modalLabels.confirm : modalLabels.input}
          </div>
          <button
            onClick={() => {
              if (config.type === 'alert') config.onClose();
              else config.onCancel();
            }}
            className="nx-hoverable rounded p-0.5"
            style={{ color: 'var(--c-icoSec)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-sm mb-3" style={{ color: 'var(--c-texSec)' }}>{config.message}</p>
          {config.type === 'prompt' && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') config.onConfirm(inputValue);
                if (e.key === 'Escape') config.onCancel();
              }}
              className="w-full px-3 py-1.5 text-sm rounded-md"
              style={{
                border: '1px solid var(--c-borPri)',
                background: 'var(--c-bacPri)',
                color: 'var(--c-texPri)',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--c-bacPri), 0 0 0 4px var(--nx-blue)'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 pb-4">
          {config.type !== 'alert' && (
            <button
              onClick={config.onCancel}
              className="nx-hoverable px-3 py-1.5 text-sm rounded-md"
              style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
            >
              {modalLabels.cancel}
            </button>
          )}
          <button
            onClick={() => {
              if (config.type === 'alert') config.onClose();
              else if (config.type === 'confirm') config.onConfirm();
              else config.onConfirm(inputValue);
            }}
            className="px-3 py-1.5 text-sm rounded-md transition-colors text-white"
            style={{
              background: config.type === 'confirm' ? 'var(--nx-red)' : 'var(--nx-blue)',
            }}
          >
            {config.type === 'alert' ? modalLabels.ok : config.type === 'confirm' ? modalLabels.delete : modalLabels.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drop indicator ───────────────────────────────────────────────────────────

interface DropPosition {
  parentPath: string;
  index: number;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TreeMenu({
  onSelectItem,
  onCreateArticle,
  onQuickCreateArticle,
  onMoveItem,
  onPathChanged,
  selectedPath,
  className,
  refreshKey,
  onSearchClick,
  onTrashClick,
  onHomeClick,
  onGraphClick,
  onSettingsClick,
  favRefreshKey,
}: TreeMenuProps) {
  const { t } = useI18n();
  const modalLabels = { tip: t('common.tip'), confirm: t('common.confirm'), input: t('common.input'), cancel: t('common.cancel'), delete: t('common.delete'), ok: t('common.confirm') };
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const saved = window.localStorage.getItem('nexo_tree_expanded');
      if (saved) return new Set<string>(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Set<string>();
  });
  const [loading, setLoading] = useState(true);
  const [sortOrders, setSortOrders] = useState<Record<string, string[]>>({});
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  useEffect(() => {
    setFavorites(getFavorites());
  }, [favRefreshKey]);

  // Drag state
  const [draggingItem, setDraggingItem] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [folderDropTarget, setFolderDropTarget] = useState<string | null>(null); // drop INTO folder
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null); // reorder position

  // RAF throttle refs for drag over
  const rafRef = useRef<number | null>(null);
  const pendingDragState = useRef<{ folder: string | null; pos: DropPosition | null }>({ folder: null, pos: null });

  // UI state
  const [contextMenu, setContextMenu] = useState<{ path: string; isFolder: boolean; x: number; y: number } | null>(null);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  const showAlert = (message: string): Promise<void> =>
    new Promise((resolve) => {
      setModal({ type: 'alert', message, onClose: () => { setModal(null); resolve(); } });
    });

  const showConfirm = (message: string): Promise<boolean> =>
    new Promise((resolve) => {
      setModal({
        type: 'confirm',
        message,
        onConfirm: () => { setModal(null); resolve(true); },
        onCancel: () => { setModal(null); resolve(false); },
      });
    });

  const showPrompt = (message: string, defaultValue: string): Promise<string | null> =>
    new Promise((resolve) => {
      setModal({
        type: 'prompt',
        message,
        defaultValue,
        onConfirm: (v) => { setModal(null); resolve(v); },
        onCancel: () => { setModal(null); resolve(null); },
      });
    });

  // ─── Persist expanded state ──────────────────────────────────────────────────

  const expandedSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (expandedSaveTimer.current) clearTimeout(expandedSaveTimer.current);
    expandedSaveTimer.current = setTimeout(() => {
      window.localStorage.setItem('nexo_tree_expanded', JSON.stringify([...expanded]));
    }, 300);
    return () => { if (expandedSaveTimer.current) clearTimeout(expandedSaveTimer.current); };
  }, [expanded]);

  // ─── Auto-expand selected path's ancestors ──────────────────────────────────

  useEffect(() => {
    if (!selectedPath) return;
    const parts = selectedPath.split('/');
    if (parts.length <= 1) return;
    const ancestors: string[] = [];
    for (let i = 1; i < parts.length; i++) {
      ancestors.push(parts.slice(0, i).join('/'));
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const a of ancestors) {
        if (!next.has(a)) { next.add(a); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [selectedPath]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => { fetchTree(); fetchSortOrders(); }, []);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) fetchTree();
  }, [refreshKey]);

  const fetchTree = async () => {
    try {
      const res = await fetch('/api/folders?tree=true');
      const json = await res.json();
      if (json.ok) setTree(json.data);
    } catch (err) {
      console.error('Failed to load tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSortOrders = async () => {
    try {
      const res = await fetch('/api/sort-order');
      const json = await res.json();
      if (json.ok) setSortOrders(json.data);
    } catch (err) {
      console.error('Failed to load sort order:', err);
    }
  };

  const saveSortOrder = async (parentPath: string, order: string[]) => {
    try {
      await fetch('/api/sort-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPath, order }),
      });
    } catch (err) {
      console.error('Failed to save sort order:', err);
    }
  };

  // ─── Sort order ─────────────────────────────────────────────────────────────

  const applySortOrder = (items: TreeItem[], parentPath: string): TreeItem[] => {
    const order = sortOrders[parentPath];
    // 有手动排序时：按 sortOrder 优先，未在 order 里的项按 mtime 降序 fallback
    if (order && order.length > 0) {
      return [...items].sort((a, b) => {
        const ai = order.indexOf(a.name);
        const bi = order.indexOf(b.name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return (b.mtime ?? 0) - (a.mtime ?? 0);
      });
    }
    // 无手动排序：文件夹优先 + mtime 降序（新更新的排前面）
    return [...items].sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return (b.mtime ?? 0) - (a.mtime ?? 0);
    });
  };

  // ─── Toggle folder ──────────────────────────────────────────────────────────

  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // ─── Drag & drop ────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, item: TreeItem) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ path: item.path, isFolder: item.isFolder }));
    setDraggingItem({ path: item.path, isFolder: item.isFolder });
  };

  const handleDragEnd = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDraggingItem(null);
    setFolderDropTarget(null);
    setDropPosition(null);
    pendingDragState.current = { folder: null, pos: null };
  };

  const handleItemDragOver = (
    e: React.DragEvent,
    item: TreeItem,
    parentPath: string,
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (!draggingItem) return;
    if (item.path === draggingItem.path) return;
    if (item.path.startsWith(draggingItem.path + '/')) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;

    let newFolder: string | null = null;
    let newPos: DropPosition | null = null;

    // 命中区规则（修复拖拽误触嵌套的 bug）：
    //   - 目标是文件夹：上 1/3 排前 / 中 1/3 嵌入文件夹 / 下 1/3 排后
    //   - 目标是文章（leaf）：上 1/2 排前 / 下 1/2 排后，绝不允许嵌入
    //     （叶子文章被「自动 promote 为父页」是误操作主要来源，禁掉）
    if (item.isFolder) {
      if (ratio < 1 / 3) {
        newPos = { parentPath, index };
      } else if (ratio > 2 / 3) {
        newPos = { parentPath, index: index + 1 };
      } else {
        newFolder = item.path;
      }
    } else {
      if (ratio < 0.5) {
        newPos = { parentPath, index };
      } else {
        newPos = { parentPath, index: index + 1 };
      }
    }

    // Skip if nothing changed
    const prev = pendingDragState.current;
    const folderSame = prev.folder === newFolder;
    const posSame = prev.pos?.parentPath === newPos?.parentPath && prev.pos?.index === newPos?.index;
    if (folderSame && posSame) return;

    pendingDragState.current = { folder: newFolder, pos: newPos };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setFolderDropTarget(newFolder);
      setDropPosition(newPos);
    });
  };

  const handleItemDrop = async (e: React.DragEvent, item: TreeItem, parentPath: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    let parsed: { path: string; isFolder: boolean };
    try { parsed = JSON.parse(data); } catch { return; }

    const { path: sourcePath, isFolder: sourceIsFolder } = parsed;

    // 使用 pendingDragState.current 而非 state，避免 RAF 异步导致读到旧状态
    const { folder: currentFolder, pos: currentPos } = pendingDragState.current;

    if (currentFolder) {
      // Move into folder
      await doMoveIntoFolder(sourcePath, currentFolder, sourceIsFolder);
    } else if (currentPos) {
      // Reorder within same level
      const sourceParent = sourcePath.includes('/')
        ? sourcePath.substring(0, sourcePath.lastIndexOf('/'))
        : '';

      if (sourceParent === currentPos.parentPath) {
        // Same parent → just reorder
        await doReorder(sourcePath, currentPos.parentPath, currentPos.index, item);
      } else {
        // Different parent → move and then reorder
        await doMoveIntoFolder(sourcePath, currentPos.parentPath || '', sourceIsFolder, currentPos.index);
      }
    }

    setFolderDropTarget(null);
    setDropPosition(null);
    setDraggingItem(null);
    pendingDragState.current = { folder: null, pos: null };
  };

  const doMoveIntoFolder = async (
    sourcePath: string,
    targetFolderPath: string,
    isFolder: boolean,
    insertIndex?: number
  ) => {
    const url = isFolder ? '/api/folders' : '/api/articles';
    const res = await fetch(url, {
      method: isFolder ? 'PUT' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath: sourcePath, newParentPath: targetFolderPath }),
    });
    const json = await res.json();
    if (json.ok) {
      await fetchTree();
      if (targetFolderPath) {
        setExpanded((prev) => new Set([...prev, targetFolderPath]));
      }
      // 计算新路径并通知父组件路径变更（前缀替换）
      const movedName = sourcePath.split('/').pop() || sourcePath;
      const newPath = targetFolderPath ? `${targetFolderPath}/${movedName}` : movedName;
      if (onPathChanged) onPathChanged(sourcePath, newPath);
      if (onMoveItem) await onMoveItem(sourcePath, targetFolderPath, isFolder);

      // If insertIndex provided, also update sort order
      if (insertIndex !== undefined) {
        const movedName = sourcePath.split('/').pop()!;
        const newOrders = { ...sortOrders };
        const siblings = newOrders[targetFolderPath] || [];
        const filtered = siblings.filter((n) => n !== movedName);
        filtered.splice(insertIndex, 0, movedName);
        newOrders[targetFolderPath] = filtered;
        setSortOrders(newOrders);
        await saveSortOrder(targetFolderPath, filtered);
      }
    } else {
      await showAlert(t('tree.moveFailed') + ': ' + json.error);
    }
  };

  const doReorder = async (
    sourcePath: string,
    parentPath: string,
    targetIndex: number,
    _refItem: TreeItem
  ) => {
    // Get current sorted items for this parent
    const parentItems = getItemsForParent(tree, parentPath);
    const sorted = applySortOrder(parentItems, parentPath);
    const names = sorted.map((i) => i.name);

    const sourceName = sourcePath.split('/').pop()!;
    const fromIndex = names.indexOf(sourceName);
    if (fromIndex === -1) return;

    const newNames = [...names];
    newNames.splice(fromIndex, 1);

    // Adjust targetIndex if removing before target
    const adjustedIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    newNames.splice(adjustedIndex, 0, sourceName);

    const newOrders = { ...sortOrders, [parentPath]: newNames };
    setSortOrders(newOrders);
    await saveSortOrder(parentPath, newNames);
  };

  // Helper: get items at a given parent path from the tree
  const getItemsForParent = (items: TreeItem[], parentPath: string): TreeItem[] => {
    if (!parentPath) return items;
    for (const item of items) {
      if (item.path === parentPath && item.isFolder) return item.children || [];
      if (item.isFolder && item.children) {
        const found = getItemsForParent(item.children, parentPath);
        if (found.length > 0 || item.path === parentPath) return found;
      }
    }
    return [];
  };

  // Root drag over / drop (for moving to root level via the bottom zone)
  const handleRootZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRootZoneDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    try {
      const { path: sourcePath, isFolder } = JSON.parse(data);
      if (!sourcePath.includes('/')) return; // already at root
      await doMoveIntoFolder(sourcePath, '', isFolder);
    } catch { /* ignore */ }
  };

  // ─── CRUD operations ────────────────────────────────────────────────────────

  const handleRename = async (oldPath: string, isFolder: boolean) => {
    const oldName = oldPath.split('/').pop() || oldPath;
    const newName = await showPrompt(t('tree.renameTo'), oldName);
    if (!newName || newName === oldName) return;

    const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    try {
      const url = isFolder ? '/api/folders' : '/api/articles';
      const method = isFolder ? 'PUT' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      const json = await res.json();
      if (!json.ok) { await showAlert(t('tree.renameFailed') + ': ' + json.error); return; }

      // Update sort order: replace old name with new name
      const order = sortOrders[parentPath];
      if (order) {
        const newOrder = order.map((n) => (n === oldName ? newName : n));
        const newOrders = { ...sortOrders, [parentPath]: newOrder };
        setSortOrders(newOrders);
        await saveSortOrder(parentPath, newOrder);
      }

      // 通知父组件：路径前缀已变更（当前打开的文章若在此路径下需要跟随更新）
      if (onPathChanged) onPathChanged(oldPath, newPath);

      fetchTree();
    } catch (error) {
      await showAlert(t('tree.renameFailed') + ': ' + (error instanceof Error ? error.message : ''));
    }
  };

  const handleDelete = async (itemPath: string, isFolder: boolean) => {
    const name = itemPath.split('/').pop();
    const confirmed = await showConfirm(
      isFolder ? t('tree.deleteFolderConfirm', { name: name || '' }) : t('tree.deleteConfirm', { name: name || '' })
    );
    if (!confirmed) return;

    try {
      const encoded = encodeURIComponent(itemPath);
      const url = isFolder ? `/api/folders/${encoded}` : `/api/articles/${encoded}`;
      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) { await showAlert(t('tree.deleteFailed') + ': ' + json.error); return; }

      // Remove from sort order
      const parentPath = itemPath.includes('/') ? itemPath.substring(0, itemPath.lastIndexOf('/')) : '';
      const itemName = itemPath.split('/').pop()!;
      const order = sortOrders[parentPath];
      if (order) {
        const newOrder = order.filter((n) => n !== itemName);
        const newOrders = { ...sortOrders, [parentPath]: newOrder };
        setSortOrders(newOrders);
        await saveSortOrder(parentPath, newOrder);
      }

      fetchTree();
    } catch (error) {
      await showAlert(t('tree.deleteFailed') + ': ' + (error instanceof Error ? error.message : ''));
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const close = () => { setContextMenu(null); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const renderDropLine = (parentPath: string, index: number) => {
    if (!dropPosition) return null;
    if (dropPosition.parentPath !== parentPath || dropPosition.index !== index) return null;
    return (
      <li aria-hidden className="pointer-events-none px-2 py-0.5">
        <div className="h-[2px] rounded-full mx-1" style={{ background: 'var(--nx-blue)', boxShadow: '0 0 4px rgba(35,131,226,0.5)' }} />
      </li>
    );
  };

  const renderTree = (items: TreeItem[], depth: number = 0, parentPath: string = '') => {
    const sorted = applySortOrder(items, parentPath);

    return (
      <ul className="space-y-0 list-none p-0 m-0">
        {renderDropLine(parentPath, 0)}
        {sorted.map((item, index) => {
          const hasChildren = !!(item.children && item.children.length > 0);
          const isExpanded = expanded.has(item.path);
          const isFolderTarget = folderDropTarget === item.path;
          const isDragging = draggingItem?.path === item.path;
          const isSelected = selectedPath === item.path;

          return (
            <li key={item.path}>
              <div
                className={cn(
                  'flex items-center rounded min-w-0 transition-colors',
                  isDragging ? 'opacity-40' : ''
                )}
                style={{
                  paddingLeft: `${depth * 16 + 4}px`,
                  background: isFolderTarget ? 'var(--ca-butHovBac)' : undefined,
                  outline: isFolderTarget ? '1px solid var(--nx-blue)' : undefined,
                  borderRadius: '4px',
                  marginLeft: '4px',
                  marginRight: '4px',
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleItemDragOver(e, item, parentPath, index)}
                onDrop={(e) => handleItemDrop(e, item, parentPath, index)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ path: item.path, isFolder: item.isFolder, x: e.clientX, y: e.clientY });
                }}
              >
                {hasChildren ? (
                  <span
                    className="w-4 h-4 flex-shrink-0 flex items-center justify-center cursor-pointer"
                    style={{ color: 'var(--c-icoSec)' }}
                    onClick={(e) => { e.stopPropagation(); toggleFolder(item.path); }}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                ) : (
                  <span className="w-4 flex-shrink-0" />
                )}
                <button
                  className="flex-1 flex items-center gap-2 rounded px-2 text-left min-w-0 transition-colors cursor-grab active:cursor-grabbing"
                  style={{
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'var(--c-texPri)',
                    background: isSelected ? 'var(--ca-sidIteSelBac)' : undefined,
                    borderRadius: '4px',
                    minHeight: '28px',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ca-butHovBac)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '';
                  }}
                  onClick={() => onSelectItem(item.path, item.isFolder, item.idChain)}
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--c-icoSec)' }} />
                  <span className="truncate">{item.name}</span>
                </button>
              </div>

              {hasChildren && isExpanded && renderTree(item.children!, depth + 1, item.path)}

              {renderDropLine(parentPath, index + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className={cn('h-full flex-shrink-0 p-4 flex items-start gap-2', className)} style={{ background: 'var(--c-bacSec)' }}>
        <span aria-hidden style={{ animation: 'spin 1s linear infinite', display: 'inline-block', color: 'var(--c-texDis)', fontSize: '14px' }}>⟳</span>
        <p className="text-sm" style={{ color: 'var(--c-texDis)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex-shrink-0 flex flex-col overflow-hidden', className)} style={{ background: 'var(--c-bacSec)' }}>
      {/* 标题 */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
        <h2 className="px-1" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-texPri)', letterSpacing: '-0.01em' }}>Nexo</h2>
        <div className="flex items-center gap-0.5">
            <button
              onClick={onSearchClick || (() => {})}
              title={t('common.search') + ' (⌘K)'}
              className="nx-hoverable flex items-center justify-center rounded p-1"
              style={{ color: 'var(--c-icoSec)' }}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onQuickCreateArticle) onQuickCreateArticle('');
                else onCreateArticle('');
              }}
              title={t('tree.newRootPage')}
              className="nx-hoverable flex items-center justify-center rounded p-1"
              style={{ color: 'var(--c-icoSec)' }}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
      </div>

      {/* 首页入口 */}
      {onHomeClick && (
        <div className="px-2 pt-1 space-y-0.5">
          <button
            onClick={onHomeClick}
            className={cn(
              'nx-hoverable w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm',
              !selectedPath && 'font-medium',
            )}
            style={{
              color: !selectedPath ? 'var(--c-texPri)' : 'var(--c-texSec)',
              background: !selectedPath ? 'var(--c-bacTer)' : 'transparent',
            }}
          >
            <Home style={{ width: '15px', height: '15px', color: 'var(--c-icoSec)' }} />
            {t('home.homepage')}
          </button>
        </div>
      )}

      {/* 收藏文档 */}
      {favorites.length > 0 && (
        <div className="px-2 pb-1" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
          <div className="flex items-center gap-1 px-1 py-1">
            <Star style={{ width: '12px', height: '12px', color: 'var(--nx-yellow)', fill: 'var(--nx-yellow)' }} />
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--c-texDis)' }}>{t('favorites.title')}</span>
          </div>
          {favorites.map((fav) => (
            <button
              key={fav.path}
              onClick={() => onSelectItem(fav.path, false, undefined)}
              className={cn(
                'nx-hoverable w-full flex items-center gap-2 px-2 py-1 rounded text-sm truncate',
                selectedPath === fav.path && 'font-medium',
              )}
              style={{
                color: selectedPath === fav.path ? 'var(--c-texPri)' : 'var(--c-texSec)',
                background: selectedPath === fav.path ? 'var(--c-bacTer)' : 'transparent',
              }}
            >
              <FileText style={{ width: '13px', height: '13px', color: 'var(--c-icoSec)', flexShrink: 0 }} />
              <span className="truncate">{fav.title || fav.path.split('/').pop()}</span>
            </button>
          ))}
        </div>
      )}

      {/* 文件树 */}
      <div
        className="flex-1 overflow-y-auto p-2 thin-scrollbar"
        onDragOver={handleRootZoneDragOver}
        onDrop={handleRootZoneDrop}
      >
        {tree.length === 0 ? (
          <div className="p-2 text-sm" style={{ color: 'var(--c-texDis)' }}>
            <p>{t('tree.emptyTree')}</p>
          </div>
        ) : (
          renderTree(tree)
        )}
        {draggingItem && draggingItem.path.includes('/') && (
          <div
            className="mt-4 p-3 rounded-md text-center text-sm"
            style={{ border: '2px dashed var(--c-borPri)', color: 'var(--c-texTer)' }}
          >
            {t('tree.moveTo')} /
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (() => {
        const MENU_W = 180;
        const MENU_H = 120;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const left = Math.min(contextMenu.x, vw - MENU_W - 8);
        const top = Math.min(contextMenu.y, vh - MENU_H - 8);
        return (
        <div
          className="fixed z-50 py-1 min-w-[160px]"
          style={{
            left,
            top,
            background: 'var(--c-bacPri)',
            borderRadius: '4px',
            boxShadow: 'var(--c-shaOutMd)',
            border: '1px solid var(--c-borPri)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="nx-hoverable w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
            style={{ color: 'var(--c-texSec)' }}
            onClick={() => { onCreateArticle(contextMenu.path); setContextMenu(null); }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: 'var(--c-icoSec)' }} />
            {t('tree.newSubPage')}
          </button>
          <div className="my-1" style={{ borderTop: '1px solid var(--c-borSec)' }} />
          <button
            className="nx-hoverable w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
            style={{ color: 'var(--c-texSec)' }}
            onClick={() => { handleRename(contextMenu.path, contextMenu.isFolder); setContextMenu(null); }}
          >
            <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--c-icoSec)' }} />
            {t('common.rename')}
          </button>
          <button
            className="nx-hoverable-danger w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
            style={{ color: 'var(--nx-red)' }}
            onClick={() => { handleDelete(contextMenu.path, contextMenu.isFolder); setContextMenu(null); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('common.delete')}
          </button>
        </div>
        );
      })()}

      {/* 底部工具栏 */}
      <div className="flex items-center gap-1 px-3 py-2" style={{ borderTop: '1px solid var(--c-borSec)' }}>
          {onGraphClick && (
            <button
              onClick={onGraphClick}
              title={t('graph.title')}
              className="nx-hoverable flex items-center gap-1.5 text-xs px-2 py-1.5 rounded"
              style={{ color: 'var(--c-texTer)' }}
            >
              <GitFork className="h-3.5 w-3.5" />
              {t('graph.title')}
            </button>
          )}
          {onTrashClick && (
            <button
              onClick={onTrashClick}
              title={t('trash.title')}
              className="nx-hoverable flex items-center gap-1.5 text-xs px-2 py-1.5 rounded"
              style={{ color: 'var(--c-texTer)' }}
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
              {t('trash.title')}
            </button>
          )}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              title={t('settings.title')}
              className="nx-hoverable ml-auto flex items-center justify-center text-xs px-2 py-1.5 rounded"
              style={{ color: 'var(--c-texTer)' }}
              aria-label={t('settings.title')}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

      {/* 自定义弹窗 */}
      {modal && <Modal config={modal} modalLabels={modalLabels} />}
    </div>
  );
}
