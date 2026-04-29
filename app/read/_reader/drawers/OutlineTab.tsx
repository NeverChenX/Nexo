'use client';

import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface Props {
  scrollEl: HTMLElement | null;
  contentSelector: string; // e.g. .rd-content-root
}

export function OutlineTab({ scrollEl, contentSelector }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 1) Collect headings on mount + when content changes
  useEffect(() => {
    const el = document.querySelector(contentSelector);
    if (!el) return;
    const hs = Array.from(el.querySelectorAll('h2, h3, h4')) as HTMLElement[];
    const list: Heading[] = hs
      .filter((h) => h.id)
      .map((h) => ({ id: h.id, text: h.innerText, level: parseInt(h.tagName[1], 10) }));
    setHeadings(list);
  }, [contentSelector]);

  // 2) Sync active heading with scroll
  useEffect(() => {
    if (!scrollEl || headings.length === 0) return;
    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((x): x is HTMLElement => !!x);
    if (targets.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { root: scrollEl, rootMargin: '0px 0px -70% 0px', threshold: 0.1 },
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, [scrollEl, headings]);

  const onClick = (id: string) => {
    const t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (headings.length === 0) {
    return (
      <p style={{ padding: '20px 12px', color: 'var(--rd-text-dim)', fontSize: 12 }}>
        本文无小节。
      </p>
    );
  }

  return (
    <ul className="rd-outline">
      {headings.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            className={`rd-outline__row ${activeId === h.id ? 'rd-outline__row--active' : ''}`}
            style={{ paddingLeft: 8 + (h.level - 2) * 14 }}
            onClick={() => onClick(h.id)}
          >
            {h.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
