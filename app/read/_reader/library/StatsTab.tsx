'use client';

import { useEffect, useState } from 'react';
import { getStats } from '@/lib/reader/storage-client';
import type { Stats } from '@/lib/reader/types';
import { Heatmap } from './Heatmap';

export function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="rd-lib__empty">加载中…</p>;
  if (!stats) {
    return <p className="rd-lib__empty">暂无统计数据。</p>;
  }

  const totalArticles = Object.keys(stats.articleStats).length;
  const totalReads = Object.values(stats.articleStats).reduce(
    (s, x) => s + x.reads,
    0,
  );
  const totalMs = Object.values(stats.articleStats).reduce(
    (s, x) => s + x.totalMs,
    0,
  );
  const dayCount = Math.max(1, Object.keys(stats.dailyMinutes).length);
  const avgMinPerDay =
    Object.values(stats.dailyMinutes).reduce((s, m) => s + m, 0) / dayCount;

  return (
    <div>
      <Heatmap dailyMinutes={stats.dailyMinutes} />
      <ul className="rd-stats-list">
        <li>
          <span>读过文章</span>
          <b>{totalArticles}</b>
        </li>
        <li>
          <span>总阅读次</span>
          <b>{totalReads}</b>
        </li>
        <li>
          <span>总阅读时长</span>
          <b>{(totalMs / 60000).toFixed(1)} 分</b>
        </li>
        <li>
          <span>平均每日</span>
          <b>{avgMinPerDay.toFixed(1)} 分</b>
        </li>
      </ul>
    </div>
  );
}
