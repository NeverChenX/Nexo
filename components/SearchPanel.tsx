'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface SearchResult {
  path: string;
  title: string;
  matchContext: string;
  score: number;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export function SearchPanel({ isOpen, onClose, onSelect }: SearchPanelProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`);
      const json = await res.json();
      if (json.ok) {
        setResults(json.data);
        setActiveIndex(0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(value), 250);
  };

  const handleSelect = (path: string) => {
    onSelect(path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && results[activeIndex]) {
      handleSelect(results[activeIndex].path);
    }
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={onClose}>
      <div
        className="w-full max-w-[520px] overflow-hidden nx-fadein-fast"
        style={{
          background: 'var(--c-bacPri)',
          borderRadius: '10px',
          boxShadow: 'var(--c-shaOutLg)',
          border: '1px solid var(--c-borPri)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索输入 */}
        <div className="flex items-center gap-2 px-4" style={{ height: '48px', borderBottom: '1px solid var(--c-borSec)' }}>
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--c-icoSec)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--c-texPri)' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }} className="nx-hoverable p-0.5 rounded" style={{ color: 'var(--c-icoSec)' }}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 结果列表 */}
        {query.trim() && (
          <div className="max-h-[340px] overflow-y-auto py-1">
            {loading && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--c-texTer)' }}>
                {t('common.loading')}
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--c-texTer)' }}>
                {t('search.noResults')}
              </div>
            )}
            {results.map((item, i) => (
              <button
                key={item.path}
                className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
                style={{
                  background: i === activeIndex ? 'var(--ca-butHovBac)' : undefined,
                }}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(item.path)}
              >
                <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-icoSec)' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate" style={{ color: 'var(--c-texPri)', fontWeight: 500 }}>
                    {item.title}
                  </div>
                  {item.matchContext && item.matchContext !== item.title && (
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--c-texTer)' }}>
                      {item.matchContext}
                    </div>
                  )}
                  <div className="text-xs mt-0.5" style={{ color: 'var(--c-texDis)' }}>
                    {item.path}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
