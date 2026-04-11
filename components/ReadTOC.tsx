'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  level: number;
  text: string;
  id: string;
}

interface ReadTOCProps {
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parseHeadings(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  const seenIds = new Map<string, number>();

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    let id = slugify(text);
    if (!id) id = 'heading';

    const count = seenIds.get(id) ?? 0;
    seenIds.set(id, count + 1);
    const finalId = count === 0 ? id : `${id}-${count}`;

    items.push({ level, text, id: finalId });
  }

  return items;
}

export function ReadTOC({ content }: ReadTOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const items = parseHeadings(content);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">目录</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={`${item.id}-${item.level}`}
            style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
          >
            <button
              onClick={() => handleClick(item.id)}
              className={`text-left w-full leading-snug py-0.5 transition-colors ${
                activeId === item.id
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
