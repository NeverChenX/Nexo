'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, FileText, Plus, Pencil, Trash2 } from 'lucide-react';

interface TreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeItem[];
}

interface TreeMenuProps {
  onSelectItem: (path: string, isFolder: boolean) => void;
  onCreateArticle: (parentPath: string) => void;
  onMoveItem?: (oldPath: string, newParentPath: string, isFolder: boolean) => Promise<boolean>;
  selectedPath?: string;
  className?: string;
}

export function TreeMenu({
  onSelectItem,
  onCreateArticle,
  onMoveItem,
  selectedPath,
  className,
}: TreeMenuProps) {
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [isDraggingFolder, setIsDraggingFolder] = useState(false);

  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const res = await fetch('/api/folders?tree=true');
      const json = await res.json();
      if (json.ok) {
        setTree(json.data);
      }
    } catch (error) {
      console.error('Failed to load tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const [contextMenu, setContextMenu] = useState<{ path: string; isFolder: boolean; x: number; y: number } | null>(null);

  // 拖拽处理
  const handleDragStart = (e: React.DragEvent, item: TreeItem) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ path: item.path, isFolder: item.isFolder }));
    setDraggingPath(item.path);
    setIsDraggingFolder(item.isFolder);
  };

  const handleDragEnd = () => {
    setDraggingPath(null);
    setDragOverPath(null);
    setIsDraggingFolder(false);
  };

  const handleDragOver = (e: React.DragEvent, item: TreeItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 只能拖放到文件夹上
    if (!item.isFolder) return;
    
    // 不能拖放到自身
    if (item.path === draggingPath) return;
    
    // 不能拖放到自身子目录
    if (item.path.startsWith(draggingPath + '/')) return;
    
    setDragOverPath(item.path);
  };

  const handleDragLeave = () => {
    setDragOverPath(null);
  };

  const handleDrop = async (e: React.DragEvent, targetItem: TreeItem) => {
    e.preventDefault();
    setDragOverPath(null);
    
    if (!targetItem.isFolder) return;
    
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    try {
      const { path: sourcePath, isFolder } = JSON.parse(data);
      
      if (sourcePath === targetItem.path) return;
      if (targetItem.path.startsWith(sourcePath + '/')) return;
      
      // 调用移动 API
      const url = isFolder ? '/api/folders' : '/api/articles';
      const res = await fetch(url, {
        method: isFolder ? 'PUT' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: sourcePath, newParentPath: targetItem.path }),
      });
      
      const json = await res.json();
      if (json.ok) {
        // 刷新树
        await fetchTree();
        // 展开目标文件夹
        setExpanded(prev => new Set([...prev, targetItem.path]));
        // 通知父组件
        if (onMoveItem) {
          await onMoveItem(sourcePath, targetItem.path, isFolder);
        }
      } else {
        alert('移动失败: ' + json.error);
      }
    } catch (error) {
      console.error('Failed to move item:', error);
      alert('移动失败');
    }
  };

  // 根目录放置处理（移动到根）
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    try {
      const { path: sourcePath, isFolder } = JSON.parse(data);
      
      // 已经在根目录
      if (!sourcePath.includes('/')) return;
      
      // 调用移动 API（移动到根目录，newParentPath 为空字符串）
      const url = isFolder ? '/api/folders' : '/api/articles';
      const res = await fetch(url, {
        method: isFolder ? 'PUT' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: sourcePath, newParentPath: '' }),
      });
      
      const json = await res.json();
      if (json.ok) {
        await fetchTree();
        if (onMoveItem) {
          await onMoveItem(sourcePath, '', isFolder);
        }
      } else {
        alert('移动失败: ' + json.error);
      }
    } catch (error) {
      console.error('Failed to move item:', error);
      alert('移动失败');
    }
  };

  // 点击空白处关闭右键菜单
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleRename = async (oldPath: string, isFolder: boolean) => {
    const oldName = oldPath.split('/').pop() || oldPath;
    const newName = prompt('输入新名称:', oldName);
    if (!newName || newName === oldName) return;

    const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    try {
      if (isFolder) {
        const res = await fetch('/api/folders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath, newPath }),
        });
        const json = await res.json();
        if (!json.ok) { alert('重命名失败: ' + json.error); return; }
      } else {
        const res = await fetch('/api/articles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath, newPath }),
        });
        const json = await res.json();
        if (!json.ok) { alert('重命名失败: ' + json.error); return; }
      }
      fetchTree();
    } catch (error) {
      alert('重命名失败: ' + error);
    }
  };

  const handleDelete = async (itemPath: string, isFolder: boolean) => {
    const name = itemPath.split('/').pop();
    if (!confirm(`确定要删除文档 "${name}" 吗？${isFolder ? '\n（包含的所有子文档也会被删除）' : ''}`)) return;

    try {
      const encoded = encodeURIComponent(itemPath);
      const url = isFolder ? `/api/folders/${encoded}` : `/api/articles/${encoded}`;
      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) {
        alert('删除失败: ' + json.error);
        return;
      }
      fetchTree();
    } catch (error) {
      alert('删除失败: ' + error);
    }
  };

  const renderTree = (items: TreeItem[], depth: number = 0) => (
    <ul className="space-y-0.5 list-none p-0 m-0">
      {items.map((item) => {
        const hasChildren = item.isFolder && item.children && item.children.length > 0;
        const isExpanded = expanded.has(item.path);
        const isDragOver = dragOverPath === item.path && item.isFolder;
        const isDragging = draggingPath === item.path;

        return (
          <li key={item.path}>
            <div
              className={`group flex items-center rounded-md min-w-0 transition-colors ${
                isDragOver ? 'bg-blue-100 ring-1 ring-blue-300' : ''
              } ${isDragging ? 'opacity-50' : ''}`}
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item)}
            >
              {item.isFolder ? (
                <span
                  className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-slate-400 cursor-pointer hover:text-slate-600"
                  onClick={(e) => { e.stopPropagation(); toggleFolder(item.path); }}
                >
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
              ) : (
                <span className="w-4 flex-shrink-0" />
              )}
              <button
                className={`flex-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] text-left text-slate-700 hover:bg-slate-100 min-w-0 cursor-grab active:cursor-grabbing ${
                  selectedPath === item.path ? 'bg-slate-200/70 font-medium text-slate-900' : ''
                }`}
                onClick={() => onSelectItem(item.path, item.isFolder)}
              >
                <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
              <button
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setContextMenu({ path: item.path, isFolder: item.isFolder, x: rect.right, y: rect.bottom });
                }}
              >
                <Plus className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>

            {hasChildren && isExpanded && renderTree(item.children!, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  if (loading) {
    return (
      <div className={cn('h-full border-r border-slate-200 bg-white flex-shrink-0 p-4', className)}>
        <p className="text-sm text-gray-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className={cn('h-full border-r border-slate-200 bg-[#fbfbfa] flex-shrink-0 flex flex-col overflow-hidden', className)}>
      {/* 标题 + 新建按钮 */}
      <div className="p-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-2 px-1">Nexo</h2>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs w-full bg-white"
          onClick={() => onCreateArticle('')}
        >
          <Plus className="h-3 w-3 mr-1" />
          新文档
        </Button>
      </div>

      {/* 文件树 */}
      <div 
        className="flex-1 overflow-y-auto p-2 thin-scrollbar"
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
      >
        {tree.length === 0 ? (
          <p className="p-2 text-sm text-gray-400">还没有内容，点击上方按钮新建</p>
        ) : (
          renderTree(tree)
        )}
        {/* 根目录放置区域提示 */}
        {draggingPath && (
          <div className="mt-4 p-3 border-2 border-dashed border-slate-300 rounded-md text-center text-sm text-slate-500">
            拖放到此处移动到根目录
          </div>
        )}
      </div>

      {/* 弹出菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
            onClick={() => { onCreateArticle(contextMenu.isFolder ? contextMenu.path : ''); setContextMenu(null); }}
          >
            <FileText className="h-3.5 w-3.5 text-gray-400" />
            新建子文档
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
            onClick={() => { handleRename(contextMenu.path, contextMenu.isFolder); setContextMenu(null); }}
          >
            <Pencil className="h-3.5 w-3.5 text-gray-400" />
            重命名
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            onClick={() => { handleDelete(contextMenu.path, contextMenu.isFolder); setContextMenu(null); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      )}
    </div>
  );
}
