'use client';

import { useMemo } from 'react';
import { useReaderUI } from '../ReaderUIContext';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import { Drawer } from './Drawer';
import { OutlineTab } from './OutlineTab';
import { countWords, estimateMinutes } from '@/lib/reader/reading-time';

interface Props {
  scrollEl: HTMLElement | null;
  contentMd?: string;
}

export function RightDrawer({ scrollEl, contentMd }: Props) {
  const ui = useReaderUI();
  const { prefs } = useReaderPrefs();
  const { words, minutes } = useMemo(() => {
    if (!contentMd) return { words: 0, minutes: 0 };
    const w = countWords(contentMd, { stripCode: true });
    return { words: w, minutes: estimateMinutes(w) };
  }, [contentMd]);

  return (
    <Drawer
      side="right"
      open={ui.rightOpen}
      width={prefs.rightDrawerWidth}
      onClose={ui.closeRight}
      ariaLabel="文章大纲"
    >
      <div className="rd-drawer__meta">
        <span>{words.toLocaleString()} 字</span>
        <span>·</span>
        <span>{minutes} 分钟</span>
      </div>
      <OutlineTab scrollEl={scrollEl} contentSelector=".rd-content-root" />
      <div className="rd-drawer__backlinks">
        <span className="rd-drawer__section-title">反向链接</span>
        <p style={{ color: 'var(--rd-text-dim)', fontSize: 11, padding: '0 12px' }}>
          反链将在 phase 7 接入。
        </p>
      </div>
    </Drawer>
  );
}
