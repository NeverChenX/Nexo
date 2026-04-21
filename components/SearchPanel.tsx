'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useModalFocus } from '@/lib/useModalFocus';

interface SearchResult {
  path: string;
  title: string;
  matchContext: string;
  matchedTerms?: string[];
  score: number;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

const HISTORY_KEY = 'nexo_search_history_v1';
const HISTORY_MAX = 10;

function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : [];
  } catch { return []; }
}

function saveHistory(list: string[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch { /* ignore */ }
}

// 关键词高亮（ReactNode 返回）
function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (!terms || terms.length === 0) return <>{text}</>;
  // 把所有 terms 转义后合成一个 regex（unique + 长度排序避免短匹盖长）
  const uniq = Array.from(new Set(terms.filter(Boolean))).sort((a, b) => b.length - a.length);
  if (uniq.length === 0) return <>{text}</>;
  const escaped = uniq.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 1) {
          return (
            <mark
              key={i}
              style={{
                background: 'rgba(255,220,73,0.5)',
                color: 'inherit',
                padding: '0 1px',
                borderRadius: '2px',
              }}
            >
              {p}
            </mark>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function SearchPanel({ isOpen, onClose, onSelect }: SearchPanelProps) {
  const { t } = useI18n();
  useModalFocus(isOpen);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setHistory(loadHistory());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const recordHistory = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, HISTORY_MAX);
    setHistory(next);
    saveHistory(next);
  }, [history]);

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
      /* ignore */
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
    recordHistory(query);
    onSelect(path);
    onClose();
  };

  const useHistoryItem = (q: string) => {
    setQuery(q);
    doSearch(q);
    inputRef.current?.focus();
  };

  const removeHistoryItem = (q: string) => {
    const next = history.filter((h) => h !== q);
    setHistory(next);
    saveHistory(next);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
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

  useEffect(() => {
    if (results.length === 0) { if (activeIndex !== 0) setActiveIndex(0); return; }
    if (activeIndex >= results.length) setActiveIndex(results.length - 1);
  }, [results, activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={onClose}>
      <div
        className="w-full max-w-[560px] overflow-hidden nx-fadein-fast"
        style={{
          background: 'var(--c-bacPri)',
          borderRadius: '10px',
          boxShadow: 'var(--c-shaOutLg)',
          border: '1px solid var(--c-borPri)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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

        {/* 布尔运算提示 */}
        {!query.trim() && (
          <div style={{ padding: '6px 16px', fontSize: '11px', color: 'var(--c-texDis)', borderBottom: '1px solid var(--c-borSec)' }}>
            支持 <code style={{ background: 'var(--c-bacTer)', padding: '1px 4px', borderRadius: '3px' }}>AND</code> / <code style={{ background: 'var(--c-bacTer)', padding: '1px 4px', borderRadius: '3px' }}>OR</code> / <code style={{ background: 'var(--c-bacTer)', padding: '1px 4px', borderRadius: '3px' }}>NOT</code>（或 <code style={{ background: 'var(--c-bacTer)', padding: '1px 4px', borderRadius: '3px' }}>-词</code>）
          </div>
        )}

        {loading && (
          <div style={{ height: '2px', background: 'var(--c-borSec)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'var(--nx-blue)', animation: 'nx-progress-slide 1.1s ease-in-out infinite' }} />
          </div>
        )}

        {/* 空态：搜索历史 */}
        {!query.trim() && history.length > 0 && (
          <div className="py-1 max-h-[340px] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-1.5">
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--c-texTer)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>最近搜索</span>
              <button onClick={clearHistory} className="nx-hoverable px-1.5 py-0.5 rounded" style={{ fontSize: '11px', color: 'var(--c-texDis)' }}>
                清空
              </button>
            </div>
            {history.map((h) => (
              <div
                key={h}
                className="w-full group flex items-center gap-2 px-4 py-1.5"
                style={{ fontSize: '13px', color: 'var(--c-texSec)' }}
              >
                <Clock size={12} style={{ color: 'var(--c-icoTer)' }} />
                <button
                  onClick={() => useHistoryItem(h)}
                  className="nx-hoverable flex-1 text-left rounded px-1 py-0.5"
                  style={{ color: 'var(--c-texSec)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  {h}
                </button>
                <button
                  onClick={() => removeHistoryItem(h)}
                  className="nx-hoverable rounded p-0.5 opacity-0 group-hover:opacity-100"
                  style={{ color: 'var(--c-icoSec)' }}
                  aria-label="移除此历史"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 结果列表 */}
        {query.trim() && (
          <div className="max-h-[360px] overflow-y-auto py-1">
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
                style={{ background: i === activeIndex ? 'var(--ca-butHovBac)' : undefined }}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(item.path)}
              >
                <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-icoSec)' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate" style={{ color: 'var(--c-texPri)', fontWeight: 500 }}>
                    <Highlighted text={item.title} terms={item.matchedTerms || []} />
                  </div>
                  {item.matchContext && item.matchContext !== item.title && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--c-texTer)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      <Highlighted text={item.matchContext} terms={item.matchedTerms || []} />
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
