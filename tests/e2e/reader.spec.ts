import { test, expect } from '@playwright/test';

interface ArticleNode {
  id: string;
  idChain: string;
  title: string;
  path: string;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function fetchArticles(
  request: import('@playwright/test').APIRequestContext,
): Promise<ArticleNode[]> {
  const res = await request.get('/api/articles/list');
  const json = (await res.json()) as ApiEnvelope<ArticleNode[]>;
  return json?.data ?? [];
}

test.describe('Reader 关键流程', () => {
  test('打开 /read 显示空状态', async ({ page }) => {
    await page.goto('/read');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText(/请选择一篇文章/i)).toBeVisible();
  });

  test('文章列表 → 打开第一篇 → 渲染 + 章末两端线', async ({ page, request }) => {
    const articles = await fetchArticles(request);
    test.skip(articles.length === 0, 'no articles available');
    const first = articles[0];

    await page.goto(`/read/${first.idChain}`);
    await page.waitForSelector('.rd-content-root');

    const root = page.locator('.rd-content-root');
    await expect(root).toBeVisible();

    await page.evaluate(() => {
      const sc = document.querySelector<HTMLElement>('[class*="scroller"]');
      sc?.scrollTo(0, sc.scrollHeight);
    });
    await expect(page.locator('.rd-endcard__finis')).toContainText('完');
  });

  test('点击中部唤出顶 + 底 bar', async ({ page, request }) => {
    const articles = await fetchArticles(request);
    test.skip(articles.length === 0, 'no articles available');
    await page.goto(`/read/${articles[0].idChain}`);
    await page.waitForSelector('.rd-content-root');

    await expect(page.locator('.rd-topbar--visible')).toHaveCount(0);
    const box = await page.locator('main.rd-content-root').boundingBox();
    if (!box) throw new Error('no box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('.rd-topbar--visible')).toBeVisible();
    await expect(page.locator('.rd-bottombar--visible')).toBeVisible();
  });

  test('键盘 [ ] 切换抽屉', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop hotkeys only');
    const articles = await fetchArticles(request);
    test.skip(articles.length === 0, 'no articles available');
    await page.goto(`/read/${articles[0].idChain}`);
    await page.waitForSelector('.rd-content-root');
    await page.locator('body').click({ position: { x: 5, y: 5 } });

    await page.keyboard.press('[');
    await expect(page.locator('.rd-drawer--left.rd-drawer--open')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.rd-drawer--left.rd-drawer--open')).toHaveCount(0);

    await page.keyboard.press(']');
    await expect(page.locator('.rd-drawer--right.rd-drawer--open')).toBeVisible();
  });

  test('⌘K 命令面板可打开并执行命令', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop cmdk only');
    await page.goto('/read');
    // 等 ReaderShell 完全注册 hotkey
    await page.waitForSelector('main', { state: 'visible' });
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+k');
    await expect(page.locator('.rd-cmdk')).toBeVisible();
    await page.locator('.rd-cmdk__input').fill('主题');
    await expect(page.locator('.rd-cmdk__row--active')).toContainText(/主题/);
    await page.keyboard.press('Enter');
    await expect(page.locator('.rd-cmdk')).toHaveCount(0);
  });

  test('选区 → 划线 → 持久化', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop selection only');
    const articles = await fetchArticles(request);
    test.skip(articles.length === 0, 'no articles available');
    const a = articles[0];
    await page.goto(`/read/${a.idChain}`);
    await page.waitForSelector('.rd-content-root');

    // 找一个 visible 的 p[data-sourcepos]（标题可能没文本可选）
    const targets = page.locator('.rd-content-root p[data-sourcepos]');
    const count = await targets.count();
    test.skip(count === 0, 'article has no paragraph with sourcepos');
    let chosen: { x: number; y: number; w: number; h: number } | null = null;
    for (let i = 0; i < Math.min(count, 8); i++) {
      const node = targets.nth(i);
      const box = await node.boundingBox();
      if (box && box.width > 60 && box.height > 8) {
        chosen = { x: box.x, y: box.y, w: box.width, h: box.height };
        break;
      }
    }
    if (!chosen) throw new Error('no usable paragraph found');

    await page.mouse.move(chosen.x + 4, chosen.y + chosen.h / 2);
    await page.mouse.down();
    await page.mouse.move(
      chosen.x + Math.min(120, chosen.w / 2),
      chosen.y + chosen.h / 2,
      { steps: 12 },
    );
    await page.mouse.up();

    await page.waitForSelector('.rd-seltoolbar', { timeout: 5_000 });
    await page.locator('.rd-seltoolbar__btn--mark').click();
    await page.waitForTimeout(400);

    const after = await request.get(`/api/reader/marks?articleId=${a.id}`);
    const data = (await after.json()) as ApiEnvelope<unknown[]>;
    expect((data.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  test('收藏 ⌘B + API 持久化', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop hotkeys only');
    const articles = await fetchArticles(request);
    test.skip(articles.length === 0, 'no articles available');
    const a = articles[0];

    // 读初始状态（toggle 是翻转，需要确定基线）
    const before = await request.get('/api/reader/favorites');
    const beforeData = (await before.json()) as ApiEnvelope<
      Array<{ articleId: string }>
    >;
    const wasFavored = (beforeData.data ?? []).some(
      (f) => f.articleId === a.id,
    );

    await page.goto(`/read/${a.idChain}`);
    await page.waitForSelector('.rd-content-root');
    await page.locator('body').click({ position: { x: 5, y: 5 } });

    await page.keyboard.press('Control+b');
    await page.waitForTimeout(800);

    const after = await request.get('/api/reader/favorites');
    const data = (await after.json()) as ApiEnvelope<
      Array<{ articleId: string }>
    >;
    const isFavoredNow = (data.data ?? []).some((f) => f.articleId === a.id);
    expect(isFavoredNow).toBe(!wasFavored);
  });
});
