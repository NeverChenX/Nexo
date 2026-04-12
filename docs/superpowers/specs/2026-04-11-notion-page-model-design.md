# Notion-Style Page Model Design

**Date:** 2026-04-11  
**Status:** Approved

## Problem

Currently the system has two separate concepts: folders (containers, no content) and articles (content, no children). The user wants every item to be a "page" — editable content that can also contain sub-pages, exactly like Notion.

## Decision

**Option A: Directory + `_index.md`**

- Leaf page (no children): `pagename.md`
- Parent page (has children): `pagename/` directory + `pagename/_index.md` for the page's own content
- `_index.md` is invisible in the tree (filtered out)
- Promoting a leaf to parent: `page.md` → `page/` dir + `page/_index.md` (auto, on first sub-page creation)

## File System Structure

```
wiki-data/
  home.md                        ← leaf page
  笔记系统/
    _index.md                    ← "笔记系统" page content (migrated from empty folder)
    子笔记.md                    ← sub-page
  投资/
    _index.md                    ← "投资" page content
    2026-04-02/
      _index.md
      文章1.md
```

## Migration (auto, one-time on startup)

For every directory in `wiki-data` that lacks `_index.md`, create one with content `# <dirname>`.

Existing `.md` files are untouched. After migration all directories are valid parent pages.

## Storage Layer (`lib/storage.ts`)

### New / Changed Functions

| Function | Change |
|----------|--------|
| `readArticle(path)` | Try `path.md` first, then `path/_index.md` |
| `writeArticle(path, content)` | Write to whichever exists; if neither, create `path.md` |
| `promoteToParent(path)` | Rename `page.md` → `page/_index.md`, creating dir |
| `createPage(path, content?)` | Creates `path.md`; auto-promotes parent if parent is leaf |
| `deletePage(path)` | Deletes `path.md` OR `path/_index.md`; if dir has no other children, also removes dir |
| `getRecursiveTree` | Filter `_index.md` from listings; all items are pages; keep `isFolder` internally |
| `migrateToPageModel()` | One-time: add `_index.md` to all dirs that lack it |

### `isArticle(path)` 

Now checks both `path.md` and `path/_index.md`.

## API Changes

### `/api/articles` POST

Accept `parentPath`. If `parentPath` is currently a leaf `.md`, auto-promote it before creating child.

### `/api/articles` GET / PUT / DELETE

Updated to use new `readArticle` / `writeArticle` / `deletePage` — transparent to callers.

### `/api/folders`

Kept for backward compat during transition but all new creation goes through `/api/articles` POST with `parentPath`.

### Migration endpoint

`GET /api/migrate` — triggers `migrateToPageModel()`, idempotent, safe to call multiple times.

Or trigger automatically in `getRecursiveTree` (preferred — no manual step needed).

## TreeMenu

- Remove visual distinction between folder and article — all items use the same page icon (📄)
- Items with `children.length > 0` show expand arrow
- Right-click context menu: "新建子页面" available on every item
- No more separate "create folder" flow

## Editor Page

- `handleSelectItem(path, isFolder)`: always loads the editor regardless of `isFolder`
- Remove the folder-contents view entirely
- After editor content, render a **Sub-pages panel** (see below)

### Sub-pages Panel

Shown below the editor when the current page has children:

```
─── 子页面 ───────────────────────────────────
  📄 子页面名称1
  📄 子页面名称2
  + 新建子页面
```

Clicking a sub-page navigates to it. "+ 新建子页面" opens the CreateArticleModal with `parentPath` set.

## Data Flow: Adding a Sub-page

1. User right-clicks item or clicks "+ 新建子页面" in sub-pages panel
2. CreateArticleModal opens with `parentPath`
3. POST `/api/articles` with `{ path: "parentPath/newName", content: "# newName" }`
4. API checks: is `parentPath.md` a leaf? If yes, call `promoteToParent(parentPath)` first
5. Create `parentPath/newName.md`
6. Refresh tree; navigate to new page

## Data Flow: Deleting a Page

- If leaf (`path.md`): delete the file
- If parent (`path/`): delete the entire directory (including `_index.md` and all children)
- Confirmation modal always shown

## Unchanged

- Drag-to-reorder (sort order via `.order.json`)
- Rename via right-click
- Share / view page
- AI explain feature
- Auto-save
