# Nexo

<p align="center">
  <b>轻量级个人 Wiki 与知识文档管理系统</b><br>
  <b>Lightweight Personal Wiki & Knowledge Document Manager</b>
</p>

<p align="center">
  <a href="#中文介绍">中文</a> | <a href="#english-introduction">English</a>
</p>

---

<a name="中文介绍"></a>
## 📖 中文介绍

**Nexo** 是一个基于 Next.js 构建的轻量级个人 Wiki 和知识文档管理系统。它为你提供了一个快速、本地优先的工作空间，用于编写、组织、预览和分享笔记与文档。

### ✨ 核心功能

- 📝 **Markdown 编辑器** - 支持 Markdown 语法的实时编辑与预览
- 🌲 **文档树导航** - 层级化的文件夹结构，轻松管理大量文档
- 👁️ **实时预览** - 编辑与预览双栏布局，所见即所得
- 💾 **本地数据存储** - 数据保存在本地，完全掌控自己的知识库
- 🔗 **分享链接** - 为特定页面生成可分享的链接
- 📤 **文件上传** - 支持图片等文件的上传与管理
- 📱 **响应式设计** - 适配桌面和移动设备

### 🛠 技术栈

| 技术 | 说明 |
|------|------|
| [Next.js 14](https://nextjs.org/) | React 全栈框架 |
| [React 18](https://react.dev/) | 用户界面库 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全的 JavaScript |
| [Tailwind CSS](https://tailwindcss.com/) | 实用优先的 CSS 框架 |
| [shadcn/ui](https://ui.shadcn.com/) | 精美的 UI 组件 |
| [EasyMDE](https://easymde.tk/) | Markdown 编辑器 |

### 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/NeverChenX/Nexo.git
cd Nexo

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可使用。

### 📂 项目结构

```
Nexo/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── editor/            # 编辑器页面
│   ├── view/              # 预览页面
│   └── layout.tsx         # 根布局
├── components/            # React 组件
│   ├── Editor.tsx         # Markdown 编辑器
│   ├── Preview.tsx        # 预览组件
│   └── TreeMenu.tsx       # 文档树菜单
├── lib/                   # 工具函数
├── wiki-data/             # Wiki 数据目录
├── never博客文章/          # 博客文章目录
└── public/                # 静态资源
```

### ⚙️ 配置说明

项目使用本地文件系统存储数据，默认数据目录为 `wiki-data/`。你可以在项目中创建不同的文件夹来组织文档。

### 📜 许可证

私有项目 / 个人使用

---

<a name="english-introduction"></a>
## 📖 English Introduction

**Nexo** is a lightweight personal wiki and knowledge document manager built with Next.js. It provides you with a fast, local-first workspace for writing, organizing, previewing, and sharing notes and documents.

### ✨ Key Features

- 📝 **Markdown Editor** - Real-time editing and preview with Markdown syntax support
- 🌲 **Document Tree Navigation** - Hierarchical folder structure for managing large volumes of documents
- 👁️ **Live Preview** - Side-by-side editing and preview layout, WYSIWYG
- 💾 **Local Data Storage** - Data stored locally, full control over your knowledge base
- 🔗 **Shareable Links** - Generate shareable links for specific pages
- 📤 **File Upload** - Support for uploading and managing images and other files
- 📱 **Responsive Design** - Adapted for desktop and mobile devices

### 🛠 Tech Stack

| Technology | Description |
|------------|-------------|
| [Next.js 14](https://nextjs.org/) | React full-stack framework |
| [React 18](https://react.dev/) | User interface library |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS framework |
| [shadcn/ui](https://ui.shadcn.com/) | Beautiful UI components |
| [EasyMDE](https://easymde.tk/) | Markdown editor |

### 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/NeverChenX/Nexo.git
cd Nexo

# Install dependencies
npm install

# Start the development server
npm run dev
```

Visit http://localhost:3000 to start using.

### 📂 Project Structure

```
Nexo/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── editor/            # Editor page
│   ├── view/              # Preview page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── Editor.tsx         # Markdown editor
│   ├── Preview.tsx        # Preview component
│   └── TreeMenu.tsx       # Document tree menu
├── lib/                   # Utility functions
├── wiki-data/             # Wiki data directory
├── never博客文章/          # Blog articles directory
└── public/                # Static assets
```

### ⚙️ Configuration

The project uses the local file system for data storage. The default data directory is `wiki-data/`. You can create different folders within the project to organize your documents.

### 📜 License

Private / Personal use

---

## 🤝 Contributing

This is a personal project currently open-sourced for reference purposes. Suggestions and feedback are welcome!

## ⭐ Star History

If you find this project helpful, please give it a star! ⭐

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/NeverChenX">NeverChenX</a>
</p>
