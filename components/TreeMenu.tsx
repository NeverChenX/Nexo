'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, FolderOpen, FileText, Plus, Pencil, Trash2 } from 'lucide-react';

interface TreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeItem[];
}

interface TreeMenuProps {
  onSelectItem: (path: string, isFolder: boolean) => void;
  onCreateArticle: (folderPath: string) => void;
  onCreateFolder: (folderPath: string) => void;
  selectedPath?: string;
}

export function TreeMenu({
  onSelectItem,
  onCreateArticle,
  onCreateFolder,
  selectedPath,
}: TreeMenuProps) {
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const [contextMenu, setContextMenu] = useState<{ path: string; isFolder: boolean; x: number; y: number } | null>(null);

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
    const typeName = isFolder ? '文件夹' : '文章';
    if (!confirm(`确定要删除${typeName} "${itemPath.split('/').pop()}" 吗？${isFolder ? '\n（包含的所有内容也会被删除）' : ''}`)) return;

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
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.path}>
          <div
            className="group flex items-center"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            {item.isFolder ? (
              <>
                <button
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200"
                  onClick={() => toggleFolder(item.path)}
                >
                  {expanded.has(item.path) ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </button>
                <button
                  className={`flex-1 flex items-center gap-2 rounded px-2 py-1.5 text-sm text-left hover:bg-slate-100 ${
                    selectedPath === item.path ? 'bg-slate-100 font-medium' : ''
                  }`}
                  onClick={() => {
                    toggleFolder(item.path);
                    onSelectItem(item.path, true);
                  }}
                >
                  <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
                {/* hover 时显示 + 按钮 */}
                <button
                  className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setContextMenu({ path: item.path, isFolder: true, x: rect.right, y: rect.bottom });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </>
            ) : (
              <>
                <div className="w-6" />
                <button
                  className={`flex-1 flex items-center gap-2 rounded px-2 py-1.5 text-sm text-left hover:bg-slate-100 ${
                    selectedPath === item.path ? 'bg-blue-50 text-blue-700 font-medium' : ''
                  }`}
                  onClick={() => onSelectItem(item.path, false)}
                >
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
                <button
                  className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setContextMenu({ path: item.path, isFolder: false, x: rect.right, y: rect.bottom });
                  }}
                >
                  <Pencil className="h-3 w-3 text-gray-400" />
                </button>
              </>
            )}
          </div>

          {item.isFolder && expanded.has(item.path) && item.children && item.children.length > 0 && (
            renderTree(item.children, depth + 1)
          )}
        </li>
      ))}
    </ul>
  );

  if (loading) {
    return (
      <div className="w-64 border-r border-slate-200 bg-white flex-shrink-0 p-4">
        <p className="text-sm text-gray-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-slate-200 bg-white flex-shrink-0 flex flex-col overflow-hidden">
      {/* 标题 + 新建按钮 */}
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-bold mb-3">Never Wiki</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs flex-1"
            onClick={() => onCreateArticle('')}
          >
            <Plus className="h-3 w-3 mr-1" />
            新文章
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs flex-1"
            onClick={() => onCreateFolder('')}
          >
            <Plus className="h-3 w-3 mr-1" />
            新文件夹
          </Button>
        </div>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-y-auto p-2">
        {tree.length === 0 ? (
          <p className="p-2 text-sm text-gray-400">还没有内容，点击上方按钮新建</p>
        ) : (
          renderTree(tree)
        )}
      </div>

      {/* 弹出菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isFolder && (
            <>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
                onClick={() => { onCreateArticle(contextMenu.path); setContextMenu(null); }}
              >
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                新建文章
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
                onClick={() => { onCreateFolder(contextMenu.path); setContextMenu(null); }}
              >
                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                新建文件夹
              </button>
              <div className="border-t border-slate-100 my-1" />
            </>
          )}
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
