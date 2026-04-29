'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderUI } from '../ReaderUIContext';
import { useCmdkSearch } from './useCmdkSearch';
import type { Result } from './types';

interface Props {
  currentArticleId?: string;
}

export function CommandPalette({ currentArticleId }: Props) {
  const ui = useReaderUI();
  const router = useRouter();
  const { search, groupResults } = useCmdkSearch(currentArticleId);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ui.cmdkOpen) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [ui.cmdkOpen]);

  const results = useMemo(() => search(query), [search, query]);
  const groups = useMemo(
    () => groupResults(results),
    [results, groupResults],
  );
  const flat = useMemo<Result[]>(
    () => groups.flatMap((g) => g.items),
    [groups],
  );

  // Reset selection when results change
  useEffect(() => {
    setActive(0);
  }, [query, flat.length]);

  const onPick = (r: Result): void => {
    ui.closeCmdk();
    switch (r.category) {
      case 'article':
        router.push(`/read/${r.idChain}`);
        return;
      case 'favorite':
        if (r.idChain) router.push(`/read/${r.idChain}`);
        return;
      case 'note':
      case 'thought': {
        const ax = r.articleId;
        if (ax) router.push(`/read/${ax}`);
        // 跳转后通过自定义事件触发 anchor 滚动
        const evt = new CustomEvent('reader:goto-anchor', {
          detail: { quote: r.anchor.quote || r.label },
        });
        setTimeout(() => document.dispatchEvent(evt), 800);
        return;
      }
      case 'command':
        void r.run();
        return;
    }
  };

  if (!ui.cmdkOpen) return null;

  return (
    <div
      className="rd-cmdk__overlay"
      onClick={ui.closeCmdk}
      data-rd-no-toggle="true"
      role="dialog"
      aria-label="命令面板"
    >
      <div className="rd-cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="rd-cmdk__input"
          placeholder="搜文章 / 跳笔记 / 收藏的内容 / 命令…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(flat.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const r = flat[active];
              if (r) onPick(r);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              ui.closeCmdk();
            }
          }}
        />
        <div className="rd-cmdk__results">
          {groups.length === 0 && (
            <p className="rd-cmdk__empty">没有结果。</p>
          )}
          {groups.map((g) => (
            <div key={g.category}>
              <div className="rd-cmdk__group-label">{g.category}</div>
              {g.items.map((r) => {
                const flatIdx = flat.indexOf(r);
                const isActive = flatIdx === active;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`rd-cmdk__row ${isActive ? 'rd-cmdk__row--active' : ''}`}
                    onMouseEnter={() => setActive(flatIdx)}
                    onClick={() => onPick(r)}
                  >
                    <span className="rd-cmdk__label">{r.label}</span>
                    {r.hint && (
                      <span className="rd-cmdk__hint">{r.hint}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="rd-cmdk__footer">
          <kbd>↑</kbd> <kbd>↓</kbd> 选 · <kbd>Enter</kbd> 确认 ·{' '}
          <kbd>Esc</kbd> 关闭
        </div>
      </div>
    </div>
  );
}
