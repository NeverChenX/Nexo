# Reader 模式重构 · 总实施索引

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/read` 路由重构为暗色禅模式 + 微读式附加层 + 三端响应的纯阅读器。

**Architecture:** 直接替换 `/app/read/[[...ids]]/page.tsx`，新代码全部放在 `_reader/` 命名空间。本地偏好 → localStorage；读书痕迹 → `wiki-data/_reader/*.json`。组件树分层：壳 → 渲染 → 交互 → 数据。

**Tech Stack:** Next.js 14 / React 18 / TypeScript / Tailwind / react-markdown / mermaid / katex / shiki (新增) / proper-lockfile (新增) / fuse.js (新增)。

**Spec:** [`docs/superpowers/specs/2026-04-29-reader-redesign-design.md`](../specs/2026-04-29-reader-redesign-design.md)

---

## 阶段索引

| # | 阶段 | 工时 | 文件 | 产物可独立验收 |
|---|------|------|------|---------------|
| 1 | 基础骨架 + 主题 token | 1 天 | [`phase-1-skeleton.md`](./reader-redesign/phase-1-skeleton.md) | `/read` 加载新壳，深炭黑背景 + 排版基础生效 |
| 2 | 正文渲染 + 暗色 markdown | 1.5 天 | [`phase-2-content.md`](./reader-redesign/phase-2-content.md) | 文章正文以 VS Code Dark+ 配色完整渲染 |
| 3 | 章节导航 + 进度 + Toast | 1 天 | [`phase-3-chapter-nav.md`](./reader-redesign/phase-3-chapter-nav.md) | 章末两端线 + 自动跳回 + 进度持久化生效 |
| 4 | 唤出 + 顶/底 bar + 抽屉骨架 + 键盘 + 手势 | 2 天 | [`phase-4-chrome.md`](./reader-redesign/phase-4-chrome.md) | 点击中部唤出 + `[/]/←→/⌘K` + 触屏手势 |
| 5 | 附加层后端 (`/api/reader/*`) | 1 天 | [`phase-5-backend.md`](./reader-redesign/phase-5-backend.md) | 6 个 API 路由 CRUD 通过测试 |
| 6 | 附加层前端 · 划线/笔记/想法 | 2.5 天 | [`phase-6-annotation.md`](./reader-redesign/phase-6-annotation.md) | 选区→气泡→划线→保存→渲染→点击编辑全链路 |
| 7 | 我的书房 (5 tab) | 1.5 天 | [`phase-7-library.md`](./reader-redesign/phase-7-library.md) | 收藏/笔记/想法/历史/统计 5 tab + 热力图 |
| 8 | ⌘K 命令面板 | 1 天 | [`phase-8-cmdk.md`](./reader-redesign/phase-8-cmdk.md) | 跨 5 类源全文搜索 + 命令执行 |
| 9 | 三端 polish + 状态页 + E2E | 1.5 天 | [`phase-9-polish.md`](./reader-redesign/phase-9-polish.md) | 桌面/iPad 横竖/手机 4 屏验收通过 |

**总计**: 13 个工作日

---

## 执行规则

1. **顺序执行** —— 后阶段依赖前阶段产物，不可并行（除非显式标注）。
2. **每个 task 独立 commit** —— 文件只允许"创建/修改"，不允许"半成品"。
3. **TDD 优先** —— 纯函数（`anchor.ts` / `chapter-nav.ts` / `reading-time.ts` / `prefs.ts`）先写 vitest 单测；UI 行为靠 Playwright E2E 在 Phase 9 兜底。
4. **build 后 restart** —— 改 `.ts/.tsx/.css/locales` 后必须 `npm run build && npm run restart`（项目记忆规则）。
5. **三端检查** —— Phase 4 起，每个交互改动必须在桌面 + 手机两挡尺寸下验证（`width: 1280` 与 `width: 375`）。
6. **不破坏 editor** —— `TreeMenu / ReadTOC / SelectionCopyBubble / BacklinksPanel / DocumentStatsBar` 留给 `/editor` 用，read 模式新建独立组件。

---

## 风险与回滚

- **风险**: 旧 `/read` 替换前未保留备份 → 解决：新分支 `feat/reader-redesign` 上工作，main 不动。
- **风险**: 划线锚点漂移率高 → 解决：Phase 6 写专门的 fuzzy 测试用例（多种文章修改场景）。
- **风险**: shiki 体积大（~600KB gz）→ 解决：动态 import + 仅 client 加载。
- **回滚**: `git revert <merge-sha>` 可一键回到旧 read。

---

## 新增依赖（一次性安装）

```bash
npm i shiki@^1.0.0 proper-lockfile@^4 fuse.js@^7
npm i -D vitest@^1 @vitest/ui@^1 jsdom@^24 @playwright/test@^1
```
