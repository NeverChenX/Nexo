# Wiki UI 重构设计文档（shadcn-ui）

**日期：** 2026-04-05  
**项目：** 使用 shadcn-ui 重构 Never Wiki 前端 UI  
**目标：** 提升视觉外观和用户体验，从现在的基础 Tailwind CSS 升级到企业级组件库

---

## 设计目标

1. **视觉提升** - 使用 shadcn-ui 组件库，实现现代、专业的界面
2. **用户体验** - 改进布局和交互，更符合现代 web 应用习惯
3. **响应式设计** - 支持桌面、平板、手机多种屏幕
4. **功能完整** - 保持所有现有功能不变，仅改进外观

---

## 技术选型

| 组件/库 | 选择 | 用途 |
|--------|------|------|
| shadcn-ui | 是 | 核心 UI 组件库（Button、Card、Tabs、Dialog、Sidebar 等） |
| EasyMDE | 保留 | Markdown 编辑器（稳定可靠） |
| react-markdown | 保留 | Markdown 预览渲染 |
| TailwindCSS | 保留 | 样式基础（shadcn-ui 依赖） |
| 主题 | 亮色（浅灰背景） | 浅色专业主题 |

---

## UI 布局重新设计

### 整体结构

```
┌─────────────────────────────────────────┐
│         顶部工具栏（路径 + 按钮）        │
├──────────────┬──────────────────────────┤
│              │   编辑 | 预览             │
│   左侧菜单    │   Tabs 切换              │
│  （文件树）   ├──────────────────────────┤
│              │   编辑器 / 预览内容      │
│   固定 250px  │   （根据 Tab 切换）     │
│   可折叠      │                         │
└──────────────┴──────────────────────────┘
```

### 1. 左侧菜单栏（Sidebar）
**使用：** shadcn-ui Sidebar
- **宽度：** 固定 250px（桌面），可折叠到 icon-only（平板）
- **内容：**
  - 标题 "Never Wiki"
  - 文件树（递归显示文件夹和文章）
  - 文件夹图标 📁，文章图标 📄
  - 每个文件夹右侧有"新文章"和"新文件夹"按钮（hover 显示）
- **交互：**
  - 点击文件/文件夹名称，选中高亮（shadcn-ui 的 highlight 样式）
  - 点击文件夹旁的 ▶️ 展开/收缩
- **样式：** 白色背景，边界线分隔，现代感

### 2. 顶部工具栏（Toolbar）
**使用：** shadcn-ui 布局 + Button
- **高度：** 50px
- **内容：**
  - 左：当前文件路径（灰色文本，可复制）
  - 中：缩进（flex-1 空白）
  - 右：按钮组
    - 保存 (绿色)
    - 分享 (蓝色)
    - 删除 (红色)
- **样式：** 浅灰背景，按钮用 shadcn-ui Button（size=sm 或 default）

### 3. 中间内容区
**使用：** shadcn-ui Tabs + Card

#### Tab 1: "编辑"
- **全宽展示 EasyMDE 编辑器**
- EasyMDE 包装在 shadcn-ui Card 中，去掉过度装饰
- 编辑器工具栏保持 EasyMDE 原生样式

#### Tab 2: "预览"
- **全宽展示 Markdown 渲染内容**
- 用 shadcn-ui Card 包装 react-markdown 输出
- 内容区有适当 padding，字体清晰可读
- 支持代码块高亮（保持现有）

---

## 组件详细设计

### TreeMenu（菜单）
**改动：**
- 从自写组件 → 使用 shadcn-ui 样式
- 树形结构保持，但视觉改进：
  - 使用 shadcn-ui 的 Button 作为菜单项
  - 选中状态用 `variant="default"` 高亮
  - 未选中状态用 `variant="ghost"` 淡化
  - Folder toggle 用 chevron icon（shadcn-ui icons）

### Editor（编辑器）
**改动：**
- 去掉自定义 CSS
- 用 shadcn-ui Card 包装，设置 `variant="outline"`
- EasyMDE 本身样式保持不变

### Preview（预览）
**改动：**
- 用 shadcn-ui Card 包装
- 增加 padding 和背景颜色
- 文本排版优化（行高、字体大小）

### ShareModal（分享对话框）
**改动：**
- 从自定义 modal → 使用 shadcn-ui Dialog
- 按钮用 shadcn-ui Button（Primary / Secondary）
- 输入框用 shadcn-ui Input
- 整体更专业

---

## 颜色方案（亮色主题）

| 元素 | 颜色 | 用途 |
|------|------|------|
| 背景 | #FAFAFA | 页面主背景 |
| 菜单背景 | #FFFFFF | 左侧菜单 |
| 工具栏背景 | #F3F4F6 | 顶部工具栏 |
| 边界线 | #E5E7EB | 分隔线 |
| 文本 | #1F2937 | 正文文本 |
| 主强调色 | #3B82F6 | 按钮、链接 |
| 成功色 | #10B981 | 保存按钮 |
| 危险色 | #EF4444 | 删除按钮 |

---

## 响应式设计

| 屏幕宽度 | 菜单 | 编辑/预览 | Tab 按钮 |
|---------|------|---------|--------|
| ≥ 1024px | 固定侧栏（250px） | 两栏展开 | 清晰标签 |
| 768px - 1024px | 可折叠到 icon-only | 两栏（变窄） | 简化标签 |
| < 768px | Sheet（抽屉式） | 单栏（编辑 + 预览标签） | 图标 + 标签 |

---

## 页面列表

### 编辑页面 (`/editor`)
- **布局：** 左菜单 + 右侧 Tabs（编辑/预览）
- **核心：** TreeMenu + Tabs + Editor + Preview + ShareModal

### 查看页面 (`/view`)
- **布局：** 同编辑页面，但无工具栏，无编辑功能
- **只读展示**

### 分享页面 (`/share/[token]`)
- **布局：** 中间卡片展示分享内容
- **无菜单，无工具栏**
- **公开访问**

---

## 文件结构（UI 相关）

```
components/
├── TreeMenu.tsx          # 改进：shadcn-ui Sidebar + 树形菜单
├── Editor.tsx            # 改进：Card 包装
├── Preview.tsx           # 改进：Card + 排版优化
├── ShareModal.tsx        # 改进：shadcn-ui Dialog
└── ui/                   # shadcn-ui 组件（自动生成）
    ├── button.tsx
    ├── card.tsx
    ├── tabs.tsx
    ├── dialog.tsx
    ├── sidebar.tsx
    ├── sheet.tsx
    ├── input.tsx
    └── ...

app/
├── editor/page.tsx       # 改进：使用新组件
├── view/page.tsx         # 改进：使用新组件
└── share/[token]/page.tsx # 改进：使用新组件

app/globals.css           # 更新：shadcn-ui 主题配置
```

---

## 实现步骤简述

1. **安装 shadcn-ui CLI**
2. **初始化 shadcn-ui 配置**
3. **添加必需组件**（Button、Card、Tabs、Dialog、Sidebar、Sheet、Input 等）
4. **改进 TreeMenu**（使用 Sidebar + 样式）
5. **改进 Editor 和 Preview**（Card 包装）
6. **改进 ShareModal**（Dialog 替换）
7. **更新全局样式和配色**
8. **响应式调整**
9. **测试所有页面**

---

## 成功标准

✅ UI 看起来现代、专业  
✅ 所有功能保持不变  
✅ 响应式适配桌面/平板/手机  
✅ 性能无明显下降  
✅ 服务器可正常启动和运行  

---

**设计完成，待审批。**
