# Reader 模式重构设计文档

**日期**: 2026-04-29
**目标**: 把 `/read` 路由重构为一个独立的、纯阅读、暗色书页风格的"读书器"，灵感来自微信读书。与现有编辑器代码完全解耦，但底层数据复用 wiki 的 markdown 文件。

---

## 1. 设计原则

1. **沉浸优先** —— 默认无任何固定 chrome，正文是屏幕的全部。
2. **三端同源** —— 同一套设计在桌面 / iPad / 手机自然降级，不允许任何功能仅一端能用。
3. **附加层不破坏禅模式** —— 划线/笔记/想法是为强化阅读，呈现要克制；隐藏与展示永远可由用户控制。
4. **数据可肉眼读** —— 所有读书痕迹存为 JSON 文件，与 wiki 内容一同 git 备份。
5. **不动 editor** —— 现有 `/editor`、`TreeMenu`、`ReadTOC`、`SelectionCopyBubble`、`BacklinksPanel` 留给编辑器继续使用。

---

## 2. 信息架构

### 2.1 路由

| 路由 | 用途 | 备注 |
|------|------|------|
| `/read` | 阅读器壳（首屏 = 上次阅读 / 否则空状态） | 重写 |
| `/read/<idChain>` | 按文章 ID 链阅读 | 重写 |
| `/read/<path>` | 中文路径回退（沿用现逻辑） | 重写 |
| `/editor/<idChain>` | 编辑器（保持原样） | **不动** |

> 直接替换原 `/app/read/[[...ids]]/page.tsx`，旧组件不再被读模式引用。

### 2.2 文件目录

```
app/
  read/
    [[...ids]]/
      page.tsx              ← 壳 (Suspense + ReaderShell)
    _reader/                ← 读模式专属，下划线开头不被路由
      ReaderShell.tsx       ← 主容器
      ReaderTopBar.tsx      ← 顶 bar
      ReaderBottomBar.tsx   ← 底 bar
      ReaderContent.tsx     ← 正文渲染（Markdown→书页）
      ReaderEndCard.tsx     ← 章末两端线
      ReaderProgressToast.tsx ← "上次读到 X%" 提示
      drawers/
        LeftDrawer.tsx      ← 目录 / 书房 / 最近 三 tab
        RightDrawer.tsx     ← 大纲 / 反链 / 时长
      library/
        LibraryView.tsx     ← 书房主视图（5 tab）
        FavoritesTab.tsx
        NotesTab.tsx
        ThoughtsTab.tsx
        HistoryTab.tsx
        StatsTab.tsx        ← GitHub 风热力图
      annotation/
        SelectionToolbar.tsx ← 划线/笔记/想法/复制MD/分享
        ColorPalette.tsx    ← 4 色面板
        InlineNoteCard.tsx  ← 行间笔记/想法卡
        MarkPopover.tsx     ← 已划线被点时弹出
      cmdk/
        CommandPalette.tsx  ← ⌘K
        commands.ts         ← 命令注册表
      settings/
        SettingsSheet.tsx   ← 5 项设置面板
      hooks/
        useReader.ts
        useReaderPrefs.ts
        useReaderProgress.ts
        useSelection.ts     ← 选区接管 + 抗漂移锚点
        useReadingTime.ts   ← 阅读时长心跳
        useChapterNav.ts    ← 上/下一章解析
      reader.module.css
components/
  reader/                   ← 跨 read mode 复用的纯展示组件
    DarkCodeBlock.tsx       ← VS Code Dark+ 配色
    DarkMermaid.tsx
    DarkImageLightbox.tsx
lib/
  reader/
    prefs.ts                ← localStorage 读写
    anchor.ts               ← 划线锚点 + fuzzy 回退
    chapter-nav.ts          ← 兄弟文章解析
    reading-time.ts         ← 字数/分钟估算
    storage-client.ts       ← /api/reader/* 客户端
app/api/reader/
  marks/route.ts
  notes/route.ts
  thoughts/route.ts
  favorites/route.ts
  history/route.ts
  stats/route.ts
```

---

## 3. 视觉系统

### 3.1 主题（深炭黑，默认）

| token | 值 | 用途 |
|-------|-----|------|
| `--rd-bg` | `#0f0f10` | 页面背景（书页） |
| `--rd-bg-elev` | `#16161a` | 代码块、卡片底色 |
| `--rd-bg-bar` | `rgba(15,15,16,0.92)` | 顶/底 bar (毛玻璃) |
| `--rd-text` | `#c9c7c2` | 正文 |
| `--rd-text-strong` | `#e6e3dd` | 标题、加粗 |
| `--rd-text-muted` | `#a09e98` | 段落次要色 |
| `--rd-text-dim` | `#666` | 元信息 |
| `--rd-border` | `#1c1c1e` | 分隔线、边框 |
| `--rd-accent` | `#c9a76b` | 铜金，重音/进度条/笔记色条 |
| `--rd-link` | `#7aa2f7` | 链接、想法色条 |
| `--rd-mark-yellow` | `#fbbf24` | 划线·重点 |
| `--rd-mark-red` | `#f87171` | 划线·疑问 |
| `--rd-mark-green` | `#a3e635` | 划线·同意 |
| `--rd-mark-blue` | `#60a5fa` | 划线·待复习 |

**主题切换** 提供 3 档：纯黑 `#000` / **深炭黑（默认）** / 墨褐黑 `#15110d`。同套 token 不同值。

### 3.2 字体

- **正文**: `system-ui, -apple-system, "PingFang SC", "Noto Sans SC", "Source Han Sans SC", sans-serif`
- **标题**: 同正文，weight 600
- **代码**: `ui-monospace, "JetBrains Mono", "Fira Code", monospace`
- **设置可切换衬线**: `"Noto Serif SC", "Source Han Serif SC", Georgia, serif`

### 3.3 排版规则

- **默认字号**: 17px (设置可调 14–22 共 5 档)
- **行距**: 1.95 (设置可调 1.7 / 1.85 / 1.95 / 2.1 / 2.25 共 5 档)
- **段落首行缩进**: 2 字符 (`text-indent: 2em`)，**默认开**，设置可关
- **正文宽度**: 720px (设置可切 580 / 720 / 900)
- **标题层次**: H1 28px → H2 22px → H3 18px → H4 16px，全部 weight 600
- **章节号**: 在 H1 上方显示 `第 N 章` 小标签（`var(--rd-text-dim)` 字距 3px 大写 11px）
- **引用块**: 左 2px 铜金线 + `--rd-text-muted` + 微缩进 + 微斜体
- **分隔线 `<hr>`**: 居中三个 `·` 而非横线
- **表格**: `--rd-border` 边框 + 斑马纹（`#131316`/`#0f0f10`） + hover 行高亮 `#1a1a1c`
- **链接**: `--rd-link`，hover 加下划线
- **图片**: 圆角 4px，点击 → 暗色 lightbox（蒙层 `rgba(0,0,0,0.92)`）
- **代码块**: VS Code Dark+ 配色（用 `shiki` 或 `react-syntax-highlighter`），背景 `#1e1e1e`，右上角 [语言标签][复制按钮]
- **Mermaid**: 自定义暗色 themeVariables 匹配上述 token
- **KaTeX**: 字色继承正文，独立行公式居中、字号 +1px

---

## 4. 交互系统（极简禅模式）

### 4.1 默认状态

无任何固定 chrome。屏幕上只有：正文（720px 居中）+ 章末两端线 + 必要时的行间笔记/想法卡。

### 4.2 唤出顶 bar / 底 bar

| 设备 | 触发方式 | 行为 |
|------|---------|------|
| 桌面 | 点击正文外的中部空白 | 顶 bar (40px) + 底 bar (38px) 同步淡入 200ms（`Esc` 只用于关闭，不用于切换） |
| iPad | 同上（触屏单点 / 蓝牙键盘） | 同上 |
| 手机 | 点击正文外的中部空白 | 顶 bar (44px) + 底 sheet (56px) 同步淡入 |

> 滚动时自动隐藏（任意方向），停止滚动 1.5s 后若还在唤出态则保持。

### 4.3 顶 bar 内容（唤出时）

```
[☰] [面包屑: 基础 › 渲染 › 渲染管线的形状]   [42% · 5 分钟剩] [★] [⌘K] [⚙] [☷]
```

- `☰` —— 左抽屉切换（同 `[`）
- 面包屑 —— 显示当前文章的 idChain，每段可点击跳父目录（手机端只显示最末两级）
- 进度% / 剩余时间 —— 计算公式见 §8
- `★` —— 收藏 / 取消收藏当前文章
- `⌘K` —— 命令面板（同快捷键）
- `⚙` —— 设置面板
- `☷` —— 右抽屉切换（同 `]`）

### 4.4 底 bar 内容（唤出时）

```
[‹ 上一篇]  [当前 N / 共 X 篇]  [下一篇 ›]               [——●———————] [42%]
```

- 上一篇/下一篇 —— 章节模型见 §6
- N/X —— 在当前父目录中的位置 / 总数
- 进度条 —— 可拖动跳转（按文章高度比例换算 scrollTop）

### 4.5 抽屉

| 抽屉 | 桌面 | iPad | 手机 |
|------|------|------|------|
| 左 (`[`) | 280px 滑入，正文挤压；`Esc` 关 | 320px + 半透遮罩；左缘 8px 右滑唤出 | 全屏 sheet（顶部 ✕）；左缘右滑或顶部 ☰ |
| 右 (`]`) | 240px 滑入；同上 | 280px + 遮罩；右缘左滑 | 全屏 sheet；右缘左滑或顶部 ☷ |

**桌面端两侧可同开**（≥1240px 时正文保持 720；1024–1239px 区间正文自动压缩到最低 480）。**iPad 与手机端互斥**（开一个自动关另一个）。

### 4.6 左抽屉三 tab

```
[ 目录 | 书房 | 最近 ]
```

- **目录** —— 当前 wiki 文章树（移植 `TreeMenu` 内核但样式重写为暗色），当前文章高亮、自动展开父级；顶部搜索框（仅本树）；底部"最近阅读"3 条
- **书房** —— 见 §7
- **最近** —— 30 天内访问的文章列表（按 `lastReadAt` 倒序），含进度百分比

### 4.7 右抽屉

- **大纲** —— 文章 H2/H3 列表，IntersectionObserver 同步当前节高亮，点击平滑滚动到锚点
- 顶部显示字数 + 阅读时长估算（公式 §8）
- 底部显示反向链接（哪些文章引用了本文，调用现有 backlinks 计算逻辑）

### 4.8 键盘快捷键（桌面 + 蓝牙键盘）

| 键 | 行为 |
|---|------|
| `[` | 左抽屉开关 |
| `]` | 右抽屉开关 |
| `←` / `→` | 上/下一篇文章 |
| `↑` / `↓` | 平滑滚动一屏 |
| `Space` | 下翻一屏 |
| `Esc` | 关闭最上层弹层 / 收起 chrome |
| `⌘K` / `Ctrl+K` | 命令面板 |
| `⌘,` / `Ctrl+,` | 设置面板 |
| `⌘B` / `Ctrl+B` | 收藏/取消收藏 |
| `F` | 全屏 |
| `H` | 跳转到上次位置 |
| `G G` | 回到顶部 |
| `G E` | 跳到结尾 |

### 4.9 触屏手势（iPad / 手机）

| 手势 | 行为 |
|------|------|
| 单点正文外中部 | 唤出/收起顶+底 bar |
| 左缘右滑 | 打开左抽屉 |
| 右缘左滑 | 打开右抽屉 |
| 章末区域上滑 | 跳下一篇 |
| 文首区域下滑 | 跳上一篇 |
| 长按文字 | 触发 `useSelection` 接管 → 弹出底部固定工具气泡 |

---

## 5. 章末两端线

滚动到文章底部时，独立组件 `ReaderEndCard.tsx` 渲染：

```
…协调器处理虚拟 DOM。

────────────────────────────

‹ 上一章 · 调度策略                    下一章 · Fiber 内部 →

— 完 —
```

- 上一章/下一章解析见 §6
- 章末线进入视口 → 触发"已读完"判定（写 history.json）
- 移动端两个链接堆叠为上下两行

---

## 6. 章节模型（上/下一章）

### 6.1 默认规则

`lib/reader/chapter-nav.ts` 实现：

```ts
function resolveChapterNav(currentArticleId: string): {
  prev?: { id, idChain, title };
  next?: { id, idChain, title };
}
```

1. 取当前文章 `idChain`，解析出父目录
2. 列出父目录下所有兄弟文章（按 wiki 树顺序）
3. 找当前在数组中的索引 `i`
4. `prev = arr[i-1]`，`next = arr[i+1]`
5. 边界处理：
   - 若 `i === 0` 且父目录有上层 → `prev` = 父目录的上一个兄弟节点的最后一篇
   - 若 `i === arr.length - 1` 且父目录有上层 → `next` = 父目录的下一个兄弟节点的第一篇
   - 若已到 wiki 顶层边界 → `prev` 或 `next` 为 `undefined`

### 6.2 手动覆盖

支持文章 frontmatter：

```yaml
---
title: ...
prev: <id 或 idChain 或路径>
next: <id 或 idChain 或路径>
---
```

如果设置了，覆盖默认规则。

---

## 7. 我的书房（书房 tab 内）

5 个子 tab，三端布局：桌面/iPad 横屏 3 列卡片网格 → iPad 竖屏 2 列 → 手机 1 列堆叠 + tab 改为水平横向滑动条。

| Tab | 内容 |
|-----|------|
| ★ 收藏 | 文章卡片（标题 + 父目录 + 摘要前 80 字 + 收藏日期 + 笔记/划线计数），点击进入文章 |
| 📝 笔记 | 笔记列表，每条 = 原文片段（高亮）+ 你的备注 + "→ 跳转到文章"；按文章分组或时间倒序可切 |
| 💭 想法 | 想法时间线（按日期倒序），每条独立卡（段落引用 + 你的想法 + 日期） |
| 📖 历史 | 按日期分组的最近阅读，每条显示进度（%/已完成 ✓） |
| ⏱ 统计 | GitHub 风阅读热力图（按日总分钟数染色，最近 365 天）+ 总篇数 / 总字数 / 连续天数 / 平均每日分钟数 |

顶部右上角：`↓ 导出 JSON`（一键导出全部 6 个 reader 数据文件为单 zip）。

---

## 8. 阅读进度与时长

### 8.1 进度

- 实时计算：`progress = scrollTop / (scrollHeight - clientHeight)`，0–100%
- 节流写入：每 5s 一次 `history.json`（仅当变化 >= 1%）
- "已读完" 判定：章末线进入视口（`IntersectionObserver`）→ 标记 `completedAt`

### 8.2 自动跳回上次位置

打开同一文章时：
- 若 `lastReadProgress >= 5%` 且 `< 95%` → 滚动恢复 + 顶部弹 `ReaderProgressToast`：「↩ 上次读到 65%」（3s 自动消失，点击回到开头）
- 若 `< 5%` 或 `>= 95%` → 从开头开始

### 8.3 阅读时长估算（公式）

文章字数估算：
```
words = 中文字符数 + 英文单词数（按空格切）
```

阅读时长：
```
minutes = ceil(words / 350)
```
基准：350 字/分钟（中文 + 英文混合的中速阅读）

### 8.4 阅读时长统计（统计 tab）

- 心跳：每 30s 写一次 `stats.json`，前提是 `document.visibilityState === 'visible' && hasActivity`
- `hasActivity` = 过去 30s 内有 scroll / mouse / key / touch 事件
- `stats.dailyMinutes[YYYY-MM-DD] += 0.5`

---

## 9. 附加层（划线/笔记/想法/收藏）

### 9.1 数据模型（JSON 文件）

存储在 `wiki-data/_reader/` 下，每个文件是 JSON 数组（或对象，见 stats）。

#### marks.json
```ts
type Mark = {
  id: string;            // uuid
  articleId: string;     // 当前文章 ID
  anchor: {
    startOffset: number; // 在 markdown 源文本中的字符 offset
    endOffset: number;
    quote: string;       // 划线时的原文（前后各 15 字 + 选区）—— 抗漂移
  };
  color: 'yellow' | 'red' | 'green' | 'blue';
  createdAt: number;     // unix ms
};
```

#### notes.json
```ts
type Note = {
  id: string;
  articleId: string;
  anchor: { startOffset, endOffset, quote };
  text: string;          // 用户写的备注
  createdAt: number;
  updatedAt: number;
};
```

#### thoughts.json
```ts
type Thought = {
  id: string;
  articleId: string;
  anchor: { startOffset, endOffset, quote }; // 锚定到段落，不一定划线
  text: string;
  createdAt: number;
  updatedAt: number;
};
```

#### favorites.json
```ts
type Favorite = {
  articleId: string;
  addedAt: number;
};
```

#### history.json
```ts
type HistoryEntry = {
  articleId: string;
  lastReadAt: number;
  lastReadProgress: number; // 0–1
  scrollPos: number;        // 像素
  completedAt?: number;     // 第一次读完的时间
  reads: number;            // 累计访问次数
};
```

#### stats.json
```ts
type Stats = {
  dailyMinutes: Record<string /* YYYY-MM-DD */, number /* 0.5 step */>;
  articleStats: Record<string /* articleId */, { reads: number; totalMs: number }>;
};
```

### 9.2 划线锚点抗漂移

- 写入时存 `quote`（选区 ± 15 字上下文）
- 读取时：
  1. 先按 `startOffset/endOffset` 定位
  2. 校验文本是否匹配 `quote`
  3. 若不匹配 → 在全文里 fuzzy 搜索（Levenshtein 距离 < quote 长度 × 0.2 视为命中）
  4. 命中后更新 offset 写回；若搜不到 → 标记为"漂移"并在 UI 上灰显，悬停显示原 quote

### 9.3 选区交互流程

桌面/iPad+键鼠：
1. `selectionchange` 事件 → 选区结束 100ms 后显示工具气泡
2. 气泡浮在选区上方（如顶部空间不足则下方）
3. 内容：[划线（默认上次用过的色）] [笔记] [想法] [复制 MD] [分享]
4. **划线** 按钮长按/右键展开 4 色面板（黄=重点 / 红=疑问 / 绿=同意 / 蓝=待复习）
5. **笔记** 点击 → 划线 + 弹出文本输入框（行间）
6. **想法** 点击 → 不划线，直接弹出文本输入框（行间，蓝色条）
7. **复制 MD** —— 复制选中段的原 markdown（用现有 `data-sourcepos` 映射）
8. **分享** —— 复制带文章链接的引用（`> 原文片段 — 来自《文章名》/read/<idChain>`）

手机 / iPad 触屏：
1. 长按选词 → 浏览器原生选择激活
2. 接管：用 CSS `user-select: text` + 监听 `selectionchange`
3. 工具气泡固定屏幕底部（不浮选区上，因为系统菜单会冲突），从下方滑入
4. 长按文字超过 800ms 触发 `useSelection` 自定义流程

### 9.4 已划线段被点击

弹出 `MarkPopover`：
```
┌──────────────────────────┐
│ 2025-04-29 · 你写的       │
│ 协调器是 React 灵魂入口   │
│ ✎ 编辑笔记 🎨 改色 ✕ 删除 │
└──────────────────────────┘
```

### 9.5 行间笔记/想法卡

笔记/想法直接出现在划线段下方（不是浮层，是文档流的一部分）：

```
React 组件首先经过 [协调器处理虚拟 DOM] 差异。
  ▍笔记  协调器是 React 灵魂入口。

Fiber 架构使长任务可被切片。
  💭想法  这种非阻塞架构后来 Vue 也借鉴了。
```

- 笔记 = 金条 (`--rd-accent`)
- 想法 = 蓝条 (`--rd-link`)
- 卡片可点击折叠/展开
- 设置可控可见性：始终显示 / 折叠为彩色圆点 / 完全隐藏

### 9.6 API 路由

```
GET    /api/reader/marks?articleId=xxx        → Mark[]
POST   /api/reader/marks                      → Mark
PATCH  /api/reader/marks/:id                  → Mark
DELETE /api/reader/marks/:id                  → { ok }

（notes / thoughts / favorites / history 同上结构）

GET    /api/reader/stats                      → Stats
POST   /api/reader/stats/heartbeat            → { ok }   # 心跳累加 0.5
GET    /api/reader/export                     → application/zip
POST   /api/reader/import                     → { ok, counts }
```

服务端用文件锁（如 `proper-lockfile`）防并发写入冲突。

---

## 10. 命令面板 ⌘K

### 10.1 触发

- 桌面：`⌘K` / `Ctrl+K`
- iPad：顶 bar `⌘K` 图标 / 蓝牙键盘 `⌘K`
- 手机：顶 bar `🔍` 图标 → 全屏 sheet

### 10.2 搜索源（按顺序）

| 类别 | 数据源 | 字段 |
|------|--------|------|
| 文章 | wiki 文章列表 | 标题 + 路径 + 正文摘要前 200 字 |
| 笔记 | notes.json | 备注文本 + 原文 quote |
| 想法 | thoughts.json | 想法文本 + 原文 quote |
| 收藏 | favorites.json + 文章数据 | 标题 |
| 命令 | `commands.ts` 静态注册 | 命令名 + 关键词 |

### 10.3 搜索算法

- 简单 substring（不区分大小写，中文 NFC 归一化）
- 结果按类别分组，每组限 10 条
- 选中：键盘 `↑↓ Enter` / 鼠标 / 触摸点击
- 选中文章 → `/read/<idChain>`
- 选中笔记/想法 → 跳转到文章 + 滚动到 anchor + 高亮 1.5s
- 选中命令 → 执行（如 "切换主题"、"导出书房"）

### 10.4 内置命令

```
切换主题（深炭/纯黑/墨褐）
切换字体（衬线/无衬线）
切换缩进
切换笔记可见性
打开设置
打开书房
收藏当前文章
复制当前文章为 MD
导出全部读书痕迹
全屏切换
回到顶部
跳到结尾
```

---

## 11. 三端响应式断点

| 断点 | 范围 | 关键差异 |
|------|------|----------|
| `desktop` | ≥ 1024px | 720 居中；左右抽屉可同开；键盘主导；mouse hover 加成 |
| `tablet` | 768–1023px | 横屏同桌面；竖屏 92% 容器；触屏手势 + 蓝牙键盘等价 |
| `phone` | < 768px | 88% 全宽；字号 -1px；行距 1.85；抽屉变全屏 sheet；底 bar 变 sheet；左/右抽屉互斥 |

CSS 实现用 Tailwind 标准断点 + 必要时 `@media`。

---

## 12. 配置持久化

- **本地偏好** (`localStorage`，key = `never-wiki.reader.prefs`)：字号、行距、宽度、字体、主题、缩进、笔记可见性、最近用色（划线默认色）、抽屉宽度
- **跨端策略**：本地偏好不跨端同步（每台设备独立选择视觉偏好是合理的）；读书痕迹通过服务端 JSON 强同步
- **服务端数据** (`wiki-data/_reader/*.json`)：所有读书痕迹（划线/笔记/想法/收藏/历史/统计）
- 设置面板有「恢复默认」和「导出/导入 prefs.json」

---

## 13. 加载 / 空 / 错误状态

| 状态 | 表现 |
|------|------|
| 加载中 | 720px 容器内，骨架屏（标题 + 5 行段落 + 1 个代码块），暗色 `#16161a` 闪 |
| 空（无 idChain） | "选择一篇文章开始" + 列出最近阅读 3 条（如果有） |
| 文章不存在 | 居中 "未找到文章" + 返回主页按钮 |
| 网络错误 | 居中错误信息 + "重试" 按钮 |

---

## 14. 验收标准

- [ ] `/read` 在桌面 / iPad 横屏 / iPad 竖屏 / 手机 4 种屏幕下渲染正确
- [ ] 默认无任何固定 chrome；点击中部唤出顶+底 bar；再点收起
- [ ] 键盘 `[` `]` `←→` `Space` `Esc` `⌘K` 全部可用（桌面）
- [ ] 触屏长按 → 自定义工具气泡正确出现；左/右缘滑出抽屉
- [ ] 划线 4 色 + 笔记 + 想法可创建、编辑、删除；刷新后保留；跨设备访问同步
- [ ] 划线锚点抗漂移：原文修改 ≤ 20% 后划线仍能定位
- [ ] 上/下一篇按目录顺序正确；frontmatter `prev/next` 覆盖生效
- [ ] 章末两端线 + 已读完判定 + history.json 写入
- [ ] 进度自动跳回上次位置 + 顶部 toast
- [ ] 书房 5 tab 内容齐备；统计 tab 热力图渲染正确
- [ ] ⌘K 搜索文章 / 笔记 / 想法 / 收藏 / 命令 5 类
- [ ] 三种主题、字号 5 档、行距 5 档、宽度 3 档、衬线/非衬线切换、缩进开关全部生效
- [ ] 代码块 VS Code Dark+ 配色 + 复制按钮 + 语言标签
- [ ] Mermaid / KaTeX 暗色主题适配
- [ ] 旧 `/editor` 不受影响；`TreeMenu / ReadTOC / SelectionCopyBubble / BacklinksPanel` 仍在编辑器使用
- [ ] 阅读时长心跳每 30s 写入；GitHub 风热力图最近 365 天可见

---

## 15. 实施顺序建议

1. **骨架** — 路由 + ReaderShell + 主题 token + 排版基础（日 1）
2. **正文渲染** — DarkCodeBlock / DarkMermaid / DarkImageLightbox / 暗色 markdown 样式（日 2）
3. **唤出 + 抽屉骨架** — TopBar / BottomBar / LeftDrawer / RightDrawer + 键盘快捷键 + 触屏手势（日 3）
4. **章节导航** — chapter-nav.ts + EndCard + Toast + 进度持久化（日 4）
5. **附加层后端** — `/api/reader/*` + 文件锁 + 数据模型（日 5）
6. **附加层前端** — SelectionToolbar + ColorPalette + InlineNoteCard + MarkPopover + 锚点抗漂移（日 6-7）
7. **书房** — LibraryView + 5 tab + 统计热力图（日 8）
8. **⌘K** — CommandPalette + commands.ts + 搜索集成（日 9）
9. **三端 polish + 验收** — 响应式细节 + 边缘 case + 状态页（日 10）

总计约 10 个工作日。

---

**审阅人**: 你（user）
**下一步**: 审阅本文档 → 批准 → 调用 `writing-plans` 生成具体实施计划
