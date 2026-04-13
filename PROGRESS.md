# never_wiki 功能扩展进度

最后更新: 2026-04-12

## Phase 0: 进度追踪
- [x] 创建 PROGRESS.md

## Phase 1: i18n 国际化（中文 + 英文） ✅ 完成
- [x] 创建 lib/i18n.ts（t 函数 + React Context + locale 管理）
- [x] 创建 lib/locales/zh.ts（中文翻译）
- [x] 创建 lib/locales/en.ts（英文翻译）
- [x] 创建 components/I18nProvider.tsx
- [x] 创建 components/LocaleSwitcher.tsx
- [x] 改造 TreeMenu.tsx
- [x] 改造 CreateArticleModal.tsx
- [x] 改造 ShareModal.tsx
- [x] 改造 EditorBlockEditor.tsx
- [x] 改造 editor/page.tsx
- [x] 改造 read/page.tsx
- [x] 改造 ReadTOC.tsx
- [x] 改造 layout.tsx

## Phase 2: 全局搜索 ✅ 完成
- [x] 创建 lib/search.ts
- [x] 创建 app/api/search/route.ts
- [x] 创建 components/SearchPanel.tsx
- [x] editor/page 添加搜索按钮 + Cmd+K 快捷键

## Phase 3: 快捷命令面板 (Cmd+K) ✅ 已合并到 Phase 2
- [x] Cmd+K 快捷键已在搜索面板中实现

## Phase 4: 最近文档 ✅ 完成
- [x] 创建 lib/recent.ts（localStorage 记录最近访问）
- [x] editor/page 加载文章时记录最近访问

## Phase 5: 侧边栏折叠记忆 ✅ 完成
- [x] TreeMenu expanded 持久化到 localStorage（防抖 300ms）

## Phase 6: 文档统计 ✅ 完成
- [x] 创建 lib/doc-stats.ts（字数、阅读时间、CJK 支持）
- [x] editor 顶栏展示统计

## Phase 7: 增强面包屑 ✅ 完成
- [x] 创建 components/BreadcrumbDropdown.tsx
- [x] 替换 editor/page 面包屑（点击最后一级下拉展示同级文档）

## Phase 8: 标签系统 ✅ 完成
- [x] 创建 lib/frontmatter.ts（YAML frontmatter 解析/序列化）
- [x] 创建 app/api/tags/route.ts（标签列表 + 按标签查询）

## Phase 9: 反向链接 ✅ 完成
- [x] 创建 app/api/backlinks/route.ts（扫描所有文档查找引用）
- [x] 创建 components/BacklinksPanel.tsx（显示在 TOC 区域）

## Phase 10: 文档模板 ✅ 完成
- [x] 创建 lib/templates.ts（5 个默认模板）
- [x] 改造 CreateArticleModal 支持模板选择

## Phase 11: 导出功能 ✅ 完成
- [x] 创建 app/api/export/route.ts（MD/HTML 导出）
- [x] 创建 components/ExportMenu.tsx（下拉菜单 + PDF 打印）

## Phase 12: 回收站 ✅ 完成
- [x] 创建 lib/trash.ts（软删除、恢复、永久删除、清空）
- [x] 创建 app/api/trash/route.ts + app/api/trash-move/route.ts
- [x] 创建 components/TrashPanel.tsx（列表、恢复、永久删除、清空）
- [x] 编辑器删除改为软删除（回退到硬删除）

## Phase 13: 导入功能 ✅ 完成
- [x] 创建 app/api/import/route.ts（Markdown 文件批量导入）
- [x] 创建 components/ImportModal.tsx（拖拽上传 + 结果展示）

## Phase 14: 文件附件 ✅ 完成
- [x] 扩展 uploads API 支持 PDF/ZIP/DOCX/XLSX/PPTX/TXT/CSV

## Phase 15: 评论/批注（页面级备注） ✅ 完成
- [x] 创建 lib/comments.ts（CRUD 操作）
- [x] 创建 app/api/comments/route.ts
- [x] 创建 components/CommentsPanel.tsx（显示在 TOC 区域）

## Phase 16: 快捷键总览 ✅ 完成
- [x] 创建 components/KeyboardShortcutsModal.tsx
- [x] 按 ? 打开快捷键帮助

---

## 所有 16 个 Phase 已全部完成 ✅
