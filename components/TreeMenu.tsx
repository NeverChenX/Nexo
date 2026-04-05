'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarTrigger,
} from '@/components/ui/sidebar';
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

  const renderTree = (items: TreeItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.path}>
          <div className="flex items-center gap-0">
            {item.isFolder ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleFolder(item.path)}
                >
                  {expanded.has(item.path) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <SidebarMenuButton
                  onClick={() => onSelectItem(item.path, true)}
                  isActive={selectedPath === item.path}
                  className="flex-1"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              </>
            ) : (
              <>
                <div className="w-8" />
                <SidebarMenuButton
                  onClick={() => onSelectItem(item.path, false)}
                  isActive={selectedPath === item.path}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4" />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              </>
            )}
          </div>

          {item.isFolder && expanded.has(item.path) && item.children && (
            <>
              {item.children.length > 0 && (
                <SidebarMenuSub>
                  {renderTree(item.children)}
                </SidebarMenuSub>
              )}
              <div className="flex gap-1 px-4 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onCreateArticle(item.path)}
                >
                  <Plus className="h-3 w-3" />
                  <span>文章</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onCreateFolder(item.path)}
                >
                  <Plus className="h-3 w-3" />
                  <span>文件夹</span>
                </Button>
              </div>
            </>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  if (loading) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="p-4">加载中...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-bold">Never Wiki</h2>
        </div>
        <div className="flex gap-2 px-4 pb-3">
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
      </SidebarHeader>
      <SidebarContent>
        {tree.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">
            还没有内容，点击上方按钮新建
          </div>
        ) : (
          renderTree(tree)
        )}
      </SidebarContent>
    </Sidebar>
  );
}
