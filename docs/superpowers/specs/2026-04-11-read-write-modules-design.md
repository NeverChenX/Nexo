# /write 和 /read 模块设计文档

## 目标

在现有 never_wiki 项目中新增两个独立的功能模块：
- `/write`：无干扰全屏编辑模式
- `/read`：最大化阅读体验的浏览模式

---

## 模块一：`/write` — 无干扰编辑模式

### 功能描述

纯粹的写作环境，去掉一切干扰，让用户专注写作。

### 界面布局

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回  |  wiki/哲学/萨特.md          已保存 ✓  |  侧栏▼  │  ← 顶部栏（可隐藏）
├─────────────────────────────────────────────────────────┤
│                                                         │
│                   [ 全屏编辑器 ]                          │
│                   EasyMDE                               │
│                   max-width: 860px, centered            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 设计决策

- **侧栏**：默认隐藏，右上角有「侧栏」按钮可展开（宽度240px，overlay模式，不压缩编辑区）
- **顶部栏**：始终可见，高度40px，极简风格，显示文件路径 + 保存状态 + 返回按钮
- **编辑器**：复用现有 `Editor.tsx` 组件（EasyMDE），max-width 860px，垂直居中，全高
- **快捷键**：`Ctrl/Cmd+S` 保存，`Esc` 退出侧栏
- **路由参数**：`/write?path=wiki/xxx.md`，与现有 `/editor` 共用同一套 API

### 技术方案

- 新建 `app/write/page.tsx`
- 复用 `lib/storage.ts` 的 `readArticle` / `writeArticle`
- 不需要新组件，直接内联布局
- 侧栏使用现有 `TreeMenu.tsx` 组件

---

## 模块二：`/read` — 最优阅读体验

### 功能描述

专为阅读优化的浏览模式，三级响应式布局，白底黑字，衬线标题。

### 界面布局（桌面端 ≥1024px）

```
┌──────────┬──────────────────────────────┬──────────┐
│  侧栏     │        正文内容               │  目录    │
│  240px   │  max-width: 700px, centered  │  200px   │
│  可折叠  │  18px, line-height: 1.9      │  sticky  │
│          │  serif 标题                  │          │
│  文章树  │                              │  页内TOC │
│          │                              │          │
└──────────┴──────────────────────────────┴──────────┘
```

### 界面布局（iPad 768px–1023px）

```
┌──────────┬────────────────────────────────────────────┐
│  侧栏     │        正文内容                             │
│  240px   │  max-width: 100%, padding: 24px            │
│  可折叠  │  无右侧TOC（TOC折叠进顶部）                  │
│          │                                            │
└──────────┴────────────────────────────────────────────┘
```

### 界面布局（手机端 <768px）

```
┌────────────────────────────────────────────────────────┐
│  ☰  文章标题                                    ···     │  ← 顶部栏
├────────────────────────────────────────────────────────┤
│                                                        │
│  正文内容（padding: 16px）                              │
│  16px, line-height: 1.9                               │
│                                                        │
└────────────────────────────────────────────────────────┘
  侧栏 = 全屏 overlay 抽屉，从左划出
```

### 设计决策

**排版**
- 正文：18px（桌面）/ 16px（移动）
- 行高：1.9
- 标题：`Georgia, 'Times New Roman', serif`
- 正文：`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- 内容区最大宽度：700px，左右 auto margin
- 背景：`#ffffff`，正文：`#1a1a1a`

**侧栏**
- 桌面/iPad：fixed 左侧，240px，可点击「◀」折叠
- 折叠后：变为16px宽的细条，点击展开
- 移动：overlay 抽屉，点击 ☰ 展开

**目录（TOC）**
- 桌面：右侧固定，解析文章中的 `##`/`###` 标题，sticky
- iPad/移动：隐藏（或折叠在顶部按钮内）
- 使用 JS 解析 markdown 标题，点击跳转到锚点

**渲染**
- 复用现有 `Preview.tsx` 的 markdown 渲染（remark + rehype）
- 额外添加 `rehype-slug` 为标题加 id（TOC 锚点）

**路由**
- `/read` = 首页（显示文章树，选中后展示内容）
- `/read?path=wiki/xxx.md` = 直接打开指定文章

### 技术方案

- 新建 `app/read/page.tsx`（客户端组件，SSR 无需）
- 新建 `components/ReadSidebar.tsx`（读模式专用侧栏，基于 TreeMenu 简化）
- 新建 `components/ReadTOC.tsx`（目录组件）
- `Preview.tsx` 保持不变，在 read 页面中使用
- 添加 `rehype-slug` 依赖（如未安装）

---

## 文件变更清单

### 新建文件
- `app/write/page.tsx` — 无干扰编辑页
- `app/read/page.tsx` — 阅读模式主页
- `components/ReadSidebar.tsx` — 阅读模式侧栏
- `components/ReadTOC.tsx` — 文章目录组件

### 修改文件
- `package.json` — 添加 `rehype-slug`（如缺少）
- `app/globals.css` — 添加阅读模式排版样式（`.read-content` class）

### 不修改
- `components/TreeMenu.tsx`（/write 直接使用现有组件）
- `components/Editor.tsx`（复用）
- `components/Preview.tsx`（复用）
- `lib/storage.ts`（不变）

---

## 验收标准

### /write
- [ ] URL `/write?path=xxx` 能打开指定文章并编辑
- [ ] Ctrl+S 保存，显示"已保存"状态
- [ ] 编辑器全屏，无其他干扰元素
- [ ] 侧栏默认隐藏，点击按钮可打开/关闭
- [ ] 返回按钮跳转回 `/editor`

### /read
- [ ] URL `/read?path=xxx` 能打开指定文章
- [ ] 正文宽度700px，字体18px，行高1.9
- [ ] 桌面端左侧显示文章树，右侧显示TOC
- [ ] 侧栏可折叠
- [ ] iPad 无右侧TOC，侧栏可折叠
- [ ] 手机端侧栏变为抽屉，顶部显示汉堡菜单
- [ ] 标题使用衬线字体
- [ ] TOC 点击可跳转到对应段落
