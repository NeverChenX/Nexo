'use client';

import { useState, useEffect } from 'react';

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

  // 加载树结构
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

  const handleCreateArticle = async (folderPath: string) => {
    const name = prompt('输入新文章名称:');
    if (name) {
      onCreateArticle(folderPath);
    }
  };

  const renderTree = (items: TreeItem[], level: number = 0) => {
    return (
      <ul className="list-none">
        {items.map((item) => (
          <li key={item.path} style={{ paddingLeft: `${level * 12}px` }}>
            <div className="flex items-center gap-1 py-1">
              {item.isFolder && (
                <button
                  onClick={() => toggleFolder(item.path)}
                  className="w-5 text-center text-xs cursor-pointer"
                >
                  {expanded.has(item.path) ? '▼' : '▶'}
                </button>
              )}
              {!item.isFolder && <span className="w-5 text-center">📄</span>}
              {item.isFolder && <span className="w-5 text-center">📁</span>}
              <button
                onClick={() => onSelectItem(item.path, item.isFolder)}
                className={`flex-1 text-left text-sm py-1 px-2 rounded ${
                  selectedPath === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {item.name}
              </button>
            </div>

            {item.isFolder && expanded.has(item.path) && item.children && (
              <>
                {renderTree(item.children, level + 1)}
                <div className="flex gap-1 py-1 px-2" style={{ paddingLeft: `${(level + 1) * 12}px` }}>
                  <button
                    onClick={() => handleCreateArticle(item.path)}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    新文章
                  </button>
                  <button
                    onClick={() => onCreateFolder(item.path)}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  >
                    新文件夹
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return <div className="p-4">加载中...</div>;
  }

  return (
    <div className="menu-container p-4">
      <h2 className="font-bold mb-4">Wiki</h2>
      {tree.length === 0 ? (
        <div className="text-gray-500 text-sm">
          <p>空白 wiki</p>
          <button
            onClick={() => onCreateArticle('')}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mt-2"
          >
            新建文章
          </button>
        </div>
      ) : (
        renderTree(tree)
      )}
    </div>
  );
}
