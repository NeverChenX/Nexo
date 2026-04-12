# Nexo

<p align="center">
  <b>轻量级个人 Wiki 与知识管理系统</b><br>
  <b>Lightweight Personal Wiki & Knowledge Management System</b>
</p>

<p align="center">
  <a href="#中文介绍">中文</a> | <a href="#english-introduction">English</a>
</p>

---

<a name="中文介绍"></a>
## 中文介绍

**Nexo** 是一个基于 Next.js 构建的轻量级个人 Wiki 和知识管理系统。本地优先，数据完全由你掌控——所有文档以 Markdown 文件形式存储在本地文件系统中，无需数据库。

### 核心功能

- **块编辑器** — 基于 BlockNote 的富文本块编辑器，支持拖拽排序、斜杠命令、图片上传等
- **文档树** — 无限层级的文件夹/文章树形导航，支持拖拽排序和右键菜单操作
- **阅读模式** — 独立的纯阅读视图，Markdown 渲染，自动生成文章目录（TOC）
- **分享链接** — 为任意文章生成带 token 的分享链接，无需登录即可访问
- **图片上传** — 编辑器内直接上传图片，存储至本地 `public/uploads/`
- **AI 解释** — 选中文本后调用 AI 生成解释说明，自动追加到文章末尾
- **API 文档** — 内置 Swagger 风格的 API 文档页面
- **响应式设计** — 适配桌面和移动端

### 技术栈

| 技术 | 说明 |
|------|------|
| [Next.js 14](https://nextjs.org/) | React 全栈框架（App Router） |
| [React 18](https://react.dev/) | 用户界面库 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [BlockNote](https://www.blocknotejs.org/) | 块编辑器 |
| [Tailwind CSS](https://tailwindcss.com/) | CSS 框架 |
| [shadcn/ui](https://ui.shadcn.com/) | UI 组件库 |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Markdown 渲染 |

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/NeverChenX/Nexo.git
cd Nexo

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 即可使用。

#### 环境变量（可选）

创建 `.env.local` 文件来启用 AI 解释功能：

```
NEXT_PUBLIC_BASE_URL=http://localhost:3000
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=<your-token-here>
```

### 项目结构

```
Nexo/
├── app/
│   ├── api/
│   │   ├── articles/      # 文章 CRUD
│   │   ├── folders/       # 文件夹 CRUD
│   │   ├── share/         # 分享链接管理
│   │   ├── uploads/       # 文件上传
│   │   ├── sort-order/    # 排序
│   │   └── explain/       # AI 解释
│   ├── editor/            # 编辑器页面
│   ├── read/              # 阅读模式页面
│   ├── share/[token]/     # 分享页面
│   └── api-docs/          # API 文档页面
├── components/
│   ├── editor/            # 编辑器组件（BlockNote）
│   ├── TreeMenu.tsx       # 文档树菜单
│   ├── CreateArticleModal.tsx  # 新建文章/文件夹弹窗
│   ├── ShareModal.tsx     # 分享弹窗
│   ├── ReadTOC.tsx        # 阅读模式目录
│   └── ui/                # shadcn/ui 基础组件
├── lib/
│   ├── storage.ts         # 文件系统存储层
│   ├── markdown.ts        # Markdown 处理
│   └── share.ts           # 分享链接逻辑
├── wiki-data/             # 文档数据目录（gitignore）
└── public/uploads/        # 上传文件目录
```

### 数据存储

所有文档以 Markdown 文件形式保存在 `wiki-data/` 目录下。文件夹结构即文档的层级结构，无需数据库。分享链接信息存储在 `share-links.json` 中。

### 许可证

MIT

---

<a name="english-introduction"></a>
## English Introduction

**Nexo** is a lightweight personal wiki and knowledge management system built with Next.js. Local-first — all documents are stored as Markdown files on the local filesystem, no database required.

### Key Features

- **Block Editor** — Rich block editor powered by BlockNote with drag-and-drop, slash commands, and image upload
- **Document Tree** — Infinite-depth folder/article tree navigation with drag-to-reorder and context menus
- **Reading Mode** — Clean read-only view with Markdown rendering and auto-generated table of contents
- **Share Links** — Generate token-based share links for any article, accessible without login
- **Image Upload** — Upload images directly in the editor, stored locally in `public/uploads/`
- **AI Explain** — Select text and invoke AI to generate explanations, auto-appended to the article
- **API Docs** — Built-in Swagger-style API documentation page
- **Responsive** — Works on desktop and mobile

### Tech Stack

| Technology | Description |
|------------|-------------|
| [Next.js 14](https://nextjs.org/) | React full-stack framework (App Router) |
| [React 18](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [BlockNote](https://www.blocknotejs.org/) | Block editor |
| [Tailwind CSS](https://tailwindcss.com/) | CSS framework |
| [shadcn/ui](https://ui.shadcn.com/) | UI components |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Markdown rendering |

### Quick Start

```bash
git clone https://github.com/NeverChenX/Nexo.git
cd Nexo
npm install
npm run dev
```

Visit `http://localhost:3000` to get started.

#### Environment Variables (Optional)

Create `.env.local` to enable the AI explain feature:

```
NEXT_PUBLIC_BASE_URL=http://localhost:3000
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=<your-token-here>
```

### Data Storage

All documents are stored as Markdown files under `wiki-data/`. The folder structure mirrors the document hierarchy — no database needed. Share link metadata is stored in `share-links.json`.

### License

MIT

---

<p align="center">
  Made with ❤ by <a href="https://github.com/NeverChenX">NeverChenX</a>
</p>
