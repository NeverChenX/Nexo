'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';

interface TocItem {
  level: number;
  text: string;
  id: string;
}

interface ReadTOCProps {
  contentKey: string;
  containerSelector: string;
}

export function ReadTOC({ contentKey, containerSelector }: ReadTOCProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  const scanHeadings = useCallback(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const headings = container.querySelectorAll('h1[id], h2[id], h3[id]');
    const result: TocItem[] = [];
    headings.forEach((el) => {
      const tagName = el.tagName.toLowerCase();
      const level = tagName === 'h1' ? 1 : tagName === 'h2' ? 2 : 3;
      result.push({
        level,
        text: el.textContent ?? '',
        id: el.id,
      });
    });
    setItems(result);
  }, [containerSelector]);

  useEffect(() => {
    const timer = setTimeout(scanHeadings, 100);
    return () => clearTimeout(timer);
  }, [contentKey, scanHeadings]);

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0% -70% 0%', threshold: 0 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  const { t } = useI18n();

  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav aria-label={t('toc.title')}>
      <p
        className="mb-3"
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--c-texSec)',
          letterSpacing: '0',
        }}
      >
        {t('toc.title')}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleClick(item.id)}
              title={item.text}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                fontSize: '13px',
                lineHeight: '1.5',
                padding: '4px 0',
                transition: 'color 0.15s ease',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                fontWeight: activeId === item.id ? 500 : 400,
                color: activeId === item.id ? 'var(--nx-blue)' : 'var(--c-texTer)',
                borderLeft: activeId === item.id ? '2px solid var(--nx-blue)' : '2px solid transparent',
                paddingLeft: `${(item.level - 1) * 12 + 8}px`,
              }}
              onMouseEnter={(e) => {
                if (activeId !== item.id) (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-texSec)';
              }}
              onMouseLeave={(e) => {
                if (activeId !== item.id) (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-texTer)';
              }}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
