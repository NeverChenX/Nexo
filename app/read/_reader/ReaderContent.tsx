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

// Extract text content from a React node tree (for code block contents)
function extractText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    if (props && 'children' in props) return extractText(props.children);
  }
  return '';
}

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
          const text = extractText(child?.props?.children);
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
