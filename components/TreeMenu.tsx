'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, FileText, FolderOpen, FolderClosed, Pencil, Trash2, X, AlertCircle, Plus } from 'lucide-react';

interface TreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeItem[];
}

interface TreeMenuProps {
  mode?: 'editor' | 'read';
  onSelectItem: (path: string, isFolder: boolean) => void;
  onCreateArticle: (parentPath: string) => void;
  onMoveItem?: (oldPath: string, newParentPath: string, isFolder: boolean) => Promise<boolean>;
  selectedPath?: string;
  className?: string;
  refreshKey?: number;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

type ModalConfig =
  | { type: 'alert'; message: string; onClose: () => void }
  | { type: 'confirm'; message: string; onConfirm: () => void; onCancel: () => void }
  | { type: 'prompt'; message: string; defaultValue: string; onConfirm: (v: string) => void; onCancel: () => void };

function Modal({ config }: { config: ModalConfig }) {
  const [inputValue, setInputValue] = useState(
    config.type === 'prompt' ? config.defaultValue : ''
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config.type === 'prompt') {
      setTimeout(() => {
        inputRef.current?.select();
      }, 50);
    }
  }, [config.type]);

  return (
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
            {config.type === 'alert' ? '提示' : config.type === 'confirm' ? '确认' : '输入'}
          </div>
          <button
            onClick={() => {
              if (config.type === 'alert') config.onClose();
              else config.onCancel();
            }}
            className="notion-hoverable rounded p-0.5"
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
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--c-bacPri), 0 0 0 4px var(--notion-blue)'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 pb-4">
          {config.type !== 'alert' && (
            <button
              onClick={config.onCancel}
              className="notion-hoverable px-3 py-1.5 text-sm rounded-md"
              style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
            >
              取消
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
              background: config.type === 'confirm' ? 'var(--notion-red)' : 'var(--notion-blue)',
            }}
          >
            {config.type === 'alert' ? '确定' : config.type === 'confirm' ? '删除' : '确定'}
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
  mode = 'editor',
  onSelectItem,
  onCreateArticle,
  onMoveItem,
  selectedPath,
  className,
  refreshKey,
}: TreeMenuProps) {
  const isReadMode = mode === 'read';
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortOrders, setSortOrders] = useState<Record<string, string[]>>({});

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
    } catch {
      // 加载失败
    } finally {
      setLoading(false);
    }
  };

  const fetchSortOrders = async () => {
    try {
      const res = await fetch('/api/sort-order');
      const json = await res.json();
      if (json.ok) setSortOrders(json.data);
    } catch {
      // ignore
    }
  };

  const saveSortOrder = async (parentPath: string, order: string[]) => {
    try {
      await fetch('/api/sort-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPath, order }),
      });
    } catch {
      // ignore
    }
  };

  // ─── Sort order ─────────────────────────────────────────────────────────────

  const applySortOrder = (items: TreeItem[], parentPath: string): TreeItem[] => {
    const order = sortOrders[parentPath];
    if (!order || order.length === 0) return items;
    return [...items].sort((a, b) => {
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
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

    if (ratio > 0.25 && ratio < 0.75) {
      newFolder = item.path;
    } else if (ratio <= 0.5) {
      newPos = { parentPath, index };
    } else {
      newPos = { parentPath, index: index + 1 };
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
      await showAlert('移动失败: ' + json.error);
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
    const newName = await showPrompt('输入新名称:', oldName);
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
      if (!json.ok) { await showAlert('重命名失败: ' + json.error); return; }

      // Update sort order: replace old name with new name
      const order = sortOrders[parentPath];
      if (order) {
        const newOrder = order.map((n) => (n === oldName ? newName : n));
        const newOrders = { ...sortOrders, [parentPath]: newOrder };
        setSortOrders(newOrders);
        await saveSortOrder(parentPath, newOrder);
      }

      fetchTree();
    } catch (error) {
      await showAlert('重命名失败: ' + error);
    }
  };

  const handleDelete = async (itemPath: string, isFolder: boolean) => {
    const name = itemPath.split('/').pop();
    const confirmed = await showConfirm(
      `确定要删除 "${name}" 吗？${isFolder ? '\n（包含的所有子文档也会被删除）' : ''}`
    );
    if (!confirmed) return;

    try {
      const encoded = encodeURIComponent(itemPath);
      const url = isFolder ? `/api/folders/${encoded}` : `/api/articles/${encoded}`;
      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) { await showAlert('删除失败: ' + json.error); return; }

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
      await showAlert('删除失败: ' + error);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const renderDropLine = (parentPath: string, index: number) => {
    if (!dropPosition) return null;
    if (dropPosition.parentPath !== parentPath || dropPosition.index !== index) return null;
    return (
      <li aria-hidden className="pointer-events-none px-2 py-0.5">
        <div className="h-[2px] rounded-full mx-1" style={{ background: 'var(--notion-blue)', boxShadow: '0 0 4px rgba(35,131,226,0.5)' }} />
      </li>
    );
  };

  const renderTree = (items: TreeItem[], depth: number = 0, parentPath: string = '') => {
    const sorted = applySortOrder(items, parentPath);

    // Notion 统一字号和字重
    const getFontSize = () => '14px';
    const getFolderWeight = () => 400;

    return (
      <ul className="space-y-0 list-none p-0 m-0">
        {renderDropLine(parentPath, 0)}
        {sorted.map((item, index) => {
          const hasChildren = item.isFolder && item.children && item.children.length > 0;
          const isExpanded = expanded.has(item.path);
          const isFolderTarget = folderDropTarget === item.path;
          const isDragging = draggingItem?.path === item.path;
          const isSelected = selectedPath === item.path;
          const FolderIcon = isExpanded ? FolderOpen : FolderClosed;

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
                  outline: isFolderTarget ? '1px solid var(--notion-blue)' : undefined,
                  borderRadius: '4px',
                  marginTop: item.isFolder && depth === 0 && index > 0 ? '4px' : undefined,
                }}
                draggable={!isReadMode}
                onDragStart={isReadMode ? undefined : (e) => handleDragStart(e, item)}
                onDragEnd={isReadMode ? undefined : handleDragEnd}
                onDragOver={isReadMode ? undefined : (e) => handleItemDragOver(e, item, parentPath, index)}
                onDrop={isReadMode ? undefined : (e) => handleItemDrop(e, item, parentPath, index)}
                onContextMenu={isReadMode ? undefined : (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ path: item.path, isFolder: item.isFolder, x: e.clientX, y: e.clientY });
                }}
              >
                {item.isFolder ? (
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
                  className={`flex-1 flex items-center gap-1.5 rounded px-2 py-1 text-left min-w-0 transition-colors ${isReadMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
                  style={{
                    fontSize: getFontSize(),
                    fontWeight: item.isFolder ? getFolderWeight() : 400,
                    color: 'var(--c-texPri)',
                    background: isSelected ? 'var(--ca-sidIteSelBac)' : undefined,
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ca-butHovBac)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '';
                  }}
                  onClick={() => onSelectItem(item.path, item.isFolder)}
                >
                  {item.isFolder ? (
                    <FolderIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--c-icoSec)' }} />
                  ) : (
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--c-icoSec)' }} />
                  )}
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
      <div className={cn('h-full flex-shrink-0 p-4 border-r', className)} style={{ background: 'var(--c-bacSec)', borderColor: 'var(--c-borSec)' }}>
        <p className="text-sm" style={{ color: 'var(--c-texDis)' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex-shrink-0 flex flex-col overflow-hidden border-r', className)} style={{ background: 'var(--c-bacSec)', borderColor: 'var(--c-borSec)' }}>
      {/* 标题 */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
        <h2 className="px-1" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--c-texPri)' }}>Nexo</h2>
        {!isReadMode && (
          <button
            onClick={() => onCreateArticle('')}
            title="新建文档"
            className="notion-hoverable flex items-center justify-center rounded p-1"
            style={{ color: 'var(--c-icoSec)' }}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 文件树 */}
      <div
        className="flex-1 overflow-y-auto p-2 thin-scrollbar"
        onDragOver={handleRootZoneDragOver}
        onDrop={handleRootZoneDrop}
      >
        {tree.length === 0 ? (
          <p className="p-2 text-sm" style={{ color: 'var(--c-texDis)' }}>还没有内容，右键新建</p>
        ) : (
          renderTree(tree)
        )}
        {!isReadMode && draggingItem && draggingItem.path.includes('/') && (
          <div
            className="mt-4 p-3 rounded-md text-center text-sm"
            style={{ border: '2px dashed var(--c-borPri)', color: 'var(--c-texTer)' }}
          >
            拖放到此处移动到根目录
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {!isReadMode && contextMenu && (
        <div
          className="fixed z-50 py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--c-bacPri)',
            borderRadius: '6px',
            boxShadow: 'var(--c-shaOutMd)',
            border: '1px solid var(--c-borPri)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="notion-hoverable w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
            style={{ color: 'var(--c-texSec)' }}
            onClick={() => { onCreateArticle(contextMenu.path); setContextMenu(null); }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: 'var(--c-icoSec)' }} />
            新建子页面
          </button>
          <div className="my-1" style={{ borderTop: '1px solid var(--c-borSec)' }} />
          <button
            className="notion-hoverable w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
            style={{ color: 'var(--c-texSec)' }}
            onClick={() => { handleRename(contextMenu.path, contextMenu.isFolder); setContextMenu(null); }}
          >
            <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--c-icoSec)' }} />
            重命名
          </button>
          <button
            className="notion-hoverable-danger w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
            style={{ color: 'var(--notion-red)' }}
            onClick={() => { handleDelete(contextMenu.path, contextMenu.isFolder); setContextMenu(null); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      )}

      {/* 自定义弹窗 */}
      {modal && <Modal config={modal} />}
    </div>
  );
}
