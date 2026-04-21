'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  const { t } = useI18n();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 计算哪些 items 当前应该隐藏：level=3 紧跟着某个 collapsed 的 level<=2
  const visibleItems = items.filter((item, idx) => {
    if (item.level < 3) return true;
    // 向上找最近的 level 2（或 level 1）父项
    for (let i = idx - 1; i >= 0; i--) {
      if (items[i].level < item.level) {
        return !collapsed.has(items[i].id);
      }
    }
    return true;
  });

  const hasChildren = (idx: number): boolean => {
    const item = items[idx];
    if (item.level >= 3) return false;
    for (let i = idx + 1; i < items.length; i++) {
      if (items[i].level <= item.level) break;
      if (items[i].level > item.level) return true;
    }
    return false;
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
        {visibleItems.map((item) => {
          const idx = items.indexOf(item);
          const canCollapse = hasChildren(idx);
          const isCollapsed = collapsed.has(item.id);
          return (
            <li key={item.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {canCollapse ? (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCollapse(item.id); }}
                  aria-label={isCollapsed ? '展开' : '折叠'}
                  style={{
                    flexShrink: 0,
                    width: '16px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--c-texDis)',
                    padding: 0,
                    marginLeft: `${(item.level - 1) * 12}px`,
                  }}
                >
                  {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                </button>
              ) : (
                <span style={{ flexShrink: 0, width: '16px', marginLeft: `${(item.level - 1) * 12}px` }} />
              )}
              <button
                onClick={() => handleClick(item.id)}
                title={item.text}
                style={{
                  flex: 1,
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
                  paddingLeft: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
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
          );
        })}
      </ul>
    </nav>
  );
}
