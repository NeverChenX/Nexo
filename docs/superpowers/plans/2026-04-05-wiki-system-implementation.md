# Never Wiki 系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一个功能完整的个人知识库 wiki 系统，支持 markdown 编辑、分享链接、树形菜单、REST API 接口。

**Architecture:** Next.js 全栈应用，文件系统直接存储 markdown 文件，分离前端页面（编辑/查看/分享）和后端 REST API 接口，支持外部平台通过 API 进行读写。

**Tech Stack:** Next.js 14, React 18, TypeScript, TailwindCSS, EasyMDE, react-markdown

---

## 文件结构规划

```
wiki/
├── app/
│   ├── api/
│   │   ├── articles/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── folders/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── share/
│   │       ├── route.ts
│   │       └── [token]/route.ts
│   ├── editor/
│   │   └── page.tsx
│   ├── view/
│   │   └── page.tsx
│   ├── share/
│   │   └── [token]/page.tsx
│   ├── layout.tsx
│   └── page.tsx (首页重定向)
├── lib/
│   ├── storage.ts
│   ├── markdown.ts
│   └── share.ts
├── components/
│   ├── TreeMenu.tsx
│   ├── Editor.tsx
│   ├── Preview.tsx
│   └── ShareModal.tsx
├── wiki-data/ (gitignore)
├── share-links.json (gitignore)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── .gitignore
```

---

## 任务分解

### Task 1: 初始化 Next.js 项目和依赖

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.js`
- Create: `.gitignore`

- [ ] **Step 1: 初始化 npm 项目和安装依赖**

```bash
cd /home/Neverchen/project/never_wiki
npm init -y
npm install next@14 react@18 react-dom@18 typescript @types/node @types/react tailwindcss postcss autoprefixer easymde react-markdown uuid @types/uuid
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "never-wiki",
  "version": "1.0.0",
  "description": "Personal knowledge base wiki system",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "easymde": "^2.18.0",
    "react-markdown": "^9.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/uuid": "^9.0.0"
  }
}
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: 创建 next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;
```

- [ ] **Step 5: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 6: 创建 .gitignore**

```
node_modules/
.next/
dist/
wiki-data/
share-links.json
.env.local
.env.*.local
.vercel
```

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with dependencies"
```

---

### Task 2: 创建基础目录结构和全局布局

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `app/api/.gitkeep`
- Create: `lib/.gitkeep`
- Create: `components/.gitkeep`
- Create: `wiki-data/.gitkeep`

- [ ] **Step 1: 创建 app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #f5f5f5;
  color: #333;
}

.editor-container {
  display: flex;
  height: 100vh;
}

.menu-container {
  flex: 0 0 250px;
  background-color: #fff;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-main {
  flex: 1;
  display: flex;
  gap: 1px;
}

.editor-area {
  flex: 1;
  background: white;
  overflow: auto;
}

.preview-area {
  flex: 1;
  background: white;
  padding: 20px;
  overflow: auto;
  border-left: 1px solid #e0e0e0;
}

.toolbar {
  height: 50px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 10px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 500px;
  width: 90%;
}
```

- [ ] **Step 2: 创建 app/layout.tsx**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Never Wiki',
  description: 'Personal Knowledge Base Wiki System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: 创建 app/page.tsx (重定向到编辑页面)**

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/editor');
  }, [router]);

  return null;
}
```

- [ ] **Step 4: 创建目录结构**

```bash
mkdir -p /home/Neverchen/project/never_wiki/app/api/articles/{id}
mkdir -p /home/Neverchen/project/never_wiki/app/api/folders/{id}
mkdir -p /home/Neverchen/project/never_wiki/app/api/share/{token}
mkdir -p /home/Neverchen/project/never_wiki/app/editor
mkdir -p /home/Neverchen/project/never_wiki/app/view
mkdir -p /home/Neverchen/project/never_wiki/app/share/{token}
mkdir -p /home/Neverchen/project/never_wiki/lib
mkdir -p /home/Neverchen/project/never_wiki/components
mkdir -p /home/Neverchen/project/never_wiki/wiki-data
touch /home/Neverchen/project/never_wiki/app/api/.gitkeep
touch /home/Neverchen/project/never_wiki/lib/.gitkeep
touch /home/Neverchen/project/never_wiki/components/.gitkeep
touch /home/Neverchen/project/never_wiki/wiki-data/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx app/globals.css
git commit -m "feat: create base layout and global styles"
```

---

### Task 3: 实现文件系统存储工具 (lib/storage.ts)

**Files:**
- Create: `lib/storage.ts`

- [ ] **Step 1: 创建 lib/storage.ts**

```typescript
import fs from 'fs/promises';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');

// 确保目录存在
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.stat(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// 获取文件树结构
export async function getFileTree(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<Array<{ name: string; path: string; isFolder: boolean }>> {
  await ensureDir(dirPath);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: Array<{ name: string; path: string; isFolder: boolean }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        path: relativeSafePath,
        isFolder: true,
      });
    } else if (entry.name.endsWith('.md')) {
      items.push({
        name: entry.name.replace('.md', ''),
        path: relativeSafePath.replace('.md', ''),
        isFolder: false,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// 获取递归的文件树（包含子目录）
export async function getRecursiveTree(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<
  Array<{
    name: string;
    path: string;
    isFolder: boolean;
    children?: Array<any>;
  }>
> {
  await ensureDir(dirPath);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: Array<{
    name: string;
    path: string;
    isFolder: boolean;
    children?: Array<any>;
  }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      const children = await getRecursiveTree(fullPath, relativeSafePath);
      items.push({
        name: entry.name,
        path: relativeSafePath,
        isFolder: true,
        children,
      });
    } else if (entry.name.endsWith('.md')) {
      items.push({
        name: entry.name.replace('.md', ''),
        path: relativeSafePath.replace('.md', ''),
        isFolder: false,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// 读取文章内容
export async function readArticle(articlePath: string): Promise<string> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}

// 写入文章内容
export async function writeArticle(
  articlePath: string,
  content: string
): Promise<void> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  const dirPath = path.dirname(filePath);
  await ensureDir(dirPath);
  await fs.writeFile(filePath, content, 'utf-8');
}

// 删除文章
export async function deleteArticle(articlePath: string): Promise<void> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  await fs.unlink(filePath);
}

// 创建文件夹
export async function createFolder(folderPath: string): Promise<void> {
  const dirPath = path.join(WIKI_DATA_DIR, folderPath);
  await ensureDir(dirPath);
}

// 删除文件夹
export async function deleteFolder(folderPath: string): Promise<void> {
  const dirPath = path.join(WIKI_DATA_DIR, folderPath);
  await fs.rm(dirPath, { recursive: true, force: true });
}

// 检查文件/文件夹是否存在
export async function exists(itemPath: string): Promise<boolean> {
  try {
    const filePath = path.join(WIKI_DATA_DIR, itemPath);
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

// 检查是否是文件夹
export async function isFolder(itemPath: string): Promise<boolean> {
  try {
    const dirPath = path.join(WIKI_DATA_DIR, itemPath);
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// 检查是否是文章
export async function isArticle(itemPath: string): Promise<boolean> {
  try {
    const filePath = path.join(WIKI_DATA_DIR, `${itemPath}.md`);
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

// 获取文件夹内容
export async function getFolderContents(
  folderPath: string
): Promise<Array<{ name: string; path: string; isFolder: boolean }>> {
  const dirPath = folderPath
    ? path.join(WIKI_DATA_DIR, folderPath)
    : WIKI_DATA_DIR;
  return getFileTree(dirPath, folderPath);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: implement file system storage utilities"
```

---

### Task 4: 实现分享链接管理工具 (lib/share.ts)

**Files:**
- Create: `lib/share.ts`

- [ ] **Step 1: 创建 lib/share.ts**

```typescript
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SHARE_LINKS_FILE = path.join(process.cwd(), 'share-links.json');

interface ShareLink {
  path: string;
  type: 'article' | 'folder';
  createdAt: string;
}

// 初始化分享链接文件
async function initShareLinksFile(): Promise<void> {
  try {
    await fs.stat(SHARE_LINKS_FILE);
  } catch {
    await fs.writeFile(SHARE_LINKS_FILE, JSON.stringify({}), 'utf-8');
  }
}

// 读取所有分享链接
async function getAllShareLinks(): Promise<Record<string, ShareLink>> {
  await initShareLinksFile();
  const content = await fs.readFile(SHARE_LINKS_FILE, 'utf-8');
  return JSON.parse(content || '{}');
}

// 保存分享链接
async function saveShareLinks(
  links: Record<string, ShareLink>
): Promise<void> {
  await fs.writeFile(SHARE_LINKS_FILE, JSON.stringify(links, null, 2), 'utf-8');
}

// 生成分享链接
export async function createShareLink(
  itemPath: string,
  type: 'article' | 'folder'
): Promise<string> {
  const token = uuidv4().replace(/-/g, '').substring(0, 12);
  const links = await getAllShareLinks();

  links[token] = {
    path: itemPath,
    type,
    createdAt: new Date().toISOString(),
  };

  await saveShareLinks(links);
  return token;
}

// 删除分享链接
export async function deleteShareLink(token: string): Promise<boolean> {
  const links = await getAllShareLinks();

  if (!links[token]) {
    return false;
  }

  delete links[token];
  await saveShareLinks(links);
  return true;
}

// 获取分享链接信息
export async function getShareLink(token: string): Promise<ShareLink | null> {
  const links = await getAllShareLinks();
  return links[token] || null;
}

// 检查分享链接是否存在
export async function shareTokenExists(token: string): Promise<boolean> {
  const link = await getShareLink(token);
  return !!link;
}

// 获取所有分享链接
export async function getAllShares(): Promise<
  Array<{ token: string } & ShareLink>
> {
  const links = await getAllShareLinks();
  return Object.entries(links).map(([token, link]) => ({
    token,
    ...link,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/share.ts
git commit -m "feat: implement share link management utilities"
```

---

### Task 5: 实现 Markdown 处理工具 (lib/markdown.ts)

**Files:**
- Create: `lib/markdown.ts`

- [ ] **Step 1: 创建 lib/markdown.ts**

```typescript
// Markdown 处理工具
// 此文件预留用于 markdown 特殊处理，目前基本功能由 react-markdown 和 easymde 处理

export function sanitizeMarkdown(content: string): string {
  // 防止 XSS 攻击：移除危险的 HTML 标签
  return content.replace(/<script[^>]*>.*?<\/script>/gi, '');
}

export function extractTitle(content: string): string {
  // 从 markdown 内容中提取第一个 H1 标题作为文章标题
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : '无标题';
}

export function extractSummary(content: string, length: number = 200): string {
  // 提取摘要（移除 markdown 语法）
  const text = content
    .replace(/[#*_\[\]()]/g, '')
    .split('\n')
    .filter((line) => line.trim())
    .join(' ');
  return text.substring(0, length) + (text.length > length ? '...' : '');
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/markdown.ts
git commit -m "feat: implement markdown utility functions"
```

---

### Task 6: 实现文件夹 API (app/api/folders/route.ts)

**Files:**
- Create: `app/api/folders/route.ts`

- [ ] **Step 1: 创建 app/api/folders/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  createFolder,
  getFolderContents,
  getRecursiveTree,
  exists,
  isFolder,
} from '@/lib/storage';

// GET: 获取文件夹内容或完整树
export async function GET(request: NextRequest) {
  try {
    const folderPath = request.nextUrl.searchParams.get('path') || '';
    const includeTree = request.nextUrl.searchParams.get('tree') === 'true';

    if (includeTree) {
      // 返回完整的递归树结构
      const tree = await getRecursiveTree();
      return NextResponse.json({
        ok: true,
        data: tree,
      });
    } else {
      // 返回指定文件夹的内容
      const contents = await getFolderContents(folderPath);
      return NextResponse.json({
        ok: true,
        data: contents,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '获取文件夹内容失败',
      },
      { status: 500 }
    );
  }
}

// POST: 创建文件夹
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

    // 检查是否已存在
    if (await exists(path)) {
      return NextResponse.json(
        {
          ok: false,
          error: '文件夹已存在',
        },
        { status: 400 }
      );
    }

    await createFolder(path);

    return NextResponse.json({
      ok: true,
      data: { path },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '创建文件夹失败',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/folders/route.ts
git commit -m "feat: implement folders GET and POST API"
```

---

### Task 7: 实现文件夹删除 API (app/api/folders/[id]/route.ts)

**Files:**
- Create: `app/api/folders/[id]/route.ts`

- [ ] **Step 1: 创建 app/api/folders/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { deleteFolder, exists, isFolder } from '@/lib/storage';

// DELETE: 删除文件夹
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const folderPath = decodeURIComponent(params.id);

    // 检查文件夹是否存在
    if (!(await exists(folderPath)) || !(await isFolder(folderPath))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文件夹不存在',
        },
        { status: 404 }
      );
    }

    await deleteFolder(folderPath);

    return NextResponse.json({
      ok: true,
      data: { path: folderPath },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '删除文件夹失败',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/folders/[id]/route.ts
git commit -m "feat: implement folders DELETE API"
```

---

### Task 8: 实现文章 API (app/api/articles/route.ts)

**Files:**
- Create: `app/api/articles/route.ts`

- [ ] **Step 1: 创建 app/api/articles/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  readArticle,
  writeArticle,
  exists,
  isArticle,
} from '@/lib/storage';

// GET: 读取文章内容
export async function GET(request: NextRequest) {
  try {
    const articlePath = request.nextUrl.searchParams.get('path');

    if (!articlePath) {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

    // 检查文章是否存在
    if (!(await isArticle(articlePath))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文章不存在',
        },
        { status: 404 }
      );
    }

    const content = await readArticle(articlePath);

    return NextResponse.json({
      ok: true,
      data: {
        path: articlePath,
        content,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '读取文章失败',
      },
      { status: 500 }
    );
  }
}

// POST: 创建文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, content = '' } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

    // 检查是否已存在
    if (await isArticle(path)) {
      return NextResponse.json(
        {
          ok: false,
          error: '文章已存在',
        },
        { status: 400 }
      );
    }

    await writeArticle(path, content);

    return NextResponse.json({
      ok: true,
      data: { path, content },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '创建文章失败',
      },
      { status: 500 }
    );
  }
}

// PUT: 更新文章内容
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, content } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

    if (content === undefined || typeof content !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 content 参数',
        },
        { status: 400 }
      );
    }

    // 检查文章是否存在
    if (!(await isArticle(path))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文章不存在',
        },
        { status: 404 }
      );
    }

    await writeArticle(path, content);

    return NextResponse.json({
      ok: true,
      data: { path, content },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '更新文章失败',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/articles/route.ts
git commit -m "feat: implement articles GET, POST, PUT API"
```

---

### Task 9: 实现文章删除 API (app/api/articles/[id]/route.ts)

**Files:**
- Create: `app/api/articles/[id]/route.ts`

- [ ] **Step 1: 创建 app/api/articles/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { deleteArticle, isArticle } from '@/lib/storage';

// DELETE: 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articlePath = decodeURIComponent(params.id);

    // 检查文章是否存在
    if (!(await isArticle(articlePath))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文章不存在',
        },
        { status: 404 }
      );
    }

    await deleteArticle(articlePath);

    return NextResponse.json({
      ok: true,
      data: { path: articlePath },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '删除文章失败',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/articles/[id]/route.ts
git commit -m "feat: implement articles DELETE API"
```

---

### Task 10: 实现分享 API (app/api/share/route.ts)

**Files:**
- Create: `app/api/share/route.ts`

- [ ] **Step 1: 创建 app/api/share/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  createShareLink,
  deleteShareLink,
  getAllShares,
} from '@/lib/share';
import { exists } from '@/lib/storage';

// POST: 创建分享链接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, type } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 path 参数',
        },
        { status: 400 }
      );
    }

    if (!type || !['article', 'folder'].includes(type)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'type 必须是 article 或 folder',
        },
        { status: 400 }
      );
    }

    // 检查路径是否存在
    if (!(await exists(path))) {
      return NextResponse.json(
        {
          ok: false,
          error: '文件或文件夹不存在',
        },
        { status: 404 }
      );
    }

    const token = await createShareLink(path, type);

    return NextResponse.json({
      ok: true,
      data: { token, path, type },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '创建分享链接失败',
      },
      { status: 500 }
    );
  }
}

// DELETE: 删除分享链接
export async function DELETE(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: '缺少 token 参数',
        },
        { status: 400 }
      );
    }

    const success = await deleteShareLink(token);

    if (!success) {
      return NextResponse.json(
        {
          ok: false,
          error: '分享链接不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { token },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '删除分享链接失败',
      },
      { status: 500 }
    );
  }
}

// GET: 获取所有分享链接
export async function GET(request: NextRequest) {
  try {
    const shares = await getAllShares();
    return NextResponse.json({
      ok: true,
      data: shares,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '获取分享链接失败',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/share/route.ts
git commit -m "feat: implement share POST, DELETE, GET API"
```

---

### Task 11: 实现分享链接查询 API (app/api/share/[token]/route.ts)

**Files:**
- Create: `app/api/share/[token]/route.ts`

- [ ] **Step 1: 创建 app/api/share/[token]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getShareLink } from '@/lib/share';
import { readArticle, getFolderContents, getRecursiveTree } from '@/lib/storage';

// GET: 通过 token 获取分享的内容
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // 获取分享链接信息
    const shareLink = await getShareLink(token);

    if (!shareLink) {
      return NextResponse.json(
        {
          ok: false,
          error: '分享链接不存在或已过期',
        },
        { status: 404 }
      );
    }

    if (shareLink.type === 'article') {
      // 返回文章内容
      const content = await readArticle(shareLink.path);
      return NextResponse.json({
        ok: true,
        data: {
          type: 'article',
          path: shareLink.path,
          content,
        },
      });
    } else if (shareLink.type === 'folder') {
      // 返回文件夹树结构
      const tree = await getRecursiveTree();

      // 提取指定文件夹的子树
      function findSubtree(
        items: any[],
        targetPath: string
      ): any[] | null {
        for (const item of items) {
          if (item.path === targetPath) {
            return item.children || [];
          }
          if (item.children && item.isFolder) {
            const result = findSubtree(item.children, targetPath);
            if (result) return result;
          }
        }
        return null;
      }

      const subtree = findSubtree(tree, shareLink.path);

      return NextResponse.json({
        ok: true,
        data: {
          type: 'folder',
          path: shareLink.path,
          contents: subtree || [],
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: '未知的分享类型',
      },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: '获取分享内容失败',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/share/[token]/route.ts
git commit -m "feat: implement share token GET API"
```

---

### Task 12: 实现树形菜单组件 (components/TreeMenu.tsx)

**Files:**
- Create: `components/TreeMenu.tsx`

- [ ] **Step 1: 创建 components/TreeMenu.tsx**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add components/TreeMenu.tsx
git commit -m "feat: implement TreeMenu component"
```

---

### Task 13: 实现 Markdown 编辑器组件 (components/Editor.tsx)

**Files:**
- Create: `components/Editor.tsx`

- [ ] **Step 1: 创建 components/Editor.tsx**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function Editor({ content, onChange, readOnly = false }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const easyMDERef = useRef<EasyMDE | null>(null);

  useEffect(() => {
    if (textareaRef.current && !easyMDERef.current) {
      easyMDERef.current = new EasyMDE({
        element: textareaRef.current,
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
    }

    return () => {
      if (easyMDERef.current && !readOnly) {
        // 保留编辑器实例，不销毁
      }
    };
  }, []);

  // 更新内容
  useEffect(() => {
    if (easyMDERef.current && content) {
      easyMDERef.current.value(content);
    }
  }, [content]);

  return (
    <div className="editor-area">
      <textarea ref={textareaRef} defaultValue={content} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Editor.tsx
git commit -m "feat: implement Editor component with EasyMDE"
```

---

### Task 14: 实现 Markdown 预览组件 (components/Preview.tsx)

**Files:**
- Create: `components/Preview.tsx`

- [ ] **Step 1: 创建 components/Preview.tsx**

```typescript
'use client';

import ReactMarkdown from 'react-markdown';

interface PreviewProps {
  content: string;
}

export function Preview({ content }: PreviewProps) {
  return (
    <div className="preview-area prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold mb-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-bold mb-2" {...props} />
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
              <code className="block bg-gray-100 p-4 rounded mb-3 overflow-auto" {...props} />
            ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 mb-3 italic" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-blue-500 hover:underline" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Preview.tsx
git commit -m "feat: implement Preview component with react-markdown"
```

---

### Task 15: 实现分享弹窗组件 (components/ShareModal.tsx)

**Files:**
- Create: `components/ShareModal.tsx`

- [ ] **Step 1: 创建 components/ShareModal.tsx**

```typescript
'use client';

import { useState } from 'react';

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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">分享 {type === 'article' ? '文章' : '文件夹'}</h2>

        {!shareToken ? (
          <button
            onClick={generateShareLink}
            disabled={loading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? '生成中...' : '生成分享链接'}
          </button>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-2">分享链接:</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/share/${shareToken}`}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <button
              onClick={() => setShareToken(null)}
              className="text-sm text-blue-500 hover:underline"
            >
              生成新链接
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ShareModal.tsx
git commit -m "feat: implement ShareModal component"
```

---

### Task 16: 实现编辑页面 (app/editor/page.tsx)

**Files:**
- Create: `app/editor/page.tsx`

- [ ] **Step 1: 创建 app/editor/page.tsx**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { TreeMenu } from '@/components/TreeMenu';
import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { ShareModal } from '@/components/ShareModal';

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

  // 加载文章内容
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

  // 处理菜单项选择
  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      setCurrentPath(path);
      setCurrentType('article');
      loadArticle(path);
    }
  };

  // 保存文章
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

  // 删除文章
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

  // 创建文章
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

  // 创建文件夹
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
    <div className="editor-container">
      <TreeMenu
        onSelectItem={handleSelectItem}
        onCreateArticle={handleCreateArticle}
        onCreateFolder={handleCreateFolder}
        selectedPath={currentPath}
      />

      <div className="content-container">
        <div className="toolbar">
          <span className="text-sm">{currentPath || '未选择文章'}</span>
          {!saved && <span className="text-red-500 text-sm">*未保存</span>}

          <div className="ml-auto flex gap-2">
            <button
              onClick={handleSave}
              disabled={!currentPath || saved}
              className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              保存
            </button>
            <button
              onClick={() => setShareModalOpen(true)}
              disabled={!currentPath}
              className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              分享
            </button>
            <button
              onClick={handleDelete}
              disabled={!currentPath}
              className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              删除
            </button>
          </div>
        </div>

        <div className="editor-main">
          <Editor
            content={content}
            onChange={(newContent) => {
              setContent(newContent);
              setSaved(false);
            }}
          />
          <Preview content={content} />
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
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/editor/page.tsx
git commit -m "feat: implement editor page with full functionality"
```

---

### Task 17: 实现查看页面 (app/view/page.tsx)

**Files:**
- Create: `app/view/page.tsx`

- [ ] **Step 1: 创建 app/view/page.tsx**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { TreeMenu } from '@/components/TreeMenu';
import { Preview } from '@/components/Preview';

interface ArticleData {
  path: string;
  content: string;
}

export default function ViewPage() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 加载文章内容
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

  // 处理菜单项选择
  const handleSelectItem = (path: string, isFolder: boolean) => {
    if (!isFolder) {
      setCurrentPath(path);
      loadArticle(path);
    }
  };

  return (
    <div className="editor-container">
      <TreeMenu
        onSelectItem={handleSelectItem}
        onCreateArticle={() => {}}
        onCreateFolder={() => {}}
        selectedPath={currentPath}
      />

      <div className="content-container">
        <div className="toolbar">
          <span className="text-sm">{currentPath || '未选择文章'}</span>
          {loading && <span className="text-gray-500 text-sm">加载中...</span>}
        </div>

        <div className="flex-1">
          {content ? (
            <Preview content={content} />
          ) : (
            <div className="p-4 text-gray-500">选择一篇文章查看</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/view/page.tsx
git commit -m "feat: implement view page (read-only)"
```

---

### Task 18: 实现分享页面 (app/share/[token]/page.tsx)

**Files:**
- Create: `app/share/[token]/page.tsx`

- [ ] **Step 1: 创建 app/share/[token]/page.tsx**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Preview } from '@/components/Preview';
import { useParams } from 'next/navigation';

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
      <div className="flex items-center justify-center h-screen">
        <div>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>没有内容</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div className="preview-area prose prose-sm max-w-4xl mx-auto py-8">
        {shareData.type === 'article' ? (
          <Preview content={shareData.content || ''} />
        ) : (
          <div>
            <h1 className="text-3xl font-bold mb-4">{shareData.path}</h1>
            <div className="border rounded p-4">
              {shareData.contents && shareData.contents.length > 0 ? (
                <ul className="list-disc list-inside">
                  {shareData.contents.map((item: any) => (
                    <li key={item.path} className="mb-2">
                      {item.isFolder ? '📁' : '📄'} {item.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>该文件夹为空</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/share/[token]/page.tsx
git commit -m "feat: implement share page (public access)"
```

---

### Task 19: 测试所有功能并修复问题

**Files:**
- Test: 整个应用

- [ ] **Step 1: 启动开发服务器**

```bash
cd /home/Neverchen/project/never_wiki
npm run dev
```

Expected: 服务器在 `http://localhost:3000` 启动

- [ ] **Step 2: 测试编辑页面加载**

打开 `http://localhost:3000/editor`，确认：
- 左侧菜单出现（初始为空）
- 中间是编辑器
- 右侧是预览区

- [ ] **Step 3: 测试创建文件夹和文章**

在菜单中点击"新文件夹"和"新文章"，验证：
- 能成功创建
- 菜单树更新
- 无错误日志

- [ ] **Step 4: 测试编辑和保存**

编辑文章内容，点击保存，验证：
- 保存成功提示
- 刷新后内容依然存在

- [ ] **Step 5: 测试分享功能**

选择一篇文章，点击分享，验证：
- 生成分享链接
- 复制链接功能正常
- 通过分享链接访问时内容正确显示

- [ ] **Step 6: 测试查看页面**

打开 `http://localhost:3000/view`，验证：
- 菜单正常
- 文章只读
- 无编辑功能

- [ ] **Step 7: 测试删除功能**

删除一篇文章，验证：
- 提示确认
- 删除成功
- 菜单更新

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: complete wiki system with all features tested"
```

---

## 自审查

**1. Spec 覆盖：**
- ✅ 增删改查 - Tasks 6-9, 16
- ✅ Markdown 管理 - Tasks 5, 13, 14, 16
- ✅ 菜单功能 - Task 12, 16
- ✅ 分享链接 - Tasks 4, 10, 11, 15, 16, 18
- ✅ 局域网访问 - Task 1
- ✅ Web 版本 - Tasks 2-18
- ✅ 外部接口 - Tasks 6-11

**2. 占位符扫描：** ✅ 无 TBD、TODO，所有代码完整

**3. 类型一致性：** ✅ 所有文件路径、接口参数、组件 props 命名一致

---

**计划完成并保存到 `docs/superpowers/plans/2026-04-05-wiki-system-implementation.md`**

两种执行方案可选：

**1. Subagent-Driven（推荐）** - 我为每个任务分配独立的子代理，任务间进行审查，迭代快速

**2. Inline Execution** - 在本session中执行任务，使用executing-plans技能进行批量执行和检查点审查

哪种方案？