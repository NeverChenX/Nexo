# Phase 9 · 三端 Polish + 状态页 + Settings 面板 + E2E

**Goal:** 把 spec 全部验收项打通：设置面板（5 项）、加载/空/错误状态页、三端响应回归、Playwright E2E 关键流程，然后合并到 `master`。

**Depends on:** Phase 1–8 完成。

**Architecture:** SettingsSheet 是单个 Drawer 风格 sheet（桌面浮窗 / 手机底 sheet），直接调 `useReaderPrefs.patch`。骨架屏走 CSS 动画。Playwright 跑在 dev 服务器 + 假数据。

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 安装 | `@playwright/test@^1` | E2E |
| 创建 | `playwright.config.ts` | 配置 |
| 创建 | `tests/e2e/reader.spec.ts` | 关键流程测试 |
| 创建 | `app/read/_reader/settings/SettingsSheet.tsx` | 5 项设置面板 |
| 创建 | `app/read/_reader/ReaderSkeleton.tsx` | 骨架屏 |
| 修改 | `app/read/_reader/ReaderShell.tsx` | 接入 SettingsSheet + 骨架屏 + 错误页 |
| 修改 | `app/read/_reader/reader.module.css` | polish |

---

### Task 1: 安装 Playwright

- [ ] **Step 1: 安装**

```bash
npm i -D @playwright/test@^1
npx playwright install chromium
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(reader): add @playwright/test for E2E"
```

---

### Task 2: `SettingsSheet` 5 项设置

**Files:** Create `app/read/_reader/settings/SettingsSheet.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useReaderUI } from '../ReaderUIContext';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import type { ThemeName, FontFamily, WidthName, NoteVisibility } from '@/lib/reader/prefs';

export function SettingsSheet() {
  const ui = useReaderUI();
  const { prefs, patch, reset } = useReaderPrefs();

  if (!ui.settingsOpen) return null;

  const fontSizeStep = (delta: number) =>
    patch({ fontSize: Math.max(14, Math.min(22, prefs.fontSize + delta)) });
  const lineHeightStep = (delta: number) =>
    patch({
      lineHeight: Math.max(1.7, Math.min(2.25, parseFloat((prefs.lineHeight + delta).toFixed(2)))),
    });

  return (
    <div className="rd-settings__overlay" onClick={ui.closeSettings} data-rd-no-toggle="true">
      <div className="rd-settings" onClick={(e) => e.stopPropagation()}>
        <div className="rd-settings__head">
          <span>阅读设置</span>
          <button type="button" onClick={ui.closeSettings} aria-label="close">✕</button>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">字号</span>
          <div className="rd-settings__group">
            <button type="button" onClick={() => fontSizeStep(-1)}>A−</button>
            <span className="rd-settings__value">{prefs.fontSize}</span>
            <button type="button" onClick={() => fontSizeStep(+1)}>A+</button>
          </div>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">行距</span>
          <div className="rd-settings__group">
            <button type="button" onClick={() => lineHeightStep(-0.1)}>紧</button>
            <span className="rd-settings__value">{prefs.lineHeight.toFixed(2)}</span>
            <button type="button" onClick={() => lineHeightStep(+0.1)}>松</button>
          </div>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">宽度</span>
          <div className="rd-settings__seg">
            {(['narrow', 'medium', 'wide'] as WidthName[]).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={prefs.width === w}
                onClick={() => patch({ width: w })}
              >
                {w === 'narrow' ? '580' : w === 'medium' ? '720' : '900'}
              </button>
            ))}
          </div>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">字体</span>
          <div className="rd-settings__seg">
            {(['sans', 'serif'] as FontFamily[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={prefs.font === f}
                onClick={() => patch({ font: f })}
              >
                {f === 'sans' ? '无衬线' : '衬线'}
              </button>
            ))}
          </div>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">主题</span>
          <div className="rd-settings__themes">
            {(['oled', 'charcoal', 'ink'] as ThemeName[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={prefs.theme === t}
                onClick={() => patch({ theme: t })}
                className={`rd-settings__swatch rd-settings__swatch--${t}`}
                aria-label={t}
              />
            ))}
          </div>
        </div>

        <div className="rd-settings__divider" />

        <div className="rd-settings__row">
          <span className="rd-settings__label">缩进</span>
          <button
            type="button"
            className="rd-settings__toggle"
            aria-pressed={prefs.indent}
            onClick={() => patch({ indent: !prefs.indent })}
          >
            {prefs.indent ? '开' : '关'}
          </button>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">笔记可见性</span>
          <div className="rd-settings__seg">
            {(['always', 'collapsed', 'hidden'] as NoteVisibility[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={prefs.noteVisibility === v}
                onClick={() => patch({ noteVisibility: v })}
              >
                {v === 'always' ? '显示' : v === 'collapsed' ? '折叠' : '隐藏'}
              </button>
            ))}
          </div>
        </div>

        <div className="rd-settings__foot">
          <button type="button" className="rd-settings__reset" onClick={reset}>恢复默认</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CSS**

```css
:global(.rd-settings__overlay) {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 75;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rd-fade 150ms ease;
}
:global(.rd-settings) {
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  border-radius: 10px;
  padding: 14px 16px;
  width: min(360px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--rd-text);
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
}
:global(.rd-settings__head) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--rd-text-dim);
  margin-bottom: 4px;
}
:global(.rd-settings__head button) {
  background: transparent;
  border: none;
  color: var(--rd-text-dim);
  cursor: pointer;
  font-size: 13px;
}
:global(.rd-settings__row) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
:global(.rd-settings__label) { color: var(--rd-text); }
:global(.rd-settings__group) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
:global(.rd-settings__group button) {
  background: var(--rd-bg);
  border: 1px solid var(--rd-border);
  color: var(--rd-text);
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}
:global(.rd-settings__group button:hover) { border-color: var(--rd-link); }
:global(.rd-settings__value) {
  display: inline-block;
  width: 36px;
  text-align: center;
  color: var(--rd-text-strong);
}
:global(.rd-settings__seg) {
  display: inline-flex;
  border: 1px solid var(--rd-border);
  border-radius: 4px;
  overflow: hidden;
}
:global(.rd-settings__seg button) {
  background: transparent;
  border: none;
  color: var(--rd-text-muted);
  font: inherit;
  font-size: 11px;
  padding: 3px 10px;
  cursor: pointer;
  border-right: 1px solid var(--rd-border);
}
:global(.rd-settings__seg button:last-child) { border-right: none; }
:global(.rd-settings__seg button[aria-pressed="true"]) {
  background: rgba(122,162,247,0.18);
  color: var(--rd-text-strong);
}
:global(.rd-settings__themes) {
  display: inline-flex;
  gap: 6px;
}
:global(.rd-settings__swatch) {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}
:global(.rd-settings__swatch--oled)     { background: #000; }
:global(.rd-settings__swatch--charcoal) { background: #0f0f10; }
:global(.rd-settings__swatch--ink)      { background: #15110d; }
:global(.rd-settings__swatch[aria-pressed="true"]) { border-color: var(--rd-link); }
:global(.rd-settings__toggle) {
  background: var(--rd-bg);
  border: 1px solid var(--rd-border);
  color: var(--rd-text);
  padding: 2px 14px;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}
:global(.rd-settings__toggle[aria-pressed="true"]) {
  background: rgba(122,162,247,0.18);
  border-color: var(--rd-link);
  color: var(--rd-text-strong);
}
:global(.rd-settings__divider) {
  height: 1px;
  background: var(--rd-border);
  margin: 4px 0;
}
:global(.rd-settings__foot) {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}
:global(.rd-settings__reset) {
  background: transparent;
  border: none;
  color: var(--rd-text-dim);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
:global(.rd-settings__reset:hover) { color: var(--rd-text); }

@media (max-width: 767px) {
  :global(.rd-settings__overlay) { align-items: flex-end; padding-bottom: env(safe-area-inset-bottom); }
  :global(.rd-settings) { width: 100%; border-radius: 12px 12px 0 0; }
}
```

- [ ] **Step 3: 在 ReaderShell 渲染**

```tsx
import { SettingsSheet } from './settings/SettingsSheet';
// ...
<SettingsSheet />
```

- [ ] **Step 4: Commit**

```bash
git add app/read/_reader/settings/SettingsSheet.tsx app/read/_reader/reader.module.css app/read/_reader/ReaderShell.tsx
git commit -m "feat(reader): SettingsSheet (5 prefs + indent + note-visibility, mobile bottom-sheet)"
```

---

### Task 3: 骨架屏 + 错误状态升级

**Files:** Create `app/read/_reader/ReaderSkeleton.tsx`, Modify `ReaderShell.tsx`

- [ ] **Step 1: 实现骨架**

```tsx
'use client';

export function ReaderSkeleton() {
  return (
    <div className="rd-skel">
      <div className="rd-skel__head" />
      <div className="rd-skel__line rd-skel__line--80" />
      <div className="rd-skel__line rd-skel__line--95" />
      <div className="rd-skel__line rd-skel__line--90" />
      <div className="rd-skel__code" />
      <div className="rd-skel__line rd-skel__line--85" />
      <div className="rd-skel__line rd-skel__line--92" />
    </div>
  );
}
```

- [ ] **Step 2: CSS 骨架动画**

```css
:global(.rd-skel) { display: flex; flex-direction: column; gap: 12px; padding: 24px 0; }
:global(.rd-skel__head) {
  height: 24px;
  width: 50%;
  background: var(--rd-bg-elev);
  border-radius: 4px;
  animation: rd-skel-pulse 1.4s ease-in-out infinite;
}
:global(.rd-skel__line) {
  height: 14px;
  background: var(--rd-bg-elev);
  border-radius: 3px;
  animation: rd-skel-pulse 1.4s ease-in-out infinite;
}
:global(.rd-skel__line--80) { width: 80%; }
:global(.rd-skel__line--85) { width: 85%; }
:global(.rd-skel__line--90) { width: 90%; }
:global(.rd-skel__line--92) { width: 92%; }
:global(.rd-skel__line--95) { width: 95%; }
:global(.rd-skel__code) {
  height: 90px;
  background: var(--rd-bg-elev);
  border-radius: 6px;
  margin: 8px 0;
  animation: rd-skel-pulse 1.4s ease-in-out infinite;
}
@keyframes rd-skel-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
```

- [ ] **Step 3: 在 ReaderShell 中替换 "加载中…"**

```tsx
import { ReaderSkeleton } from './ReaderSkeleton';
// ...
{loading && <ReaderSkeleton />}
```

- [ ] **Step 4: 错误页升级（带重试按钮）**

```tsx
{!loading && error && (
  <div className="rd-state rd-state--error">
    <p>{error}</p>
    <button type="button" onClick={() => location.reload()}>重试</button>
    <button type="button" onClick={() => router.push('/read')}>回阅读首页</button>
  </div>
)}
```

CSS：
```css
:global(.rd-state) {
  text-align: center;
  padding: 80px 20px;
  color: var(--rd-text);
}
:global(.rd-state button) {
  background: transparent;
  border: 1px solid var(--rd-border);
  color: var(--rd-text);
  padding: 4px 14px;
  margin: 4px;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
}
:global(.rd-state button:hover) { background: rgba(255,255,255,0.05); }
:global(.rd-state--error p) { color: #f87171; margin-bottom: 12px; }
```

- [ ] **Step 5: Commit**

```bash
git add app/read/_reader/ReaderSkeleton.tsx app/read/_reader/ReaderShell.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): skeleton loading + retry-aware error state"
```

---

### Task 4: 三端响应式回归 audit

**Files:** Modify `reader.module.css` (polish only)

- [ ] **Step 1: 桌面 1280×800 走流程**

```bash
npm run build && npm run restart
```

打开浏览器 1280×800，跑一遍：
- 阅读 → 唤出顶 bar / 底 bar
- `[/]` 抽屉
- ⌘K
- 设置
- 划线 / 笔记
- 书房
- 章末 上/下一篇

对每个不顺手的地方，在 reader.module.css 内调整。

- [ ] **Step 2: iPad 横屏 1024×768 走同样流程**

DevTools 模拟 → 验证 720 居中、键盘等价、抽屉宽 280/240。

- [ ] **Step 3: iPad 竖屏 768×1024**

验证：
- 容器自适应宽度
- 抽屉打开时仍可阅读
- 设置面板居中合适

- [ ] **Step 4: 手机 375×667**

验证：
- 88% 全宽 + 16px 内边距
- 字号 -1px 落地
- 顶 bar 44px、底 sheet 56px
- 抽屉变全屏 sheet
- ⌘K 全屏 sheet
- iOS 安全区（用 BrowserStack 或真机测；DevTools 用 `padding: env(safe-area-inset-bottom)` 验证）

- [ ] **Step 5: Commit polish**

```bash
git add app/read/_reader/reader.module.css
git commit -m "polish(reader): three-device responsive audit (1280/1024/768/375)"
```

---

### Task 5: Playwright 配置

**Files:** Create `playwright.config.ts`

- [ ] **Step 1: 配置**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop',  use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
```

- [ ] **Step 2: package.json scripts**

```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts package.json
git commit -m "chore(reader): playwright config (desktop + mobile)"
```

---

### Task 6: E2E 关键流程测试

**Files:** Create `tests/e2e/reader.spec.ts`

> 此测试假设 `/api/articles/list` 返回的列表里至少有 2 篇文章。如需要可以在 setup 中预制一篇 wiki 文章。

- [ ] **Step 1: 写测试**

```ts
import { test, expect } from '@playwright/test';

test.describe('Reader 关键流程', () => {
  test('打开 /read 显示空状态', async ({ page }) => {
    await page.goto('/read');
    await expect(page.locator('main.rd-content-root, main')).toBeVisible();
    await expect(page.getByText(/请选择一篇文章/i)).toBeVisible();
  });

  test('文章列表 → 打开第一篇 → 渲染 + 章末两端线', async ({ page }) => {
    const res = await page.request.get('/api/articles/list');
    const json = await res.json();
    const articles = (json?.data || []) as { id: string; idChain: string; title: string }[];
    expect(articles.length).toBeGreaterThan(0);
    const first = articles[0];

    await page.goto(`/read/${first.idChain}`);
    await page.waitForSelector('.rd-content-root');

    // 内容渲染（标题或正文）
    const root = page.locator('.rd-content-root');
    await expect(root).toBeVisible();

    // 章末 EndCard
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('.rd-endcard__finis')).toContainText('完');
  });

  test('点击中部唤出顶 + 底 bar', async ({ page }) => {
    const res = await page.request.get('/api/articles/list');
    const json = await res.json();
    const articles = json.data as { idChain: string }[];
    if (articles.length === 0) test.skip();
    await page.goto(`/read/${articles[0].idChain}`);
    await page.waitForSelector('.rd-content-root');

    await expect(page.locator('.rd-topbar--visible')).toHaveCount(0);
    // Click center of viewport, but on a non-text area: the .scroller bg
    const box = await page.locator('main.rd-content-root').boundingBox();
    if (!box) throw new Error('no box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('.rd-topbar--visible')).toBeVisible();
    await expect(page.locator('.rd-bottombar--visible')).toBeVisible();
  });

  test('键盘 [ ] 切换抽屉', async ({ page }) => {
    const res = await page.request.get('/api/articles/list');
    const json = await res.json();
    const articles = json.data as { idChain: string }[];
    if (articles.length === 0) test.skip();
    await page.goto(`/read/${articles[0].idChain}`);
    await page.waitForSelector('.rd-content-root');

    await page.keyboard.press('[');
    await expect(page.locator('.rd-drawer--left.rd-drawer--open')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.rd-drawer--left.rd-drawer--open')).toHaveCount(0);

    await page.keyboard.press(']');
    await expect(page.locator('.rd-drawer--right.rd-drawer--open')).toBeVisible();
  });

  test('⌘K 命令面板可打开并执行命令', async ({ page }) => {
    await page.goto('/read');
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');
    await expect(page.locator('.rd-cmdk')).toBeVisible();
    await page.locator('.rd-cmdk__input').fill('主题');
    await expect(page.locator('.rd-cmdk__row--active')).toContainText(/主题/);
    await page.keyboard.press('Enter');
    // 主题应已切换；面板关闭
    await expect(page.locator('.rd-cmdk')).toHaveCount(0);
  });

  test('选区 → 划线 → 持久化', async ({ page }) => {
    const res = await page.request.get('/api/articles/list');
    const json = await res.json();
    const articles = json.data as { idChain: string; id: string }[];
    if (articles.length === 0) test.skip();
    const a = articles[0];
    await page.goto(`/read/${a.idChain}`);
    await page.waitForSelector('.rd-content-root');

    // 选中第一个段落的前 8 个字符
    await page.evaluate(() => {
      const p = document.querySelector('.rd-content-root p');
      if (!p) return;
      const range = document.createRange();
      const text = p.firstChild;
      if (!text) return;
      range.setStart(text, 0);
      range.setEnd(text, Math.min(8, (text.textContent || '').length));
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    await page.waitForSelector('.rd-seltoolbar', { timeout: 5_000 });
    await page.locator('.rd-seltoolbar__btn--mark').click();

    // 校验后端已持久化
    const after = await page.request.get(`/api/reader/marks?articleId=${a.id}`);
    const data = await after.json();
    expect(data.data.length).toBeGreaterThanOrEqual(1);
  });

  test('收藏 ⌘B + 显示 ★', async ({ page }) => {
    const res = await page.request.get('/api/articles/list');
    const json = await res.json();
    const articles = json.data as { idChain: string; id: string }[];
    if (articles.length === 0) test.skip();
    const a = articles[0];
    await page.goto(`/read/${a.idChain}`);
    await page.waitForSelector('.rd-content-root');

    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+b' : 'Control+b');
    await page.waitForTimeout(400);

    const after = await page.request.get('/api/reader/favorites');
    const data = await after.json();
    expect((data.data as Array<{ articleId: string }>).some((f) => f.articleId === a.id)).toBe(true);
  });
});
```

- [ ] **Step 2: 跑 e2e**

```bash
npm run build && npm run e2e
```
Expected: 全部 pass。如某个 test 因数据缺失被 skip 是允许的。

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/
git commit -m "test(reader): E2E for skeleton/load/chrome/drawers/cmdk/mark/favorite"
```

---

### Task 7: 最终回归 + 验收 + 合并 master

- [ ] **Step 1: 全部测试**

```bash
npm test          # 单测 ≥ 37 pass
npm run lint      # 0 error
npm run build     # success
npm run e2e       # all pass (or skipped on missing data)
```

- [ ] **Step 2: 验收清单（按 spec §14）**

逐项打勾：

- [ ] `/read` 桌面/iPad 横竖屏/手机 4 屏渲染正确
- [ ] 默认无 chrome；点击中部唤出顶+底 bar；再点收起
- [ ] 键盘 `[ ] ←→ Space Esc ⌘K ⌘, ⌘B F H gg ge` 全部生效
- [ ] 触屏长按 → SelectionToolbar；左/右缘滑出抽屉
- [ ] 划线 4 色 + 笔记 + 想法可创建/编辑/删除；刷新保留；同服务器跨设备同步
- [ ] 锚点抗漂移：原文小修改 ≤ 20% 划线仍能定位
- [ ] 上/下一篇按目录顺序；frontmatter `prev/next` 覆盖生效
- [ ] 章末两端线 + 完成判定 + history.json 写入
- [ ] 进度自动跳回上次位置 + 顶部 toast
- [ ] 书房 5 tab 完整；统计热力图正确
- [ ] ⌘K 跨 5 类源搜索 + 命令执行
- [ ] 三主题 / 字号 5 档 / 行距 5 档 / 宽度 3 档 / 衬线非衬线 / 缩进开关全部生效
- [ ] 代码块 VS Code Dark+ + 复制 + 语言标签
- [ ] Mermaid / KaTeX 暗色主题
- [ ] 旧 `/editor` 不受影响；TreeMenu / ReadTOC / SelectionCopyBubble / BacklinksPanel 仍可用
- [ ] 阅读心跳每 30s 写入；365 天热力图正确

- [ ] **Step 3: 创建 PR / 合并到 master**

```bash
git push -u origin feat/reader-redesign
gh pr create --title "重构: /read 阅读模式（极简禅模式 · 微读式附加层 · 三端响应）" --body "$(cat <<'EOF'
## Summary
- 完全重写 /read 路由：暗色禅模式 + 居中 720px + 极简 chrome（点击中部唤出）
- 微信读书式附加层：4 色划线 / 笔记 / 想法 / 收藏 / 历史 / 阅读时长（含 GitHub 风热力图）
- 服务端 JSON 存储 (`wiki-data/_reader/*.json`)，三端访问同一服务器自动同步
- ⌘K 命令面板：跨文章 / 笔记 / 想法 / 收藏 / 命令 5 类全文搜索
- 三端响应：桌面 / iPad / 手机各自适配（键盘 / 蓝牙 / 触屏手势）

## Test plan
- [x] 单元测试 ≥ 37 pass（prefs/anchor/chapter-nav/reading-time/server-store）
- [x] Playwright E2E 桌面 + 手机视口
- [x] 手动验收 spec §14 全部 17 项
- [x] /editor 路由回归无影响
EOF
)"
```

- [ ] **Step 4: 合并后清理本地**

```bash
git checkout master
git pull
git branch -d feat/reader-redesign
```

- [ ] **Step 5: tag**

```bash
git tag reader/phase-9-polish
git push --tags
```

---

## Phase-9 验收标准

- [ ] 设置面板 5 项 + 缩进 + 笔记可见性全部可调
- [ ] 骨架屏在加载中正确显示
- [ ] 错误页含重试 / 回首页两个按钮
- [ ] Playwright 7 个测试全部 pass（或合理 skip）
- [ ] spec §14 验收清单 17 项全部打勾
- [ ] PR 已创建并通过 CI（如配置了的话）
