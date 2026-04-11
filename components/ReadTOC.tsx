'use client';

import { useEffect, useState, useCallback } from 'react';

interface TocItem {
  level: number;
  text: string;
  id: string;
}

interface ReadTOCProps {
  /** 用于触发重新扫描 DOM 的 key（文章内容变化时更新） */
  contentKey: string;
  /** 包含渲染后标题的容器选择器 */
  containerSelector: string;
}

export function ReadTOC({ contentKey, containerSelector }: ReadTOCProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // 从 DOM 中扫描标题（rehype-slug 已为标题加好 id）
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

  // 内容变化后延迟扫描 DOM（等 ReactMarkdown 渲染完成）
  useEffect(() => {
    const timer = setTimeout(scanHeadings, 100);
    return () => clearTimeout(timer);
  }, [contentKey, scanHeadings]);

  // IntersectionObserver 追踪当前可见标题
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
            key={item.id}
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
