# Phase 2 · 正文渲染 + 暗色 Markdown

**Goal:** ReaderShell 拿到文章 ID 后从 `/api/articles` 取 markdown，用 react-markdown 完整渲染：暗色样式 + VS Code Dark+ 代码块 + 暗色 Mermaid + 暗色 KaTeX + 暗色图片 lightbox。

**Depends on:** Phase 1 完成。

**Architecture:** 新组件 `ReaderContent` 负责取数据 + 渲染。代码块单独抽 `DarkCodeBlock`（动态加载 shiki，避免 SSR 重）。Mermaid / Image lightbox / 链接处理迁移并改造。

---

## File Structure

| 操作 | 路径 | 责任 |
|------|------|------|
| 安装 | `shiki@^1` | 代码语法高亮 |
| 创建 | `app/read/_reader/ReaderContent.tsx` | 主渲染组件 |
| 创建 | `app/read/_reader/hooks/useArticle.ts` | 加载文章数据 hook |
| 创建 | `components/reader/DarkCodeBlock.tsx` | shiki 暗色代码块 |
| 创建 | `components/reader/DarkMermaid.tsx` | 暗色 Mermaid |
| 创建 | `components/reader/DarkImageLightbox.tsx` | 暗色 lightbox |
| 修改 | `app/read/_reader/reader.module.css` | 加 markdown 列表/代码内联等细节 |
| 修改 | `app/read/_reader/ReaderShell.tsx` | 把占位换为 `<ReaderContent>` |

---

### Task 1: 安装 shiki

- [ ] **Step 1: 安装**

```bash
npm i shiki@^1.0.0
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(reader): add shiki for VS Code Dark+ code highlight"
```

---

### Task 2: `useArticle` hook

**Files:** Create `app/read/_reader/hooks/useArticle.ts`

- [ ] **Step 1: 实现**

```ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface ArticleData {
  content: string;
  path: string;
  id: string;
  idChain: string;
}

export interface UseArticleResult {
  data: ArticleData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useArticle(ids: string[] | undefined): UseArticleResult {
  const [data, setData] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  const fetchByQuery = useCallback(async (query: string) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles?${query}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: ArticleData;
        error?: string;
      };
      if (seq !== seqRef.current) return;
      if (json.ok && json.data) {
        setData(json.data);
        if (json.data.idChain) {
          window.history.replaceState(null, '', `/read/${json.data.idChain}`);
        }
      } else {
        setError(json.error || 'Failed to load article');
      }
    } catch {
      if (seq === seqRef.current) setError('Network error');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  const load = useCallback(() => {
    if (!ids || ids.length === 0) {
      setData(null);
      return;
    }
    const last = ids[ids.length - 1];
    if (/^[a-z0-9]{6,16}$/.test(last)) {
      void fetchByQuery(`id=${encodeURIComponent(last)}`);
    } else {
      const decoded = ids.map((s) => decodeURIComponent(s)).join('/').replace(/\.md$/, '');
      void fetchByQuery(`path=${encodeURIComponent(decoded)}`);
    }
  }, [ids, fetchByQuery]);

  useEffect(load, [load]);

  return { data, loading, error, reload: load };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/hooks/useArticle.ts
git commit -m "feat(reader): useArticle hook (race-safe load by id or path)"
```

---

### Task 3: `DarkCodeBlock` 组件

**Files:** Create `components/reader/DarkCodeBlock.tsx`

- [ ] **Step 1: 实现 shiki 动态加载**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

let highlighterPromise: Promise<unknown> | null = null;
async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: ['dark-plus'],
        langs: [
          'javascript', 'typescript', 'jsx', 'tsx', 'json', 'bash', 'shell',
          'python', 'go', 'rust', 'java', 'c', 'cpp', 'css', 'html', 'sql',
          'yaml', 'markdown', 'diff', 'plaintext',
        ],
      }),
    );
  }
  return highlighterPromise as Promise<{
    codeToHtml: (
      code: string,
      opts: { lang: string; theme: string },
    ) => string;
  }>;
}

export interface DarkCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function DarkCodeBlock({ code, language, className }: DarkCodeBlockProps) {
  const lang = (language || 'plaintext').toLowerCase();
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hl = await getHighlighter();
        if (cancelled) return;
        const out = hl.codeToHtml(code, { lang, theme: 'dark-plus' });
        setHtml(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) {
          setErr(msg);
          setHtml(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`rd-codeblock ${className ?? ''}`}>
      <div className="rd-codeblock__bar">
        <span className="rd-codeblock__lang">{lang}</span>
        <button
          type="button"
          aria-label={copied ? 'Copied' : 'Copy code'}
          onClick={onCopy}
          className="rd-codeblock__copy"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      {err ? (
        <pre className="rd-codeblock__pre" data-fallback>
          <code>{code}</code>
        </pre>
      ) : html ? (
        <div ref={ref} className="rd-codeblock__shiki" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="rd-codeblock__pre" data-loading>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 在 reader.module.css 加 codeblock 样式**

追加到 `app/read/_reader/reader.module.css`：
```css
:global(.rd-codeblock) {
  position: relative;
  margin: 16px 0;
  border-radius: 6px;
  overflow: hidden;
  background: #1e1e1e; /* dark-plus 底色 */
  border: 1px solid var(--rd-border);
}
:global(.rd-codeblock__bar) {
  position: absolute;
  top: 6px;
  right: 8px;
  display: flex;
  gap: 6px;
  align-items: center;
  z-index: 1;
}
:global(.rd-codeblock__lang) {
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: lowercase;
  color: #888;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 3px;
  padding: 1px 6px;
  font-family: var(--rd-font-mono);
}
:global(.rd-codeblock__copy) {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #333;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  color: #c9c7c2;
  cursor: pointer;
  padding: 0;
}
:global(.rd-codeblock__copy:hover) { background: rgba(255, 255, 255, 0.08); }
:global(.rd-codeblock__shiki pre) {
  margin: 0 !important;
  padding: 14px 16px !important;
  background: transparent !important;
  font-family: var(--rd-font-mono) !important;
  font-size: 13px !important;
  line-height: 1.7 !important;
  overflow-x: auto;
}
:global(.rd-codeblock__pre) {
  margin: 0;
  padding: 14px 16px;
  font-family: var(--rd-font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: #d4d4d4;
  overflow-x: auto;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/reader/DarkCodeBlock.tsx app/read/_reader/reader.module.css
git commit -m "feat(reader): DarkCodeBlock with shiki dark-plus + copy button"
```

---

### Task 4: `DarkMermaid` 组件

**Files:** Create `components/reader/DarkMermaid.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export function DarkMermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            background: '#0f0f10',
            primaryColor: '#16161a',
            primaryTextColor: '#e6e3dd',
            primaryBorderColor: '#c9a76b',
            secondaryColor: '#1c1c1e',
            tertiaryColor: '#0f0f10',
            lineColor: '#666',
            textColor: '#c9c7c2',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '13px',
          },
          securityLevel: 'strict',
        });
        const id = 'rd-mermaid-' + Math.random().toString(36).slice(2, 8);
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setErr(null);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setErr(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (err) {
    return (
      <pre
        style={{
          background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.3)',
          color: '#f87171',
          padding: '10px 12px',
          borderRadius: 6,
          fontSize: 12,
          whiteSpace: 'pre-wrap',
        }}
      >
        Mermaid 渲染失败: {err}
        {'\n\n'}
        {code}
      </pre>
    );
  }
  return <div ref={ref} style={{ margin: '14px 0', textAlign: 'center' }} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/DarkMermaid.tsx
git commit -m "feat(reader): DarkMermaid with theme variables matching reader tokens"
```

---

### Task 5: `DarkImageLightbox`

**Files:** Create `components/reader/DarkImageLightbox.tsx`

- [ ] **Step 1: 实现**

```tsx
'use client';

import { useState, useEffect } from 'react';

export function DarkImageLightbox({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!src) return null;
  return (
    <>
      <img
        src={src}
        alt={alt || ''}
        onClick={() => setOpen(true)}
        style={{ borderRadius: 4, cursor: 'zoom-in', maxWidth: '100%' }}
      />
      {open && (
        <div
          role="dialog"
          aria-label={alt || 'Image preview'}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={src}
            alt={alt || ''}
            style={{ maxWidth: '92vw', maxHeight: '92vh', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/DarkImageLightbox.tsx
git commit -m "feat(reader): DarkImageLightbox with 92% black overlay"
```

---

### Task 6: `ReaderContent` 主渲染

**Files:** Create `app/read/_reader/ReaderContent.tsx`

- [ ] **Step 1: 实现 markdown 渲染**

```tsx
'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { DarkCodeBlock } from '@/components/reader/DarkCodeBlock';
import { DarkMermaid } from '@/components/reader/DarkMermaid';
import { DarkImageLightbox } from '@/components/reader/DarkImageLightbox';

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...((defaultSchema.attributes?.['*'] || []) as string[]),
      'id',
      'className',
      'style',
      'dataSourcepos',
    ],
  },
};

// 把 mdast/hast 的 position 写到 data-sourcepos（划线锚点 phase 6 用得上）
const rehypeSourcePos = () => (tree: unknown) => {
  const walk = (node: {
    type?: string;
    position?: {
      start?: { line: number; column: number };
      end?: { line: number; column: number };
    };
    properties?: Record<string, unknown>;
    children?: unknown[];
  }) => {
    if (node && node.type === 'element' && node.position?.start && node.position?.end) {
      const p = node.position;
      node.properties = node.properties || {};
      node.properties.dataSourcepos = `${p.start!.line}:${p.start!.column}-${p.end!.line}:${p.end!.column}`;
    }
    if (node && Array.isArray(node.children)) {
      node.children.forEach((c) => walk(c as typeof node));
    }
  };
  walk(tree as Parameters<typeof walk>[0]);
};

const safeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('#')) return trimmed;
  try {
    const parsed = new URL(trimmed, 'https://placeholder.invalid');
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? trimmed : '';
  } catch {
    return trimmed;
  }
};

export interface ReaderContentProps {
  content: string;
  currentPath: string;
  onInternalLink: (path: string) => void;
}

export function ReaderContent({ content, currentPath, onInternalLink }: ReaderContentProps) {
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo(
    () =>
      [
        rehypeSlug,
        rehypeSourcePos,
        rehypeKatex,
        [rehypeSanitize, SANITIZE_SCHEMA],
      ] as never[],
    [],
  );

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      urlTransform={safeUrl}
      components={{
        pre: (props) => {
          const child = (props.children as { props?: { className?: string; children?: unknown } } | undefined);
          const cls = child?.props?.className || '';
          const m = /language-(\w+)/.exec(cls);
          const lang = m?.[1];
          const text =
            typeof child?.props?.children === 'string'
              ? (child!.props!.children as string)
              : Array.isArray(child?.props?.children)
              ? (child!.props!.children as unknown[])
                  .map((c) => (typeof c === 'string' ? c : ''))
                  .join('')
              : '';
          if (lang === 'mermaid') return <DarkMermaid code={text} />;
          return <DarkCodeBlock code={text} language={lang} />;
        },
        img: ({ src, alt }) => <DarkImageLightbox src={src} alt={alt} />,
        a: ({ href, children, ...props }) => {
          if (!href || href.startsWith('#')) {
            return (
              <a href={href} {...props}>
                {children}
              </a>
            );
          }
          if (
            href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('mailto:')
          ) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          }
          return (
            <a
              href={href}
              {...props}
              onClick={(e) => {
                e.preventDefault();
                let docPath = decodeURIComponent(href).replace(/^</, '').replace(/>$/, '');
                docPath = docPath.replace(/^\//, '').replace(/\.md$/, '');
                if (!docPath.startsWith('/') && currentPath.includes('/')) {
                  const parent = currentPath.split('/').slice(0, -1).join('/');
                  docPath = parent + '/' + docPath;
                }
                onInternalLink(docPath);
              }}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/ReaderContent.tsx
git commit -m "feat(reader): ReaderContent with dark code/mermaid/image + sourcepos"
```

---

### Task 7: 把 ReaderShell 接上 useArticle + ReaderContent

**Files:** Rewrite `app/read/_reader/ReaderShell.tsx`

- [ ] **Step 1: 重写 shell**

```tsx
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderPrefs } from './hooks/useReaderPrefs';
import { useArticle } from './hooks/useArticle';
import { ReaderContent } from './ReaderContent';
import styles from './reader.module.css';

export function ReaderShell({ ids }: { ids: string[] | undefined }) {
  const { prefs } = useReaderPrefs();
  const { data, loading, error } = useArticle(ids);
  const router = useRouter();

  const onInternalLink = useCallback(
    (path: string) => {
      router.push(`/read/${encodeURIComponent(path)}`);
    },
    [router],
  );

  return (
    <div
      className={`${styles.shell} ${styles[`theme-${prefs.theme}`]}`}
      data-font={prefs.font}
      style={{
        ['--rd-font-size' as never]: `${prefs.fontSize}px`,
        ['--rd-line-height' as never]: prefs.lineHeight,
      }}
    >
      <main
        className={styles.column}
        data-width={prefs.width}
        data-indent={prefs.indent ? 'true' : 'false'}
      >
        {loading && (
          <div style={{ color: 'var(--rd-text-dim)', fontSize: 14, padding: '40px 0' }}>
            加载中…
          </div>
        )}
        {!loading && error && (
          <div style={{ color: '#f87171', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
            {error}
          </div>
        )}
        {!loading && !data && !error && (
          <div style={{ color: 'var(--rd-text-dim)', textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>请选择一篇文章</p>
            <p style={{ fontSize: 13 }}>从左抽屉文章树进入（下一阶段实装）</p>
          </div>
        )}
        {!loading && data && (
          <ReaderContent
            content={data.content}
            currentPath={data.path}
            onInternalLink={onInternalLink}
          />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: build + restart 验证**

```bash
npm run build && npm run restart
```

浏览器打开 `http://localhost:3000/read/<某个真实文章 idChain>`，应看到：
- 标题、段落、代码块（dark-plus 配色 + 复制按钮 + 语言标签）
- 引用块、表格、分隔线（三个点）
- 图片可点击放大（暗色蒙层）
- Mermaid 图表暗色渲染
- KaTeX 公式渲染

- [ ] **Step 3: Commit**

```bash
git add app/read/_reader/ReaderShell.tsx
git commit -m "feat(reader): wire ReaderShell to useArticle + ReaderContent"
```

---

### Task 8: 列表/任务列表/键盘按键样式补全

**Files:** Modify `app/read/_reader/reader.module.css`

- [ ] **Step 1: 追加列表/kbd 样式**

```css
.column ul, .column ol { padding-left: 1.5em; margin: 12px 0; }
.column li { margin: 4px 0; }
.column ul li::marker { color: var(--rd-accent); }
.column ol li::marker { color: var(--rd-accent); }
.column input[type="checkbox"] {
  accent-color: var(--rd-accent);
  margin-right: 6px;
}
.column kbd {
  background: var(--rd-bg-elev);
  border: 1px solid var(--rd-border);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: var(--rd-font-mono);
  font-size: 0.85em;
  color: var(--rd-text-strong);
}
.column .katex { font-size: 1.05em; }
.column .katex-display { margin: 18px 0; }
```

- [ ] **Step 2: Commit**

```bash
git add app/read/_reader/reader.module.css
git commit -m "feat(reader): list, kbd, and katex display polish"
```

---

### Task 9: 验收 phase-2

- [ ] **Step 1: build**

```bash
npm run build 2>&1 | tail -10
```
Expected: success.

- [ ] **Step 2: 选 3 篇内容差异大的文章手动验证**

```bash
npm run restart
```
打开：
- 一篇代码量大的（验证 dark-plus）
- 一篇含 Mermaid 的（验证暗色主题）
- 一篇含 KaTeX 公式的（验证字色）
- 一篇含图片的（验证 lightbox）

- [ ] **Step 3: tag**

```bash
git tag reader/phase-2-content
```

---

## Phase-2 验收标准

- [ ] 文章正文以新主题渲染，无样式残留
- [ ] 代码块 VS Code Dark+ 配色 + 复制按钮 + 语言标签
- [ ] Mermaid 暗色匹配主题
- [ ] KaTeX 公式与正文颜色一致
- [ ] 图片点击进入暗色 lightbox（92% 黑）
- [ ] 内部链接拦截，外链 `target="_blank"`
- [ ] 表格、引用块、列表、任务清单、kbd 全部暗色化
- [ ] `data-sourcepos` 属性出现在元素上（DevTools 可查）
- [ ] `npm run build` 无 error
