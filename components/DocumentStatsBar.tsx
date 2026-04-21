'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { computeStats } from '@/lib/doc-stats';

interface DocumentStatsBarProps {
  content: string;
}

export function DocumentStatsBar({ content }: DocumentStatsBarProps) {
  const { t } = useI18n();
  const stats = useMemo(() => computeStats(content), [content]);

  if (stats.wordCount === 0) return null;

  return (
    <div
      className="flex items-center gap-4 px-4 flex-shrink-0"
      style={{
        height: '28px',
        borderTop: '1px solid var(--c-borSec)',
        background: 'var(--c-bacPri)',
        fontSize: '12px',
        color: 'var(--c-texTer)',
      }}
    >
      <span>{t('statsBar.words', { count: stats.wordCount })}</span>
      <span>{t('statsBar.chars', { count: stats.charCount })}</span>
      <span>{t('statsBar.charsNoSpace', { count: stats.charCountNoSpaces })}</span>
      <span>{t('statsBar.paragraphs', { count: stats.paragraphCount })}</span>
      <span>{t('statsBar.readTime', { min: stats.readingTimeMin })}</span>
    </div>
  );
}
