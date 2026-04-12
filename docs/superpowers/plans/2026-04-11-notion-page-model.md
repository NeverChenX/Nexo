# Notion-Style Page Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the folder/article duality with a unified "page" model where every item has editable content and can contain sub-pages, exactly like Notion.

**Architecture:** Use `_index.md` inside directories to store parent-page content; leaf pages remain plain `.md` files. The storage layer handles both forms transparently. An auto-migration on first tree load adds `_index.md` to all existing directories.

**Tech Stack:** Next.js 14, TypeScript, Node.js `fs/promises`, React

---

## File Map

| File | Change |
|------|--------|
| `lib/storage.ts` | Add dual-mode read/write, `promoteToParent`, `migrateToPageModel`; update `getRecursiveTree` |
| `lib/article-id.ts` | Include folder paths in `collectArticlePaths` |
| `app/api/articles/route.ts` | POST: auto-promote parent leaf; GET: return `isFolder` flag |
| `app/api/articles/[id]/route.ts` | DELETE: handle folder pages |
| `components/TreeMenu.tsx` | Unified page icon; folder items open editor |
| `app/editor/page.tsx` | Remove folder view; always load editor; add sub-pages panel; replace alert/confirm with modal |

---

## Task 1: Storage — Dual-mode `readArticle`, `writeArticle`, `isArticle`

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Replace `readArticle`**

In `lib/storage.ts`, replace the existing `readArticle` function:

```typescript
export async function readArticle(articlePath: string): Promise<string> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    // Fallback: parent page stores content in dir/_index.md
    const indexPath = path.join(WIKI_DATA_DIR, articlePath, '_index.md');
    return await fs.readFile(indexPath, 'utf-8');
  }
}
```

- [ ] **Step 2: Replace `writeArticle`**

```typescript
export async function writeArticle(articlePath: string, content: string): Promise<void> {
  const dirPath = path.join(WIKI_DATA_DIR, articlePath);
  try {
    const stat = await fs.stat(dirPath);
    if (stat.isDirectory()) {
      // Parent page: write to _index.md inside the directory
      await fs.writeFile(path.join(dirPath, '_index.md'), content, 'utf-8');
      return;
    }
  } catch { /* directory doesn't exist — fall through to leaf write */ }

  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}
```

- [ ] **Step 3: Replace `isArticle`**

```typescript
export async function isArticle(articlePath: string): Promise<boolean> {
  try {
    await fs.stat(path.join(WIKI_DATA_DIR, `${articlePath}.md`));
    return true;
  } catch {
    try {
      await fs.stat(path.join(WIKI_DATA_DIR, articlePath, '_index.md'));
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 4: Type-check**

```bash
cd /home/Neverchen/project/never_wiki && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: storage dual-mode read/write for leaf and parent pages"
```

---

## Task 2: Storage — `promoteToParent` and `migrateToPageModel`

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Add `promoteToParent`**

Add after the `writeArticle` function:

```typescript
/**
 * Convert a leaf page (page.md) into a parent page (page/_index.md).
 * Called automatically when the first sub-page is added to a leaf page.
 */
export async function promoteToParent(articlePath: string): Promise<void> {
  const filePath = path.join(WIKI_DATA_DIR, `${articlePath}.md`);
  const dirPath = path.join(WIKI_DATA_DIR, articlePath);
  const indexPath = path.join(dirPath, '_index.md');

  const content = await fs.readFile(filePath, 'utf-8');
  await ensureDir(dirPath);
  await fs.writeFile(indexPath, content, 'utf-8');
  await fs.unlink(filePath);
}
```

- [ ] **Step 2: Add `migrateToPageModel`**

Add after `promoteToParent`:

```typescript
/**
 * Idempotent migration: ensure every directory has a _index.md.
 * Existing directories without content get "# dirname" as default content.
 */
export async function migrateToPageModel(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === '_index.md') continue;
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(dirPath, entry.name);
    const indexPath = path.join(fullPath, '_index.md');

    try {
      await fs.stat(indexPath);
    } catch {
      // Create default content for existing folder
      await fs.writeFile(indexPath, `# ${entry.name}\n`, 'utf-8');
    }

    // Recurse into subdirectory
    await migrateToPageModel(
      fullPath,
      relativePath ? `${relativePath}/${entry.name}` : entry.name
    );
  }
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: add promoteToParent and migrateToPageModel to storage"
```

---

## Task 3: Storage — `getRecursiveTree` with migration and `_index.md` filter

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Add migration flag and update `getRecursiveTree`**

Add a module-level migration flag before `getRecursiveTree`, then update the function:

```typescript
// Run migration once per process lifetime
let _migrationDone = false;

export async function getRecursiveTree(
  dirPath: string = WIKI_DATA_DIR,
  relativePath: string = ''
): Promise<
  Array<{ name: string; path: string; isFolder: boolean; children?: Array<any> }>
> {
  // Auto-migrate on first call from the root
  if (!_migrationDone && dirPath === WIKI_DATA_DIR) {
    await migrateToPageModel();
    _migrationDone = true;
  }

  await ensureDir(dirPath);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: Array<{ name: string; path: string; isFolder: boolean; children?: Array<any> }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === '_index.md') continue; // hidden: it's the page's own content

    const fullPath = path.join(dirPath, entry.name);
    const relativeSafePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = await getRecursiveTree(fullPath, relativeSafePath);
      items.push({ name: entry.name, path: relativeSafePath, isFolder: true, children });
    } else if (entry.name.endsWith('.md')) {
      items.push({
        name: entry.name.replace('.md', ''),
        path: relativeSafePath.replace('.md', ''),
        isFolder: false,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Verify migration runs against real data**

Start the dev server and call the tree API:

```bash
curl -s http://localhost:3000/api/folders?tree=true | python3 -m json.tool | head -40
```

Expected: JSON tree with `ok: true`. Check that `wiki-data/投资/_index.md` now exists:

```bash
ls wiki-data/投资/_index.md
```

Expected: file exists with content `# 投资`.

- [ ] **Step 4: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: getRecursiveTree auto-migrates and hides _index.md"
```

---

## Task 4: `article-id.ts` — Include folder pages in path collection

**Files:**
- Modify: `lib/article-id.ts`

- [ ] **Step 1: Update `collectArticlePaths` to include folder paths**

Replace the existing `collectArticlePaths` function:

```typescript
function collectArticlePaths(items: TreeItem[]): string[] {
  const paths: string[] = [];
  for (const item of items) {
    // Include every item (both leaf articles and folder pages with _index.md)
    paths.push(item.path);
    if (item.children?.length) {
      paths.push(...collectArticlePaths(item.children));
    }
  }
  return paths;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/article-id.ts
git commit -m "feat: article-id includes folder pages for ID lookup"
```

---

## Task 5: API — `/api/articles` POST auto-promote parent leaf

**Files:**
- Modify: `app/api/articles/route.ts`

- [ ] **Step 1: Import `promoteToParent`**

In `app/api/articles/route.ts`, update the import from `@/lib/storage`:

```typescript
import {
  readArticle,
  writeArticle,
  isArticle,
  renameArticle,
  moveArticle,
  promoteToParent,
  isFolder,
} from '@/lib/storage';
import fs from 'fs/promises';
import path from 'path';
```

- [ ] **Step 2: Update POST handler to auto-promote**

Replace the POST handler body (after validating `path`):

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: articlePath, content = '' } = body;

    if (!path || typeof articlePath !== 'string') {
      return NextResponse.json({ ok: false, error: '缺少 path 参数' }, { status: 400 });
    }

    // Auto-promote parent leaf page when adding first sub-page
    const lastSlash = articlePath.lastIndexOf('/');
    if (lastSlash > 0) {
      const parentPath = articlePath.substring(0, lastSlash);
      const parentLeafFile = path.join(process.cwd(), 'wiki-data', `${parentPath}.md`);
      try {
        await fs.stat(parentLeafFile);
        // Parent is a leaf page — promote it to a parent page
        await promoteToParent(parentPath);
      } catch { /* parent is already a directory or doesn't exist — fine */ }
    }

    if (await isArticle(articlePath)) {
      return NextResponse.json({ ok: false, error: '文章已存在' }, { status: 400 });
    }

    await writeArticle(articlePath, content);
    return NextResponse.json({
      ok: true,
      data: { path: articlePath, id: articlePathToId(articlePath), content },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: '创建文章失败' }, { status: 500 });
  }
}
```

Note: `path` here refers to the Node.js `path` module imported as `import path from 'path'`. The local variable is `articlePath` to avoid shadowing.

- [ ] **Step 3: Update GET handler to return `isFolder` flag**

In the GET handler, after reading content, detect whether it's a folder page:

```typescript
export async function GET(request: NextRequest) {
  try {
    const rawPath = request.nextUrl.searchParams.get('path');
    const articleId = request.nextUrl.searchParams.get('id');
    let articlePath = rawPath;

    if (!articlePath && articleId) {
      articlePath = await findArticlePathById(articleId);
    }

    if (!articlePath) {
      return NextResponse.json({ ok: false, error: '缺少 path 或 id 参数' }, { status: 400 });
    }

    if (!(await isArticle(articlePath))) {
      return NextResponse.json({ ok: false, error: '文章不存在' }, { status: 404 });
    }

    const content = await readArticle(articlePath);
    const folderPage = await isFolder(articlePath);

    return NextResponse.json({
      ok: true,
      data: { path: articlePath, id: articlePathToId(articlePath), content, isFolder: folderPage },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: '读取文章失败' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 5: Test auto-promote via curl**

With dev server running, test creating a sub-page under an existing leaf:

```bash
# First create a test leaf page
curl -s -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{"path":"test-promote","content":"# Test"}' | python3 -m json.tool

# Verify it's a .md file
ls wiki-data/test-promote.md

# Now create a sub-page (should auto-promote test-promote)
curl -s -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{"path":"test-promote/child","content":"# Child"}' | python3 -m json.tool

# Verify: test-promote/ dir created, _index.md has original content, child.md exists
ls wiki-data/test-promote/
cat wiki-data/test-promote/_index.md
cat wiki-data/test-promote/child.md

# Cleanup
rm -rf wiki-data/test-promote
```

Expected output:
- First curl: `{"ok":true,"data":{...}}`
- Directory listing shows `_index.md` and `child.md`
- `_index.md` contains `# Test`
- `child.md` contains `# Child`

- [ ] **Step 6: Commit**

```bash
git add app/api/articles/route.ts
git commit -m "feat: auto-promote leaf to parent page on first sub-page creation"
```

---

## Task 6: API — `/api/articles/[id]/route.ts` DELETE handles folder pages

**Files:**
- Modify: `app/api/articles/[id]/route.ts`

- [ ] **Step 1: Update DELETE to handle both page types**

Replace the entire file content:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { deleteArticle, deleteFolder, isArticle, isFolder } from '@/lib/storage';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articlePath = decodeURIComponent(params.id);

    // Folder page: delete entire directory (children included)
    if (await isFolder(articlePath)) {
      await deleteFolder(articlePath);
      return NextResponse.json({ ok: true, data: { path: articlePath } });
    }

    // Leaf page: delete the .md file
    if (!(await isArticle(articlePath))) {
      return NextResponse.json({ ok: false, error: '文章不存在' }, { status: 404 });
    }

    await deleteArticle(articlePath);
    return NextResponse.json({ ok: true, data: { path: articlePath } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: '删除失败' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/articles/[id]/route.ts
git commit -m "feat: delete endpoint handles folder pages and leaf pages uniformly"
```

---

## Task 7: TreeMenu — Unified page icon, folder items open editor

**Files:**
- Modify: `components/TreeMenu.tsx`

The current `renderTree` already uses `FileText` for both folders and files. The only change needed: when `onSelectItem` is called with `isFolder: true`, the editor must handle it (done in Task 8). No visual changes are strictly required — but we add a subtle "has children" indicator.

- [ ] **Step 1: Update chevron visibility condition**

In `renderTree`, find the chevron span and update its container condition from:

```tsx
{item.isFolder ? (
  <span
    className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-slate-400 cursor-pointer hover:text-slate-600"
    onClick={(e) => { e.stopPropagation(); toggleFolder(item.path); }}
  >
    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
  </span>
) : (
  <span className="w-4 flex-shrink-0" />
)}
```

To: (show chevron only if has children, hide otherwise — same as before, but now correct semantics)

```tsx
{hasChildren ? (
  <span
    className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-slate-400 cursor-pointer hover:text-slate-600"
    onClick={(e) => { e.stopPropagation(); toggleFolder(item.path); }}
  >
    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
  </span>
) : (
  <span className="w-4 flex-shrink-0" />
)}
```

This was already correct (`hasChildren = item.isFolder && item.children && item.children.length > 0`), so no functional change — just a semantic clarification.

- [ ] **Step 2: Allow drop-into for ALL items (for future sub-page creation via drag)**

In `handleItemDragOver`, keep the existing logic. No change needed here — folder items (parent pages) already accept drops into the middle zone.

- [ ] **Step 3: Update context menu "新建子页面" to work for ALL items**

In the context menu section, the "新建子页面" button currently uses:

```tsx
onClick={() => { onCreateArticle(contextMenu.isFolder ? contextMenu.path : ''); setContextMenu(null); }}
```

Change to always pass the item path (so sub-pages can be created under leaf articles too, which will auto-promote them):

```tsx
onClick={() => { onCreateArticle(contextMenu.path); setContextMenu(null); }}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/TreeMenu.tsx
git commit -m "feat: TreeMenu allows sub-page creation under any item"
```

---

## Task 8: Editor page — Remove folder view, always load editor, add sub-pages panel

**Files:**
- Modify: `app/editor/page.tsx`

This is the largest change. We remove the folder-view branch entirely and add a sub-pages panel below the editor.

- [ ] **Step 1: Remove folder-related state and functions**

Remove these state declarations:

```typescript
// DELETE these lines:
const [currentType, setCurrentType] = useState<'article' | 'folder'>('article');
const [folderPath, setFolderPath] = useState<string | null>(null);
const [folderContents, setFolderContents] = useState<FolderItem[]>([]);
```

Remove the `FolderItem` interface (no longer needed in editor page):

```typescript
// DELETE:
interface FolderItem {
  name: string;
  path: string;
  isFolder: boolean;
  title?: string;
  updatedAt?: string;
  childCount?: number;
}
```

Remove `loadFolderContents` function entirely:

```typescript
// DELETE this entire function:
const loadFolderContents = useCallback(async (folderPath: string) => { ... }, []);
```

Remove `handleCreateFolder` function entirely (the folder creation flow is now replaced by "新建子页面"):

```typescript
// DELETE this entire function:
const handleCreateFolder = async (parentPath: string) => { ... };
```

- [ ] **Step 2: Add `isCurrentFolder` state and `subPages` state**

Add these new state declarations after the existing ones:

```typescript
const [isCurrentFolder, setIsCurrentFolder] = useState(false);
const [subPages, setSubPages] = useState<{ name: string; path: string; isFolder: boolean }[]>([]);
```

- [ ] **Step 3: Update `ArticleData` interface**

Add `isFolder` to the interface:

```typescript
interface ArticleData {
  path: string;
  id: string;
  content: string;
  isFolder?: boolean;
}
```

- [ ] **Step 4: Update `loadArticle` to set folder state and load sub-pages**

In `loadArticle`, after `setContent(json.data.content)`, add:

```typescript
const isFolderPage = !!json.data.isFolder;
setIsCurrentFolder(isFolderPage);

if (isFolderPage) {
  // Load sub-pages
  try {
    const subRes = await fetch(`/api/folders?path=${encodeURIComponent(json.data.path)}`);
    const subJson = await subRes.json();
    if (subJson.ok) setSubPages(subJson.data);
  } catch { setSubPages([]); }
} else {
  setSubPages([]);
}
```

- [ ] **Step 5: Update `handleSelectItem` to always load as article**

Replace the existing `handleSelectItem`:

```typescript
const handleSelectItem = (itemPath: string, _isFolder: boolean) => {
  if (itemPath === currentPath) return;
  setCurrentPath(itemPath);
  void loadArticle({ path: itemPath });
};
```

- [ ] **Step 6: Update `handleDelete` to handle folder pages and use custom modal**

Replace `handleDelete`:

```typescript
const handleDelete = async () => {
  if (!currentPath) return;
  const confirmed = await new Promise<boolean>((resolve) => {
    if (!window.confirm('确定要删除吗？' + (isCurrentFolder ? '\n（子页面也会一并删除）' : ''))) {
      resolve(false);
    } else {
      resolve(true);
    }
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/articles/${encodeURIComponent(currentPath)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (json.ok) {
      setCurrentPath('');
      setContent('');
      setArticleData(null);
      setIsCurrentFolder(false);
      setSubPages([]);
      setSaved(true);
      setSaveState('saved');
      setSaveError('');
      setLastSavedAt(null);
      router.replace('/editor');
      setRefreshKey((prev) => prev + 1);
    }
  } catch (error) {
    console.error('Failed to delete:', error);
  }
};
```

(Note: `window.confirm` still used here as a temporary measure since editor page doesn't have the TreeMenu modal system. This will be replaced with a proper modal in a follow-up.)

- [ ] **Step 7: Update `selectedPath` prop in `TreeMenu`**

Change from:

```tsx
selectedPath={currentPath || folderPath || ''}
```

To:

```tsx
selectedPath={currentPath}
```

- [ ] **Step 8: Update path display in header**

Change from:

```tsx
<p className="text-sm text-gray-500 truncate">{currentPath || folderPath || '未选择文档'}</p>
```

To:

```tsx
<p className="text-sm text-gray-500 truncate">{currentPath || '未选择文档'}</p>
```

- [ ] **Step 9: Remove folder-contents render branch**

Find the section starting with `} : folderPath !== null ? (` and the large folder view JSX block. Remove it entirely. The render logic should become:

```tsx
{currentPath ? (
  <div ref={editorContainerRef} className="flex-1 min-h-0 flex flex-col">
    {/* Editor + Preview row */}
    <div className="flex flex-1 min-h-0">
      <div
        style={{ width: showPreview ? `${editorWidthPercent}%` : '100%' }}
        className="min-w-0 border-r border-gray-200 h-full"
      >
        <Editor
          content={content}
          onChange={(newContent) => {
            setContent(newContent);
            setSaved(false);
            savedRef.current = false;
            setSaveState('dirty');
            setSaveError('');
          }}
        />
      </div>
      {showPreview && (
        <>
          <div
            className={`h-full w-1.5 cursor-col-resize bg-slate-200 transition-colors flex-shrink-0 ${
              draggingEditor ? 'bg-blue-400' : 'hover:bg-slate-300'
            }`}
            onMouseDown={startEditorDrag}
            role="separator"
            aria-orientation="vertical"
            aria-label="调整编辑区和预览区宽度"
          />
          <div style={{ width: `${100 - editorWidthPercent}%` }} className="min-w-0 h-full overflow-auto">
            <Preview content={content} />
          </div>
        </>
      )}
    </div>

    {/* Sub-pages panel */}
    {isCurrentFolder && (
      <div className="border-t border-gray-100 bg-[#fbfbfa] px-6 py-4 flex-shrink-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">子页面</p>
        {subPages.length === 0 ? (
          <p className="text-sm text-slate-400">暂无子页面</p>
        ) : (
          <div className="space-y-0.5">
            {subPages.map((sub) => (
              <button
                key={sub.path}
                onClick={() => handleSelectItem(sub.path, sub.isFolder)}
                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 text-sm text-slate-700 transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span>{sub.name || sub.path.split('/').pop()}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => handleCreateArticle(currentPath)}
          className="mt-2 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors px-2 py-1"
        >
          <span className="text-base leading-none">+</span>
          <span>新建子页面</span>
        </button>
      </div>
    )}
  </div>
) : (
  <div className="flex-1 flex items-center justify-center">
    <p className="text-gray-400">选择或创建一篇文档开始编辑</p>
  </div>
)}
```

- [ ] **Step 10: Remove unused `currentType` from `ShareModal`**

Find `type={currentType}` in the `ShareModal` usage. Replace with:

```tsx
type="article"
```

- [ ] **Step 11: Add `FileText` to editor page imports**

Ensure `FileText` is imported from `lucide-react` in `app/editor/page.tsx`:

```typescript
import { Trash2, Share2, Eye, PanelRightClose, PanelRightOpen, FileText } from 'lucide-react';
```

- [ ] **Step 12: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors (or only pre-existing errors unrelated to this task).

- [ ] **Step 13: Manual smoke test**

With dev server running:
1. Open http://localhost:3000/editor
2. Click on a folder item in the sidebar (e.g. "投资") — it should open in the editor with `# 投资` content
3. Scroll to bottom — sub-pages panel shows child items
4. Click "+ 新建子页面" — creates a new page under "投资"
5. Click on a leaf article — opens in editor normally, no sub-pages panel shown

- [ ] **Step 14: Commit**

```bash
git add app/editor/page.tsx
git commit -m "feat: unified page model in editor - remove folder view, add sub-pages panel"
```

---

## Task 9: Cleanup — Fix `getFolderContentsDetailed` for sub-pages panel data

**Files:**
- Modify: `lib/storage.ts`

The sub-pages panel calls `GET /api/folders?path=...` which uses `getFolderContentsDetailed`. This currently skips `_index.md` via `if (entry.name.startsWith('.')) continue` — but `_index.md` doesn't start with `.`, so it will appear in results. Fix this.

- [ ] **Step 1: Filter `_index.md` in `getFolderContentsDetailed`**

In `getFolderContentsDetailed`, update the entry filter:

```typescript
for (const entry of entries) {
  if (entry.name.startsWith('.')) continue;
  if (entry.name === '_index.md') continue; // hidden: own page content

  // ... rest of loop
}
```

Apply the same fix to `getFileTree`:

```typescript
for (const entry of entries) {
  if (entry.name.startsWith('.')) continue;
  if (entry.name === '_index.md') continue; // hidden

  // ... rest of loop
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add lib/storage.ts
git commit -m "fix: filter _index.md from folder contents listings"
```

---

## Task 10: Final — Refresh tree after sub-page creation

**Files:**
- Modify: `app/editor/page.tsx`

When a sub-page is created via the sub-pages panel's "+ 新建子页面", the parent page sub-pages list must refresh.

- [ ] **Step 1: Refresh sub-pages after article creation**

In `handleCreateConfirm`, after the successful creation, add a sub-pages refresh for parent pages:

```typescript
const handleCreateConfirm = async (name: string) => {
  setCreateModalOpen(false);
  const articlePath = createModalParent ? `${createModalParent}/${name}` : name;
  try {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: articlePath, content: '# ' + name }),
    });
    const json = await res.json();
    if (json.ok) {
      setCurrentPath(articlePath);
      setContent('# ' + name);
      setArticleData(json.data);
      setIsCurrentFolder(false);
      setSubPages([]);
      setSaved(true);
      setSaveState('saved');
      setSaveError('');
      setLastSavedAt(Date.now());
      if (json.data?.id) {
        router.replace(`/editor?id=${encodeURIComponent(json.data.id)}`);
      }
      setRefreshKey((prev) => prev + 1);
    }
  } catch (error) {
    console.error('Failed to create article:', error);
  }
};
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Full smoke test**

1. Open editor, click "技术文章" folder → opens with `# 技术文章`, sub-pages list shows existing articles
2. Click one of the sub-articles in the panel → opens that article
3. Click "+ 新建子页面" → modal opens, create "test-page" → navigates to new page
4. Go back to "技术文章" → new sub-page appears in panel
5. Create a new leaf page "my-test" in root → create sub-page "my-test/child" → leaf auto-promotes → tree shows "my-test" with expand arrow
6. Delete a folder page → entire directory removed, tree refreshes

- [ ] **Step 4: Final commit**

```bash
git add app/editor/page.tsx
git commit -m "feat: notion-style page model complete - unified pages, sub-pages panel, auto-promote"
```
