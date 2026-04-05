# Never Wiki 系统设计文档

**日期：** 2026-04-05  
**项目：** 个人知识库 wiki 系统，支持分享和外部接口调用

---

## 需求清单

### 核心功能
1. **增删改查** - 支持文章和文件夹的完整操作
2. **Markdown 管理** - 编辑、保存、预览 markdown 文件
3. **菜单导航** - 树形结构展示所有文件夹和文章
4. **分享功能** - 生成永久分享链接（无密码），支持分享单个文章或整个文件夹
5. **局域网访问** - 整个 wiki 通过一个局域网链接访问
6. **Web 版本** - 仅提供网页版本
7. **外部接口** - 提供 REST API，支持 OpenClaw 等平台进行读、写、删除、管理分享等所有操作

### 用户模式
- 单用户系统（只有所有者编辑）
- 分享内容只读（被分享者无法编辑）

---

## 技术栈

| 组件 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 14+ (App Router) | 全栈框架，简化部署，星数最高 |
| 前端 | React 18+ | 业界标准，成熟稳定 |
| 样式 | TailwindCSS | 原子化 CSS，星数 80k+，开发快速 |
| Markdown 编辑 | EasyMDE | 轻量级富编辑器，星数 2.5k+，易集成 |
| Markdown 预览 | react-markdown | 标准 markdown 渲染库，星数 12k+ |
| 树形菜单 | 自写（简单组件） | 需求简单，不需要第三方库 |
| 编程语言 | TypeScript | 类型安全，开发体验好 |
| 数据存储 | 文件系统 | 直接存储 markdown 文件和目录结构 |

---

## 项目结构

```
wiki/
├── app/
│   ├── api/                      # REST API 接口
│   │   ├── articles/             # 文章 CRUD
│   │   │   ├── route.ts          # POST(新建), GET(查询), PUT(更新)
│   │   │   └── [id]/
│   │   │       └── route.ts      # DELETE(删除单篇文章)
│   │   ├── folders/              # 文件夹 CRUD
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   └── share/                # 分享链接管理
│   │       ├── route.ts          # POST(创建分享), DELETE(删除分享)
│   │       └── [token]/
│   │           └── route.ts      # GET(通过token获取内容)
│   ├── editor/                   # 编辑页面
│   │   └── page.tsx
│   ├── view/                     # 查看页面
│   │   └── page.tsx
│   ├── share/                    # 分享页面（公开）
│   │   └── [token]/
│   │       └── page.tsx
│   └── layout.tsx                # 全局布局
├── lib/                          # 工具函数
│   ├── storage.ts                # 文件系统操作（读写文件、创建目录）
│   ├── markdown.ts               # Markdown 处理
│   └── share.ts                  # 分享链接生成和验证逻辑
├── components/                   # React 组件
│   ├── TreeMenu.tsx              # 树形菜单
│   ├── Editor.tsx                # Markdown 编辑器
│   ├── Preview.tsx               # Markdown 预览
│   └── ShareModal.tsx            # 分享弹窗
├── wiki-data/                    # Wiki 文件存储（所有 markdown 文件）
├── share-links.json              # 分享链接记录（存储所有分享的链接和对应的文件路径）
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

---

## 数据存储方案

### 文件和文件夹物理存储
```
wiki-data/
├── folder1/
│   ├── article1.md
│   ├── article2.md
│   └── subfolder/
│       └── article3.md
└── folder2/
    └── article4.md
```

**说明：**
- 每个文件夹 = 一个目录
- 每篇文章 = 一个 `.md` 文件
- 文件夹嵌套自然形成树形结构

### 分享链接记录
```json
// share-links.json
{
  "abc123": {
    "path": "/folder1/article1.md",
    "type": "article",
    "createdAt": "2026-04-05T10:30:00Z"
  },
  "def456": {
    "path": "/folder2",
    "type": "folder",
    "createdAt": "2026-04-05T10:35:00Z"
  }
}
```

---

## 页面设计

### 1. 编辑页面 (`/editor`)
**布局：** 左侧菜单 + 中间编辑器 + 右侧预览

**左侧（树形菜单）：**
- 展示所有文件夹和文章
- 支持新建文件夹、新建文章
- 点击文章/文件夹切换内容

**中间（Markdown 编辑器）：**
- 使用 EasyMDE
- 实时保存（定时或 Ctrl+S）

**右侧（预览区）：**
- 实时预览 markdown 渲染结果

**顶部操作按钮：**
- 保存按钮
- 删除按钮
- 分享按钮（点击弹出分享模态框）

### 2. 查看页面 (`/view`)
**布局：** 同编辑页面，但内容只读
- 左侧：树形菜单
- 中间：渲染后的 markdown（只读）
- 无编辑器，无保存删除按钮

### 3. 分享页面 (`/share/[token]`)
**特点：**
- 公开访问（无需登录）
- 仅显示被分享的内容（文章或文件夹）
- 不显示其他菜单项
- 只读展示

---

## API 接口设计

### 文章接口
- `POST /api/articles` - 新建文章
- `GET /api/articles` - 查询文章内容（path 参数）
- `PUT /api/articles` - 更新文章内容
- `DELETE /api/articles/[id]` - 删除文章

### 文件夹接口
- `POST /api/folders` - 新建文件夹
- `GET /api/folders` - 查询文件夹及其内容（path 参数）
- `DELETE /api/folders/[id]` - 删除文件夹

### 分享接口
- `POST /api/share` - 创建分享链接
- `DELETE /api/share?token=...` - 删除分享链接
- `GET /api/share/[token]` - 通过分享链接获取内容

---

## 响应格式（所有 API）

**成功响应：**
```json
{
  "ok": true,
  "data": { /* 返回的数据 */ }
}
```

**失败响应：**
```json
{
  "ok": false,
  "error": "错误描述信息"
}
```

---

## 部署和访问

**本地开发：** `npm run dev` → `http://localhost:3000`

**局域网访问：** `http://<your-local-ip>:3000`（例：`http://192.168.1.100:3000`）

---

## 技术注意点

1. **文件系统操作** - 使用 Node.js 内置 `fs` 模块，支持异步操作
2. **路径处理** - 使用 `path` 模块确保跨平台兼容性
3. **并发访问** - 暂不考虑文件锁（单用户系统）
4. **性能** - 大文件夹内容可考虑分页查询（后续优化）

---

**设计完成，待审批。**
