# Nexo

<p align="center">
  <b>本地优先的个人 Wiki 与知识管理系统</b><br>
  <b>Local-first Personal Wiki & Knowledge Management System</b>
</p>

<p align="center">
  <a href="#中文介绍">中文</a> | <a href="#english-introduction">English</a>
</p>

---

<a name="中文介绍"></a>
## 中文介绍

**Nexo** 是一个基于 Next.js 14 的本地优先个人 Wiki 系统。所有文档以普通 Markdown 文件存储在本地文件系统中，无数据库，无云依赖；数据完全归你。

### 核心功能

**编辑**
- **块编辑器** — 基于 BlockNote 的富文本块编辑器，斜杠命令、拖拽排序、文字颜色与高亮、备注块、文档图标与封面
- **pageLink 卡片** — 目录 `_index.md` 里指向同目录 `.md` 文件的 markdown 链接自动渲染为 Notion 风格卡片，子页保持有序、可点击
- **属性面板** — 给每篇文档加自定义元数据（写入 frontmatter）
- **图片上传** — 拖入编辑器即可，存到 `public/uploads/`

**导航与组织**
- **文档树** — 无限层级、拖拽排序、右键菜单、收藏、最近访问
- **面包屑** — 路径每一段可下拉切换兄弟节点
- **全文搜索** — `Cmd/Ctrl+K` 召唤
- **知识图谱** — 文档关系可视化（双链 + 父子层级）
- **反向链接** — 自动追踪 `[[wikilink]]` 与 markdown 链接的引用
- **双链智能建议** — 编辑时按关键词匹配推荐相关文档

**AI 辅助**（火山方舟 / Volcano Ark / Doubao）
- **AI 写作** — 选中段落让 AI 改写、续写、扩展
- **AI 问答** — 基于整篇文档对 AI 提问
- **AI 解释** — 选中术语 / 名词，AI 生成解释自动追加到文末
- **AI 分类** — 给新文档推荐归属位置
- **AI 自定义 prompt** — 自由提问任意 prompt

**协作与分享**
- **分享链接** — 基于 token 的公开只读链接，免登录访问
- **权限标记** — private / shared / readonly
- **评论** — 文档级评论

**输入与采集**
- **快速采集** — `Cmd/Ctrl+Shift+N` 召唤；以 `📥 Inbox/快速笔记/YYYY-MM-DD.md` 落盘
- **Bookmarklet 剪藏** — 浏览器书签栏一键存网页选区/链接到 Inbox
- **批量导入** — 上传任意 `.md` 文件直接进入树

**导出**
- **Markdown / HTML** — 原文下载
- **PDF（所见即所得）** — `/editor/<id>?print=1` 隐藏全部 chrome 后用浏览器原生打印对话框另存为 PDF，BlockNote 渲染什么样、PDF 就什么样

**历史与回收**
- **版本快照** — 编辑自动产生时间线快照可回滚
- **回收站** — 软删除，可恢复

**杂项**
- **自动报告** — 一键生成日/周/月报告
- **国际化** — 中文 / English
- **API 文档** — `/api-docs` 内置交互式 API 列表 + curl 示例 + 一键复制

### 技术栈

| 技术 | 用途 |
|------|------|
| [Next.js 14](https://nextjs.org/) | React 全栈框架（App Router） |
| [React 18](https://react.dev/) | UI |
| [TypeScript](https://www.typescriptlang.org/) | 类型 |
| [BlockNote](https://www.blocknotejs.org/) | 块编辑器 |
| [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm | 分享视图的 Markdown 渲染 |
| [Tailwind CSS](https://tailwindcss.com/) | 样式 |
| [shadcn/ui](https://ui.shadcn.com/) | 基础组件 |
| [lucide-react](https://lucide.dev/) | 图标 |
| [Playwright](https://playwright.dev/) | E2E 测试 |
| [Vitest](https://vitest.dev/) | 单元测试 |

### 快速开始

```bash
git clone https://github.com/NeverChenX/Nexo.git
cd Nexo
npm install
npm run dev
```

打开 `http://localhost:3000` 即可。

#### 环境变量（可选）

复制 `.env.example` 为 `.env.local` 并按需修改：

```bash
# 站点公开 URL（生成分享链接、剪藏 bookmarklet 用）
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 火山方舟（启用所有 AI 功能：写作 / 问答 / 解释 / 分类）
ARK_API_KEY=<your-volcano-ark-api-key>
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=doubao-seed-1-6-flash-250828

# 外部 API Bearer 鉴权（bookmarklet 剪藏走 /api/inbox 时用）
WIKI_API_KEY=<long-random-hex>
```

未配置 ARK 时，AI 入口会提示「请先到 设置 → AI 模型 中填入 API Key」，不影响其他功能。

#### 构建并启动生产服务

```bash
npm run build       # 产出 .next
npm run start       # 默认端口 3000
# 一键脚本（next build + systemctl 重启）
npm run restart
```

### 项目结构

```
Nexo/
├── app/
│   ├── api/                    # 后端 API（25+）
│   │   ├── articles[/:id]      # 文章 CRUD
│   │   ├── folders[/:id]       # 文件夹 CRUD
│   │   ├── sort-order          # 拖拽排序持久化
│   │   ├── tags                # 标签
│   │   ├── search              # 全文搜索
│   │   ├── backlinks | related | graph    # 双链 / 推荐 / 图谱
│   │   ├── ai-ask | ai-write | ai-classify | ai-custom | explain  # AI
│   │   ├── share[/:token]      # 分享链接
│   │   ├── comments            # 评论
│   │   ├── history             # 版本历史
│   │   ├── trash | trash-move  # 回收站
│   │   ├── inbox               # 快速采集 / bookmarklet 剪藏入口
│   │   ├── reports             # 自动报告
│   │   ├── uploads             # 文件上传
│   │   ├── home-stats          # 首页统计
│   │   ├── settings/llm        # LLM 配置 + 连通性测试
│   │   └── v1/pages            # 公开 API（外部集成用）
│   ├── editor/[[...ids]]/      # 编辑器（主界面）
│   ├── share/[token]/          # 分享只读视图
│   ├── api-docs/               # 交互式 API 文档
│   └── [...slug]/              # 旧路径兼容 + 已下线功能 404 守护
├── components/
│   ├── editor/                 # BlockNote 编辑器组件群
│   ├── TreeMenu                # 文档树
│   ├── HomePage                # 首页
│   ├── BacklinksPanel · CommentsPanel · GraphView · SearchPanel · HistoryPanel · TrashPanel
│   ├── SmartLinkSuggestions    # 双链智能建议
│   ├── AiAskPanel · AiWritePanel · AiCustomAskPanel · AiClassifyHint  # AI
│   ├── QuickCaptureModal       # 快速采集
│   ├── ExportMenu              # 导出菜单
│   ├── ShareModal              # 分享弹窗
│   ├── DocumentPropertiesPanel # 文档属性
│   ├── PageIconCover           # 文档图标/封面
│   └── ui/                     # 基础 UI 组件（shadcn/ui）
├── lib/
│   ├── storage.ts              # 文件系统存储层
│   ├── article-id.ts           # 文章 ID 系统（路径 ↔ base36 ID 双向映射）
│   ├── wiki-cache.ts           # 内存缓存
│   ├── frontmatter.ts          # YAML frontmatter 解析
│   ├── share.ts                # 分享链接逻辑
│   ├── llm/                    # AI 客户端
│   └── locales/                # i18n（zh / en）
├── wiki-data/                  # 文档数据（gitignore）
│   ├── .id-registry.json       # 路径 ↔ ID 双向映射
│   ├── .order.json             # 拖拽排序记录
│   └── 你的文章和文件夹/
└── public/uploads/             # 用户上传的图片 / 附件
```

### 数据存储

- 文档 = 普通 `.md` 文件，按文件夹组织
- 拖拽排序 → `wiki-data/.order.json`
- 文档稳定 ID（避免重命名后链接失效）→ `wiki-data/.id-registry.json`
- 分享链接 → `share-links.json`
- 不依赖任何数据库

### 许可证

MIT

---

<a name="english-introduction"></a>
## English Introduction

**Nexo** is a local-first personal wiki built on Next.js 14. All documents are stored as plain Markdown files on the local filesystem — no database, no cloud, your data stays with you.

### Features

**Editing**
- **Block editor** — Rich block editor powered by BlockNote: slash commands, drag-to-reorder, inline colors and highlights, note blocks, page icons and covers
- **pageLink cards** — Markdown links to sibling `.md` files in a folder's `_index.md` are auto-rendered as Notion-style cards; child pages stay ordered and clickable
- **Property panel** — Per-document custom metadata (persisted to YAML frontmatter)
- **Image upload** — Drop images straight into the editor; stored under `public/uploads/`

**Navigation & organization**
- **Document tree** — Infinite-depth folders, drag-to-reorder, context menus, favorites, recent
- **Breadcrumbs** — Each segment is a dropdown switcher across siblings
- **Full-text search** — `Cmd/Ctrl+K`
- **Knowledge graph** — Visualize document relations (wiki-links + folder hierarchy)
- **Backlinks** — Auto-track `[[wikilink]]` and markdown link references
- **Smart link suggestions** — Keyword-matched related docs surfaced while editing

**AI** (via Volcano Ark / Doubao)
- **AI write** — Rewrite, continue, or expand a selection
- **AI ask** — Ask the AI questions about the whole document
- **AI explain** — Select a term, AI generates an explanation appended at the document end
- **AI classify** — Suggest the right folder for a new note
- **AI custom prompt** — Freeform prompt for arbitrary queries

**Collaboration & sharing**
- **Share links** — Token-based, login-free read-only links
- **Permission badges** — private / shared / readonly
- **Comments** — Per-document discussion

**Capture & input**
- **Quick capture** — `Cmd/Ctrl+Shift+N` opens a quick note that lands in `📥 Inbox/快速笔记/YYYY-MM-DD.md`
- **Web clipper bookmarklet** — One-tap save of any selection / URL to Inbox
- **Batch import** — Upload arbitrary `.md` files into the tree

**Export**
- **Markdown / HTML** — Raw content download
- **PDF (WYSIWYG)** — `/editor/<id>?print=1` hides all chrome and triggers the browser's native print dialog (save as PDF). What you see in BlockNote is exactly what the PDF looks like.

**History & recovery**
- **Version snapshots** — Automatic editing timeline, with rollback
- **Trash** — Soft delete with restore

**Misc**
- **Auto reports** — One-click daily / weekly / monthly report generation
- **i18n** — Chinese / English
- **API docs** — Interactive `/api-docs` with curl examples and one-click copy

### Tech stack

| Tech | Purpose |
|------|---------|
| [Next.js 14](https://nextjs.org/) | Full-stack React framework (App Router) |
| [React 18](https://react.dev/) | UI |
| [TypeScript](https://www.typescriptlang.org/) | Types |
| [BlockNote](https://www.blocknotejs.org/) | Block editor |
| [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm | Markdown rendering in share view |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [shadcn/ui](https://ui.shadcn.com/) | Primitives |
| [lucide-react](https://lucide.dev/) | Icons |
| [Playwright](https://playwright.dev/) | E2E tests |
| [Vitest](https://vitest.dev/) | Unit tests |

### Quick start

```bash
git clone https://github.com/NeverChenX/Nexo.git
cd Nexo
npm install
npm run dev
```

Then open `http://localhost:3000`.

#### Environment variables (optional)

Copy `.env.example` to `.env.local` and edit:

```bash
# Public origin (used for share links, clip bookmarklet, etc.)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Volcano Ark — powers all AI features (write / ask / explain / classify)
ARK_API_KEY=<your-volcano-ark-api-key>
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=doubao-seed-1-6-flash-250828

# Bearer token for external API (used by the clip bookmarklet → /api/inbox)
WIKI_API_KEY=<long-random-hex>
```

Without `ARK_*`, AI entries gracefully show "configure API key in Settings → AI Model". Everything else works.

#### Production build & start

```bash
npm run build
npm run start       # default port 3000
# One-shot helper (next build + systemctl restart)
npm run restart
```

### Project structure

```
Nexo/
├── app/
│   ├── api/                    # 25+ backend routes
│   │   ├── articles[/:id]      # Article CRUD
│   │   ├── folders[/:id]       # Folder CRUD
│   │   ├── sort-order          # Drag-order persistence
│   │   ├── tags                # Tags
│   │   ├── search              # Full-text search
│   │   ├── backlinks | related | graph    # Wikilinks / related / graph
│   │   ├── ai-ask | ai-write | ai-classify | ai-custom | explain  # AI
│   │   ├── share[/:token]      # Share links
│   │   ├── comments            # Comments
│   │   ├── history             # Version history
│   │   ├── trash | trash-move  # Trash bin
│   │   ├── inbox               # Quick capture / clip bookmarklet
│   │   ├── reports             # Auto reports
│   │   ├── uploads             # File uploads
│   │   ├── home-stats          # Home stats
│   │   ├── settings/llm        # LLM config + reachability test
│   │   └── v1/pages            # Public API (for external integration)
│   ├── editor/[[...ids]]/      # Editor (main UI)
│   ├── share/[token]/          # Public share view
│   ├── api-docs/               # Interactive API docs
│   └── [...slug]/              # Legacy path compat + retired-feature 404 guard
├── components/
│   ├── editor/                 # BlockNote editor surface
│   ├── TreeMenu                # Document tree
│   ├── HomePage                # Landing
│   ├── BacklinksPanel · CommentsPanel · GraphView · SearchPanel · HistoryPanel · TrashPanel
│   ├── SmartLinkSuggestions    # Smart wiki-link suggestions
│   ├── AiAskPanel · AiWritePanel · AiCustomAskPanel · AiClassifyHint  # AI
│   ├── QuickCaptureModal       # Quick capture
│   ├── ExportMenu              # Export dropdown
│   ├── ShareModal              # Share modal
│   ├── DocumentPropertiesPanel # Document properties
│   ├── PageIconCover           # Page icon / cover
│   └── ui/                     # shadcn primitives
├── lib/
│   ├── storage.ts              # Filesystem storage layer
│   ├── article-id.ts           # Stable IDs (path ↔ base36 bi-map)
│   ├── wiki-cache.ts           # In-memory cache
│   ├── frontmatter.ts          # YAML frontmatter
│   ├── share.ts                # Share link logic
│   ├── llm/                    # AI client
│   └── locales/                # i18n (zh / en)
├── wiki-data/                  # Documents (gitignored)
│   ├── .id-registry.json       # path ↔ ID bi-map
│   ├── .order.json             # Drag-order records
│   └── <your docs and folders>
└── public/uploads/             # User-uploaded images / attachments
```

### Data model

- A document is a plain `.md` file; folders are folders
- Drag order → `wiki-data/.order.json`
- Stable per-document IDs (so renames don't break links) → `wiki-data/.id-registry.json`
- Share links → `share-links.json`
- No database, ever

### License

MIT

---

<p align="center">
  Made with ❤ by <a href="https://github.com/NeverChenX">NeverChenX</a>
</p>
