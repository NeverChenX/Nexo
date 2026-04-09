# Wiki 预览/编辑双模式设计

**日期：** 2026-04-06  
**状态：** 已批准

---

## 概述

将 wiki 拆分为两个独立模式：**预览模式**（只读，默认）和**编辑模式**。两个模式通过顶部导航栏的切换按钮相互跳转，并通过 URL 参数保留当前文章状态。

---

## 路由设计

| 路径 | 模式 | 说明 |
|------|------|------|
| `/` | — | 重定向到 `/view` |
| `/view` | 预览模式 | 只读，支持 `?id=xxx` / `?path=xxx` |
| `/editor` | 编辑模式 | 读写，支持 `?id=xxx` / `?path=xxx`（现有） |

根路由 `app/page.tsx` 当前跳转到 `/editor`，改为跳转到 `/view`。

---

## 模式切换

- **预览页头部** 右侧加"编辑"按钮（`Pencil` 图标），点击跳转到 `/editor?id=xxx`
- **编辑页头部** 右侧加"预览"按钮（`Eye` 图标），点击跳转到 `/view?id=xxx`
- 当前无文章时（`articleData` 为 null），切换按钮禁用

---

## 预览页改动

现有 `app/view/page.tsx` 缺少 URL 参数支持，需补充：

1. 使用 `useSearchParams` 读取 `?id=xxx` 或 `?path=xxx`
2. 参数变化时调用 `loadArticle`（与 editor 逻辑保持一致）
3. 文章加载成功后，用 `router.replace('/view?id=xxx')` 将 id 写入 URL，确保切换到编辑模式时能定位同一篇文章
4. 头部展示当前文章路径（`currentPath`），右侧显示"编辑"切换按钮

---

## 编辑页改动

现有 `app/editor/page.tsx` 头部已有分享、删除按钮，只需在这些按钮左侧插入"预览"按钮：

- 图标：`Eye`（lucide-react，已在项目中使用）
- 变体：`outline`，尺寸 `sm`（与现有按钮一致）
- 点击：`router.push('/view?id=' + articleData.id)`，无文章时禁用

---

## 文件变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/page.tsx` | 修改 | 改跳转目标为 `/view` |
| `app/view/page.tsx` | 修改 | 添加 URL 参数支持、路由同步、切换按钮 |
| `app/editor/page.tsx` | 修改 | 添加"预览"切换按钮 |

不需要新建文件，不涉及 API 层改动。

---

## 非目标

- 不改变编辑模式的任何现有功能（自动保存、删除、分享等）
- 不修改 TreeMenu、Editor、Preview 等公共组件
- 不引入权限或身份验证机制
