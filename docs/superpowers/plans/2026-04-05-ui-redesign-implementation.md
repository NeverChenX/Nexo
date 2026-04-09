# shadcn-ui UI 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 shadcn-ui 组件库重构 Never Wiki 的前端 UI，提升视觉外观和用户体验。

**Architecture:** 保留所有后端 API 和核心功能不变，仅替换前端 UI 组件。使用 shadcn-ui 提供的现代组件（Button、Card、Tabs、Dialog、Sidebar 等）重新设计三个主要页面（编辑、查看、分享）。

**Tech Stack:** shadcn-ui CLI、Radix UI、React、TypeScript、TailwindCSS

---

## 文件变更计划

**新增：**
- `components/ui/*` - shadcn-ui 组件（自动生成）
- `components/Sidebar.tsx` - 改进的左侧菜单

**修改：**
- `components/TreeMenu.tsx` - 使用 Sidebar 样式
- `components/Editor.tsx` - Card 包装
- `components/Preview.tsx` - Card 包装 + 排版优化
- `components/ShareModal.tsx` - Dialog 替换
- `app/editor/page.tsx` - 新布局（Tabs）
- `app/view/page.tsx` - 新布局
- `app/share/[token]/page.tsx` - 新样式
- `app/globals.css` - shadcn-ui 主题配置
- `package.json` - 添加 shadcn-ui 依赖
- `tailwind.config.ts` - shadcn-ui 配置

---

## 任务分解

### Task 1: 安装 shadcn-ui CLI 和初始化

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: 安装 shadcn-ui CLI**

```bash
npm install -D shadcn-ui
```

- [ ] **Step 2: 初始化 shadcn-ui**

```bash
npx shadcn-ui@latest init
```

按提示选择：
- `Would you like to use TypeScript?` → `yes`
- `Which style would you like to use?` → `Default`
- `Which color would you like as the base color?` → `Slate`

- [ ] **Step 3: 验证初始化成功**

检查是否生成了 `components/ui/` 目录和更新的 `tailwind.config.ts`

- [ ] **Step 4: Commit**

```bash
git add package.json tailwind.config.ts components/ui tsconfig.json
git commit -m "feat: initialize shadcn-ui and install dependencies"
```

---

### Task 2: 添加必需的 shadcn-ui 组件

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/tabs.tsx`
- Create: `components/ui/dialog.tsx`
- Create: `components/ui/sidebar.tsx`
- Create: `components/ui/sheet.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/label.tsx`

- [ ] **Step 1: 添加 Button 组件**

```bash
npx shadcn-ui@latest add button
```

- [ ] **Step 2: 添加 Card 组件**

```bash
npx shadcn-ui@latest add card
```

- [ ] **Step 3: 添加 Tabs 组件**

```bash
npx shadcn-ui@latest add tabs
```

- [ ] **Step 4: 添加 Dialog 组件**

```bash
npx shadcn-ui@latest add dialog
```

- [ ] **Step 5: 添加 Sidebar 组件**

```bash
npx shadcn-ui@latest add sidebar
```

- [ ] **Step 6: 添加 Sheet 组件**

```bash
npx shadcn-ui@latest add sheet
```

- [ ] **Step 7: 添加 Input 组件**

```bash
npx shadcn-ui@latest add input
```

- [ ] **Step 8: 添加 Label 组件**

```bash
npx shadcn-ui@latest add label
```

- [ ] **Step 9: Commit**

```bash
git add components/ui/
git commit -m "feat: add shadcn-ui component library"
```

---

### Task 3: 改进 TreeMenu 组件（使用 Sidebar）

**Files:**
- Modify: `components/TreeMenu.tsx`

- [ ] **Step 1: 重写 TreeMenu 使用 shadcn-ui**

```typescript
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
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
        <h2 className="text-lg font-bold px-4 py-2">Never Wiki</h2>
      </SidebarHeader>
      <SidebarContent>
        {tree.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">
            <p className="mb-2">空白 wiki</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateArticle('')}
            >
              <Plus className="h-3 w-3 mr-1" />
              新建文章
            </Button>
          </div>
        ) : (
          renderTree(tree)
        )}
      </SidebarContent>
    </Sidebar>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/TreeMenu.tsx
git commit -m "refactor: redesign TreeMenu with shadcn-ui Sidebar"
```

---

### Task 4: 改进 Editor 和 Preview 组件

**Files:**
- Modify: `components/Editor.tsx`
- Modify: `components/Preview.tsx`

- [ ] **Step 1: 更新 Editor 组件**

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import 'easymde/dist/easymde.min.css';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function Editor({ content, onChange, readOnly = false }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const easyMDERef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !textareaRef.current || easyMDERef.current) return;

    import('easymde').then((module) => {
      const EasyMDE = module.default;

      try {
        easyMDERef.current = new EasyMDE({
          element: textareaRef.current!,
          spellChecker: false,
          autoDownloadFontAwesome: false,
          toolbar: readOnly ? false : undefined,
          status: !readOnly,
          initialValue: content,
          onUpdate: () => {
            const value = easyMDERef.current?.value() || '';
            onChange(value);
          },
        });
      } catch (error) {
        console.error('Failed to initialize EasyMDE:', error);
      }
    });

    return () => {
      if (easyMDERef.current && easyMDERef.current.codemirror) {
        easyMDERef.current.codemirror.toTextArea();
        easyMDERef.current = null;
      }
    };
  }, [mounted]);

  useEffect(() => {
    if (easyMDERef.current && content) {
      easyMDERef.current.value(content);
    }
  }, [content]);

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <div className="flex-1 overflow-auto">
        <textarea ref={textareaRef} defaultValue={content} />
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: 更新 Preview 组件**

```typescript
'use client';

import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';

interface PreviewProps {
  content: string;
}

export function Preview({ content }: PreviewProps) {
  return (
    <Card className="h-full flex flex-col border-0 rounded-none overflow-auto p-6">
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="text-3xl font-bold mb-4 mt-6" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xl font-bold mb-2 mt-4" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="mb-3 leading-7" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className="list-disc list-inside mb-3" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal list-inside mb-3" {...props} />
            ),
            code: ({ node, inline, ...props }) =>
              inline ? (
                <code
                  className="bg-gray-100 px-2 py-1 rounded text-sm font-mono"
                  {...props}
                />
              ) : (
                <code className="block bg-gray-100 p-4 rounded mb-3 overflow-auto text-sm" {...props} />
              ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 mb-3 italic text-gray-600" {...props} />
            ),
            a: ({ node, ...props }) => (
              <a className="text-blue-500 hover:underline" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Editor.tsx components/Preview.tsx
git commit -m "refactor: wrap Editor and Preview with shadcn-ui Card"
```

---

### Task 5: 改进 ShareModal 组件（使用 Dialog）

**Files:**
- Modify: `components/ShareModal.tsx`

- [ ] **Step 1: 重写 ShareModal 使用 Dialog**

```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';

interface ShareModalProps {
  path: string;
  type: 'article' | 'folder';
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({
  path,
  type,
  isOpen,
  onClose,
}: ShareModalProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type }),
      });

      const json = await res.json();
      if (json.ok) {
        setShareToken(json.data.token);
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareToken) {
      const url = `${window.location.origin}/share/${shareToken}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            分享{type === 'article' ? '文章' : '文件夹'}
          </DialogTitle>
          <DialogDescription>
            生成一个永久的分享链接，允许其他人查看内容
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareToken ? (
            <Button
              onClick={generateShareLink}
              disabled={loading}
              className="w-full"
            >
              {loading ? '生成中...' : '生成分享链接'}
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">分享链接</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/share/${shareToken}`}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShareToken(null)}
                className="w-full"
              >
                生成新链接
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ShareModal.tsx
git commit -m "refactor: redesign ShareModal with shadcn-ui Dialog"
```

---

### Task 6: 改进编辑页面（新布局 + Tabs）

**Files:**
- Modify: `app/editor/page.tsx`

- [ ] **Step 1: 重写编辑页面**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { TreeMenu } from '@/components/TreeMenu';
import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { ShareModal } from '@/components/ShareModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Edit, Eye, Trash2, Share2, Save } from 'lucide-react';

interface ArticleData {
  path: string;
  content: string;
}

export default function EditorPage() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentType, setCurrentType] = useState<'article' | 'folder'>('article');
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const loadArticle = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`);
      const json = await res.json();
      if (json.ok) {
        setArticleData(json.data);
        setContent(json.data.content);
        setSaved(true);
      }
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      setCurrentPath(path);
      setCurrentType('article');
      loadArticle(path);
    }
  };

  const handleSave = async () => {
    if (!currentPath) return;

    try {
      const res = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          content,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSaved(true);
        alert('保存成功');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败');
    }
  };

  const handleDelete = async () => {
    if (!currentPath || !confirm('确定要删除吗？')) return;

    try {
      const res = await fetch(
        `/api/articles/${encodeURIComponent(currentPath)}`,
        { method: 'DELETE' }
      );

      const json = await res.json();
      if (json.ok) {
        setCurrentPath('');
        setContent('');
        setArticleData(null);
        alert('删除成功');
        location.reload();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('删除失败');
    }
  };

  const handleCreateArticle = async (folderPath: string) => {
    const name = prompt('输入新文章名称:');
    if (name) {
      const articlePath = folderPath ? `${folderPath}/${name}` : name;

      try {
        const res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: articlePath,
            content: '# ' + name,
          }),
        });

        const json = await res.json();
        if (json.ok) {
          setCurrentPath(articlePath);
          setCurrentType('article');
          setContent('# ' + name);
          setSaved(true);
          location.reload();
        }
      } catch (error) {
        console.error('Failed to create article:', error);
      }
    }
  };

  const handleCreateFolder = async (parentPath: string) => {
    const name = prompt('输入新文件夹名称:');
    if (name) {
      const folderPath = parentPath ? `${parentPath}/${name}` : name;

      try {
        const res = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: folderPath }),
        });

        const json = await res.json();
        if (json.ok) {
          alert('创建成功');
          location.reload();
        }
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50">
        <TreeMenu
          onSelectItem={handleSelectItem}
          onCreateArticle={handleCreateArticle}
          onCreateFolder={handleCreateFolder}
          selectedPath={currentPath}
        />

        <div className="flex-1 flex flex-col">
          {/* 顶部工具栏 */}
          <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {currentPath || '未选择文章'}
              </p>
            </div>
            {!saved && (
              <span className="text-xs text-red-500 font-medium">未保存</span>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!currentPath || saved}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                保存
              </Button>
              <Button
                onClick={() => setShareModalOpen(true)}
                disabled={!currentPath}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                分享
              </Button>
              <Button
                onClick={handleDelete}
                disabled={!currentPath}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            </div>
          </div>

          {/* 编辑/预览标签 */}
          {currentPath ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="edit" className="flex flex-col h-full">
                <TabsList className="w-full rounded-none border-b bg-white">
                  <TabsTrigger value="edit" className="gap-2">
                    <Edit className="h-4 w-4" />
                    编辑
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" />
                    预览
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="flex-1 overflow-hidden">
                  <Editor
                    content={content}
                    onChange={(newContent) => {
                      setContent(newContent);
                      setSaved(false);
                    }}
                  />
                </TabsContent>

                <TabsContent value="preview" className="flex-1 overflow-hidden">
                  <Preview content={content} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400">选择或创建一篇文章开始编辑</p>
            </div>
          )}
        </div>
      </div>

      {currentPath && (
        <ShareModal
          path={currentPath}
          type={currentType}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/editor/page.tsx
git commit -m "refactor: redesign editor page with new layout and Tabs"
```

---

### Task 7: 改进查看页面

**Files:**
- Modify: `app/view/page.tsx`

- [ ] **Step 1: 重写查看页面**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { TreeMenu } from '@/components/TreeMenu';
import { Preview } from '@/components/Preview';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { SidebarProvider } from '@/components/ui/sidebar';

interface ArticleData {
  path: string;
  content: string;
}

export default function ViewPage() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const loadArticle = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/articles?path=${encodeURIComponent(path)}`);
      const json = await res.json();
      if (json.ok) {
        setArticleData(json.data);
        setContent(json.data.content);
      }
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      setCurrentPath(path);
      loadArticle(path);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50">
        <TreeMenu
          onSelectItem={handleSelectItem}
          onCreateArticle={() => {}}
          onCreateFolder={() => {}}
          selectedPath={currentPath}
        />

        <div className="flex-1 flex flex-col">
          <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
            <p className="text-sm text-gray-600">
              {currentPath || '未选择文章'}
            </p>
            {loading && (
              <span className="text-xs text-gray-400 ml-auto">加载中...</span>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {content ? (
              <Preview content={content} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">选择一篇文章查看</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/view/page.tsx
git commit -m "refactor: redesign view page with shadcn-ui components"
```

---

### Task 8: 改进分享页面

**Files:**
- Modify: `app/share/[token]/page.tsx`

- [ ] **Step 1: 重写分享页面**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Preview } from '@/components/Preview';
import { Card } from '@/components/ui/card';
import { useParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

interface ShareData {
  type: 'article' | 'folder';
  path: string;
  content?: string;
  contents?: Array<any>;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedContent = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const json = await res.json();

        if (json.ok) {
          setShareData(json.data);
        } else {
          setError(json.error || '加载失败');
        }
      } catch (err) {
        setError('加载失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSharedContent();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-6 max-w-md">
          <div className="flex gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">没有内容</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {shareData.type === 'article' ? (
          <Card className="p-8">
            <Preview content={shareData.content || ''} />
          </Card>
        ) : (
          <Card className="p-8">
            <h1 className="text-3xl font-bold mb-6">{shareData.path}</h1>
            {shareData.contents && shareData.contents.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold mb-4">文件列表</h2>
                <ul className="space-y-2">
                  {shareData.contents.map((item: any) => (
                    <li key={item.path} className="flex items-center gap-2">
                      <span>{item.isFolder ? '📁' : '📄'}</span>
                      <span className="text-gray-700">{item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-400">该文件夹为空</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/share/[token]/page.tsx
git commit -m "refactor: redesign share page with shadcn-ui Card"
```

---

### Task 9: 更新全局样式

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 重写全局样式**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #fafafa;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
    'Helvetica Neue', sans-serif;
}

/* EasyMDE 编辑器自定义样式 */
.editor-preview-side {
  display: none;
}

.CodeMirror {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: white;
  color: #1f2937;
}

.CodeMirror-cursor {
  border-left: 1px solid #1f2937;
}

.CodeMirror-selected {
  background: #e5e7eb;
}

/* Scrollbar 美化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 响应式调整 */
@media (max-width: 768px) {
  body {
    font-size: 14px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style: update global styles for shadcn-ui and responsive design"
```

---

### Task 10: 测试所有功能

**Files:**
- Test: 整个应用

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev -- -H 0.0.0.0 &
sleep 5
echo "服务器启动完成"
```

- [ ] **Step 2: 测试编辑页面**

打开 `http://localhost:3000/editor`，验证：
- ✅ 菜单树形结构显示正确
- ✅ 工具栏按钮显示
- ✅ 编辑/预览标签可切换
- ✅ 编辑器正常工作
- ✅ 预览内容正确渲染

- [ ] **Step 3: 测试菜单交互**

- ✅ 点击文件夹展开/收缩
- ✅ 点击文章加载内容
- ✅ "新文章"和"新文件夹"按钮工作

- [ ] **Step 4: 测试编辑和保存**

编辑文章内容 → 点击"保存" → 验证保存成功提示

- [ ] **Step 5: 测试分享功能**

点击"分享" → 生成分享链接 → 复制链接 → 访问验证

- [ ] **Step 6: 测试删除功能**

删除一篇文章 → 验证菜单更新

- [ ] **Step 7: 测试查看页面**

打开 `http://localhost:3000/view` → 验证只读显示

- [ ] **Step 8: 测试分享页面**

访问分享链接 → 验证内容正确显示

- [ ] **Step 9: 验证响应式设计**

调整浏览器宽度，验证菜单适配

- [ ] **Step 10: Commit 最终版本**

```bash
git add -A
git commit -m "feat: complete shadcn-ui UI redesign with all features tested"
```

---

## 自审查

**1. Spec 覆盖：**
- ✅ 视觉提升 - Task 1-9
- ✅ 用户体验 - Task 3-8
- ✅ 响应式设计 - Task 4-8 + Task 9
- ✅ 功能完整 - Task 10

**2. 占位符扫描：** ✅ 无 TBD、TODO

**3. 类型一致性：** ✅ 所有组件 props 命名一致

---

**计划完成并保存到 `docs/superpowers/plans/2026-04-05-ui-redesign-implementation.md`**

两种执行方式可选：

**1. Inline Execution** - 在本 session 中逐个执行任务

**2. 其他选项** - 用其他方式

选哪个？
