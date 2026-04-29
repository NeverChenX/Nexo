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
