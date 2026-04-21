# 首页功能设计

## 概述

为 never_wiki 添加首页功能。首页嵌入现有 editor 页面布局中，当无文档选中时展示首页内容，替代当前的空白占位。左侧 TreeMenu 顶部增加"首页"入口。

## 布局

- 复用 editor 页面的侧边栏 + 主内容区布局
- 不新增路由，首页是 `/editor`（无 id/path 参数）的默认视图
- TreeMenu 顶部新增"首页"按钮，点击清除当前选中文档，回到首页

## 功能模块

### 1. 快捷操作栏

三个按钮横向排列：
- 新建文档：触发 CreateArticleModal
- 搜索：触发 SearchPanel（Ctrl+K）
- 导入文档：触发 ImportModal

### 2. 最近访问

- 数据源：`lib/recent.ts`（localStorage）
- 显示最近 10 条访问记录
- 每条：文档标题、路径缩写、相对时间（如"3分钟前"）
- 点击跳转到对应文档

### 3. 知识库统计

4 个统计卡片横向排列：
- 文档总数
- 总字数
- 标签数量
- 文件夹数量

数据通过新增的 `/api/home-stats` 接口获取。

### 4. 标签云

- 数据源：`/api/tags`（已有）
- 按使用频率排序，高频标签视觉更突出
- 点击标签触发搜索

### 5. 最近更新文档

- 数据源：`/api/home-stats` 返回
- 按文件系统 mtime 排序，最近修改的 10 篇文档
- 每条：标题、修改时间、字数

## 新增文件

| 文件 | 说明 |
|------|------|
| `components/HomePage.tsx` | 首页组件 |
| `app/api/home-stats/route.ts` | 统计数据接口 |

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| `app/editor/page.tsx` | 无文档选中时渲染 HomePage 替代空白占位 |
| `components/TreeMenu.tsx` | 顶部增加"首页"按钮 |

## API 设计

### GET /api/home-stats

返回：
```json
{
  "ok": true,
  "data": {
    "totalDocs": 42,
    "totalWords": 28000,
    "totalTags": 15,
    "totalFolders": 8,
    "recentlyUpdated": [
      {
        "path": "project/plan",
        "title": "项目计划",
        "wordCount": 1200,
        "updatedAt": "2026-04-15T06:30:00Z"
      }
    ]
  }
}
```

## 样式

- 使用现有 CSS 变量（`--c-bacPri`、`--c-texPri` 等）
- Notion 风格：简洁、留白、卡片圆角 8px
- 响应式：统计卡片在窄屏时 2x2 排列
