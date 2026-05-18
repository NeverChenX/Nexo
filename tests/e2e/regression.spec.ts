import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * 回归测试集：锁住本次修过的四个 bug，避免悄无声息回滚。
 *
 * 1. 阅读模式画线 wrap **必须**命中选中文本（textContent 坐标系；
 *    回归 innerText vs textContent 坐标系错位 bug）
 * 2. 阅读模式画线必须能 PATCH 改色 + DELETE 清理（回归 next rewrites
 *    把动态路由代理给 uvicorn 的 404 bug）
 * 3. 阅读模式打开空 _index.md 文件夹时自动跳到第一篇子文章（不再
 *    直接显示 EndCard "— 完 —"）
 * 4. 首页清理：localStorage 里指向已不存在文件的 recent/favorites
 *    条目，在 HomePage 加载时被服务端真实清单裁掉
 */

interface ApiEnvelope<T> { ok: boolean; data?: T; error?: string }
interface ArticleNode { id: string; idChain: string; title: string; path: string }

async function fetchArticles(req: APIRequestContext): Promise<ArticleNode[]> {
  const res = await req.get('/api/articles/list');
  const j = (await res.json()) as ApiEnvelope<ArticleNode[]>;
  return j.data ?? [];
}

test.describe('回归 1: 画线 wrap 命中选中文本（textContent 锚点）', () => {
  test('first paragraph: wrapped text 必须严格等于 selection.toString()', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop selection only');
    const articles = await fetchArticles(request);
    test.skip(articles.length === 0, 'no articles');
    const a = articles[0];

    // 先记录已有 marks 数量，做 delta 判断（不破坏用户已有数据）
    const before = await request.get(`/api/reader/marks?articleId=${a.id}`);
    const beforeCount = ((await before.json()) as ApiEnvelope<unknown[]>).data?.length ?? 0;

    await page.goto(`/read/${a.idChain}`);
    await page.waitForSelector('.rd-content-root p, .rd-content-root li', { timeout: 15_000 });
    await page.waitForTimeout(800);

    // 在第一段中间选 6 个字符
    const selectedText = await page.evaluate(() => {
      const root = document.querySelector('.rd-content-root');
      if (!root) return null;
      const para = root.querySelector('p, li');
      if (!para) return null;
      const t = document.createTreeWalker(para, NodeFilter.SHOW_TEXT).nextNode() as Text | null;
      if (!t || t.data.length < 12) return null;
      const r = document.createRange();
      r.setStart(t, 3);
      r.setEnd(t, 9);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
      return r.toString();
    });
    test.skip(!selectedText, '第一段太短或没找到');

    await page.waitForSelector('.rd-seltoolbar', { timeout: 5_000 });
    await page.locator('.rd-seltoolbar__btn--mark').click();
    await page.waitForTimeout(800);

    // 关键断言：DOM 里新增的 .rd-mark 必须包含一个文本完全等于 selectedText 的 span
    const wrappedTexts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.rd-content-root .rd-mark')).map((m) => m.textContent),
    );
    expect(wrappedTexts).toContain(selectedText);

    // 收尾：把本次插入的 mark 清掉，保持环境干净（用 selected 反查 id）
    const list = await request.get(`/api/reader/marks?articleId=${a.id}`);
    const items = ((await list.json()) as ApiEnvelope<Array<{ id: string; anchor: { selected?: string } }>>).data ?? [];
    const probe = items.find((m) => m.anchor?.selected === selectedText);
    if (probe) await request.delete(`/api/reader/marks/${probe.id}`);

    const after = await request.get(`/api/reader/marks?articleId=${a.id}`);
    const afterCount = ((await after.json()) as ApiEnvelope<unknown[]>).data?.length ?? 0;
    expect(afterCount).toBe(beforeCount); // 清理干净
  });

  test('deep paragraph (block-index >= 5): innerText 与 textContent 偏移分歧场景必须依然命中', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop selection only');
    const articles = await fetchArticles(request);
    test.skip(articles.length === 0, 'no articles');
    // 找一篇至少有 6 段的文章
    let a: ArticleNode | null = null;
    for (const cand of articles.slice(0, 30)) {
      await page.goto(`/read/${cand.idChain}`);
      await page.waitForSelector('.rd-content-root', { timeout: 15_000 });
      await page.waitForTimeout(500);
      const c = await page.locator('.rd-content-root p, .rd-content-root li').count();
      if (c >= 6) { a = cand; break; }
    }
    test.skip(!a, '找不到段落 >= 6 的文章用于深段落测试');
    if (!a) return;

    const before = await request.get(`/api/reader/marks?articleId=${a.id}`);
    const beforeCount = ((await before.json()) as ApiEnvelope<unknown[]>).data?.length ?? 0;

    const selectedText = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.rd-content-root p, .rd-content-root li');
      const target = blocks[5];
      if (!target) return null;
      const t = document.createTreeWalker(target, NodeFilter.SHOW_TEXT).nextNode() as Text | null;
      if (!t || t.data.length < 12) return null;
      const r = document.createRange();
      r.setStart(t, 4);
      r.setEnd(t, 10);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
      return r.toString();
    });
    test.skip(!selectedText, '第 6 段太短');

    await page.waitForSelector('.rd-seltoolbar', { timeout: 5_000 });
    await page.locator('.rd-seltoolbar__btn--mark').click();
    await page.waitForTimeout(800);

    const wrappedTexts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.rd-content-root .rd-mark')).map((m) => m.textContent),
    );
    expect(wrappedTexts, 'deep paragraph wrap mismatch — innerText/textContent 错位回归了').toContain(selectedText);

    // cleanup
    const list = await request.get(`/api/reader/marks?articleId=${a.id}`);
    const items = ((await list.json()) as ApiEnvelope<Array<{ id: string; anchor: { selected?: string } }>>).data ?? [];
    const probe = items.find((m) => m.anchor?.selected === selectedText);
    if (probe) await request.delete(`/api/reader/marks/${probe.id}`);

    const after = await request.get(`/api/reader/marks?articleId=${a.id}`);
    expect(((await after.json()) as ApiEnvelope<unknown[]>).data?.length ?? 0).toBe(beforeCount);
  });
});

test.describe('回归 2: marks PATCH/DELETE 必须走 Next.js（防 next.config.js 又把 /api/:path* 拦了）', () => {
  test('POST → PATCH 改色 → DELETE，响应头不能是 uvicorn', async ({ request }) => {
    const articles = await fetchArticles(request);
    test.skip(articles.length === 0, 'no articles');
    const a = articles[0];

    const created = await request.post('/api/reader/marks', {
      data: {
        articleId: a.id,
        anchor: { startOffset: 0, endOffset: 4, quote: 'regression-probe', selected: 'regression-probe', prefix: '', suffix: '' },
        color: 'yellow',
      },
    });
    expect(created.ok()).toBe(true);
    const mark = ((await created.json()) as ApiEnvelope<{ id: string }>).data!;

    const patched = await request.patch(`/api/reader/marks/${mark.id}`, { data: { color: 'red' } });
    expect(patched.status()).toBe(200);
    // 关键回归点：Next.js 不带 server 头，FastAPI uvicorn 会带 server: uvicorn。
    // 任何被 rewrite 拦给后端的请求会有 server 头 = uvicorn → 失败。
    const patchedServer = patched.headers()['server'];
    if (patchedServer) {
      expect(patchedServer, 'PATCH 回到 uvicorn 了 → next.config rewrites 又恶化了').not.toMatch(/uvicorn/i);
    }
    const body = (await patched.json()) as ApiEnvelope<{ color: string }>;
    // Next.js envelope 是 { ok, data: {...} }；FastAPI 404 envelope 是 { detail: "Not Found" } → ok 缺失或 false
    expect(body.ok).toBe(true);
    expect(body.data?.color).toBe('red');

    const deleted = await request.delete(`/api/reader/marks/${mark.id}`);
    expect(deleted.status()).toBe(200);
    const deletedServer = deleted.headers()['server'];
    if (deletedServer) {
      expect(deletedServer).not.toMatch(/uvicorn/i);
    }
    expect(((await deleted.json()) as ApiEnvelope<unknown>).ok).toBe(true);
  });
});

test.describe('回归 3: 阅读模式打开空 _index.md 文件夹应自动跳第一篇子文章', () => {
  test('从《价值投资 原理与实战》目录页进入应自动跳到第一章/前言', async ({ page, request }) => {
    const FOLDER_CHAIN = 'abbbno9s/neclo6vz/neku4ffb'; // 投资/书籍/价值投资 原理与实战
    // 前置：先确认这个文件夹的 _index 确实是空的（只有 H1），否则跳过
    const probe = await request.get(`/api/articles?path=${encodeURIComponent('投资/书籍/价值投资 原理与实战')}`);
    const probeJson = (await probe.json()) as ApiEnvelope<{ isFolder?: boolean; content?: string }>;
    test.skip(!probeJson.data?.isFolder, '路径不再是文件夹（数据已变）');
    const body = (probeJson.data?.content ?? '').replace(/^\s*#\s+[^\n]*\n?/, '').trim();
    test.skip(body.length > 0, '_index.md 现在不是空的，跳过');

    await page.goto(`/read/${FOLDER_CHAIN}`);
    // 等 ReaderShell 触发自动跳转 → URL 替换为第一篇子文章
    await page.waitForURL((u) => u.pathname !== `/read/${FOLDER_CHAIN}` && u.pathname.startsWith(`/read/${FOLDER_CHAIN}/`), { timeout: 10_000 });
    // 内容应被加载且不是空的
    await page.waitForSelector('.rd-content-root p, .rd-content-root h2, .rd-content-root li', { timeout: 10_000 });
    // EndCard 的"— 完 —"不应该是用户进来第一眼看到的；它出现在文档末尾才合理
    const endCardOnViewport = await page.evaluate(() => {
      const ec = document.querySelector('.rd-endcard__finis');
      if (!ec) return false;
      const r = ec.getBoundingClientRect();
      return r.top >= 0 && r.top < window.innerHeight; // 当前视口能看到
    });
    expect(endCardOnViewport, '一进文件夹就看到"— 完 —"说明没跳子文章').toBe(false);
  });
});

test.describe('回归 4: 首页删除清理（localStorage recent/favorites 与服务端真实清单的差集应被裁掉）', () => {
  test('注入一条"不存在的"recent 路径，进首页后应被裁掉', async ({ page }) => {
    await page.goto('/editor');
    await page.evaluate(() => {
      const stale = [
        { path: '__ghost__/不存在的文章', title: '幽灵文章', timestamp: Date.now() },
      ];
      window.localStorage.setItem('nexo_recent_docs', JSON.stringify(stale));
    });
    // 回首页（无 currentPath）触发 HomePage 加载 + /api/home-stats allPaths 裁剪
    await page.evaluate(() => {
      window.history.pushState(null, '', '/editor');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // 等加载完成 + 裁剪生效
    await page.waitForTimeout(2_000);
    const finalRecent = await page.evaluate(() => {
      const raw = window.localStorage.getItem('nexo_recent_docs');
      return raw ? JSON.parse(raw) : [];
    });
    expect(finalRecent.some((i: { path: string }) => i.path === '__ghost__/不存在的文章')).toBe(false);
  });
});
