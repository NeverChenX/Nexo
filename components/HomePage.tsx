'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Plus, Star, BarChart3 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getRecentDocs, RecentItem } from '@/lib/recent';
import { getFavorites, getFavoritesByGroup, FavoriteItem } from '@/lib/favorites';

interface HomeStats {
  totalDocs: number;
  totalWords: number;
  totalTags: number;
  totalFolders: number;
  recentlyUpdated: {
    path: string;
    title: string;
    wordCount: number;
    updatedAt: string;
  }[];
}

interface HomePageProps {
  onSelectItem: (path: string, idChain?: string) => void;
  onCreateArticle: () => void;
  onSearchClick: () => void;
  onImportClick?: () => void;
  onGraphClick?: () => void;
  onGenerateReport?: (period: 'week' | 'month' | 'year') => void;
}

function formatRelativeTime(timestamp: number | string, t: (k: string, vars?: Record<string, string | number>) => string): string {
  const now = Date.now();
  const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = now - ts;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { n: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { n: hours });

  const days = Math.floor(hours / 24);
  if (days < 30) return t('time.daysAgo', { n: days });

  const months = Math.floor(days / 30);
  if (months < 12) return t('time.monthsAgo', { n: months });

  return t('time.yearsAgo', { n: Math.floor(months / 12) });
}

/* ── Notion 风格文档行 ── */
function DocRow({
  title,
  meta,
  onClick,
}: {
  title: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="nx-hoverable"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        borderRadius: '4px',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <FileText style={{ width: '16px', height: '16px', color: 'rgba(55,53,47,0.45)', flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: '14px',
          color: 'rgb(55,53,47)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: '1.5',
        }}
      >
        {title}
      </span>
      {meta && (
        <span style={{ fontSize: '12px', color: 'rgba(55,53,47,0.4)', flexShrink: 0 }}>{meta}</span>
      )}
    </button>
  );
}

export function HomePage({
  onSelectItem,
  onCreateArticle,
  onSearchClick,
  onGenerateReport,
}: HomePageProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRecentDocs(getRecentDocs().slice(0, 10));
    setFavorites(getFavorites().slice(0, 8));

    fetch('/api/home-stats')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setStats(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto animate-pulse" style={{ background: 'var(--c-bacPri)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 96px 120px' }}>
          <div style={{ height: '40px', width: '40%', background: 'var(--c-bacTer)', borderRadius: '4px', marginBottom: '8px' }} />
          <div style={{ height: '14px', width: '30%', background: 'var(--c-borSec)', borderRadius: '4px', marginBottom: '40px' }} />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '48px' }}>
            <div style={{ height: '28px', width: '96px', background: 'var(--c-bacTer)', borderRadius: '4px' }} />
            <div style={{ height: '28px', width: '120px', background: 'var(--c-bacTer)', borderRadius: '4px' }} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: '28px', background: 'var(--c-borSec)', borderRadius: '4px', marginBottom: '6px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--c-bacPri)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 96px 120px' }}>
        {/* ── 标题 ── */}
        <h1
          style={{
            fontSize: '40px',
            fontWeight: 700,
            color: 'rgb(55, 53, 47)',
            marginBottom: '4px',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {t('home.welcome')}
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(55,53,47,0.5)', marginBottom: '40px' }}>
          {t('home.subtitle')}
        </p>

        {/* ── 快捷操作（只保留新建+搜索） ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '48px' }}>
          <button
            onClick={onCreateArticle}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              background: 'rgb(35, 131, 226)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus style={{ width: '14px', height: '14px' }} />
            {t('home.newDoc')}
          </button>
          <button
            onClick={onSearchClick}
            className="nx-hoverable"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              color: 'rgba(55,53,47,0.65)',
              background: 'transparent',
              border: '1px solid rgba(55,53,47,0.16)',
              cursor: 'pointer',
            }}
          >
            <Search style={{ width: '14px', height: '14px' }} />
            {t('common.search')}
            <kbd
              style={{
                fontSize: '12px',
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'rgba(55,53,47,0.06)',
                color: 'rgba(55,53,47,0.45)',
                marginLeft: '4px',
              }}
            >
              ⌘K
            </kbd>
          </button>
          {onGenerateReport && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => onGenerateReport('week')}
                className="nx-hoverable"
                title="生成本周报告"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: 'rgba(55,53,47,0.65)',
                  background: 'transparent',
                  border: '1px solid rgba(55,53,47,0.16)',
                  cursor: 'pointer',
                }}
              >
                <BarChart3 style={{ width: '14px', height: '14px' }} />
                生成周报
              </button>
            </div>
          )}
        </div>

        {/* ── 收藏（分组） ── */}
        {favorites.length > 0 && (() => {
          const grouped = getFavoritesByGroup();
          const groupNames = Object.keys(grouped).sort((a, b) => {
            if (a === '') return 1;
            if (b === '') return -1;
            return a.localeCompare(b);
          });
          return (
            <section style={{ marginBottom: '40px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'rgba(55,53,47,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                paddingLeft: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Star style={{ width: '12px', height: '12px' }} />
                {t('home.favorites')}
              </div>
              {groupNames.map((groupName) => (
                <div key={groupName || '__ungrouped'} style={{ marginBottom: groupNames.length > 1 ? '12px' : '0' }}>
                  {groupNames.length > 1 && (
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'rgba(55,53,47,0.35)',
                      paddingLeft: '8px',
                      marginBottom: '2px',
                      marginTop: '4px',
                    }}>
                      {groupName || t('favGroup.ungrouped')}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {grouped[groupName].map((fav) => (
                      <DocRow
                        key={fav.path}
                        title={fav.title || fav.path.split('/').pop() || ''}
                        meta={formatRelativeTime(fav.addedAt, t)}
                        onClick={() => onSelectItem(fav.path)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })()}

        {/* ── 最近访问 ── */}
        {recentDocs.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(55,53,47,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px',
              paddingLeft: '8px',
            }}>
              {t('home.recentVisited')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {recentDocs.map((doc) => (
                <DocRow
                  key={doc.path}
                  title={doc.title || doc.path.split('/').pop() || ''}
                  meta={formatRelativeTime(doc.timestamp, t)}
                  onClick={() => onSelectItem(doc.path, doc.idChain)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 最近更新（来自服务端） ── */}
        {stats && stats.recentlyUpdated.length > 0 && (
          <section>
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(55,53,47,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px',
              paddingLeft: '8px',
            }}>
              {t('home.recentUpdated')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {stats.recentlyUpdated.slice(0, 10).map((doc) => (
                <DocRow
                  key={doc.path}
                  title={doc.title}
                  meta={formatRelativeTime(doc.updatedAt, t)}
                  onClick={() => onSelectItem(doc.path)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
