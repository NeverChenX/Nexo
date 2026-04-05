'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, FolderOpen, FileText, Plus } from 'lucide-react';

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

  const [contextMenu, setContextMenu] = useState<{ path: string; x: number; y: number } | null>(null);

  // 点击空白处关闭右键菜单
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

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
                    setContextMenu({ path: item.path, x: rect.right, y: rect.bottom });
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
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
            onClick={() => {
              onCreateArticle(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <FileText className="h-3.5 w-3.5 text-gray-400" />
            新建文章
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
            onClick={() => {
              onCreateFolder(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            新建文件夹
          </button>
        </div>
      )}
    </div>
  );
}
