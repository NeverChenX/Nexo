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
