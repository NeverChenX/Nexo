'use client';

import { Menu, Star, Settings as SettingsIcon, AlignRight, Command } from 'lucide-react';
import { useReaderUI } from './ReaderUIContext';
import { estimateMinutes } from '@/lib/reader/reading-time';

interface Props {
  visible: boolean;
  pathSegments: string[];
  progress: number; // 0..1
  totalWords: number;
  isFavorite: boolean;
  onCrumbClick: (depth: number) => void;
  onToggleFavorite: () => void;
}

export function ReaderTopBar({
  visible,
  pathSegments,
  progress,
  totalWords,
  isFavorite,
  onCrumbClick,
  onToggleFavorite,
}: Props) {
  const ui = useReaderUI();
  const minsRemaining = Math.max(0, estimateMinutes(totalWords * (1 - progress)) - 1);
  const pct = Math.round(progress * 100);

  return (
    <header className={`rd-topbar ${visible ? 'rd-topbar--visible' : ''}`} aria-hidden={!visible}>
      <button type="button" className="rd-topbar__icon" onClick={ui.toggleLeft} aria-label="目录">
        <Menu size={16} />
      </button>
      <nav className="rd-topbar__crumbs" aria-label="breadcrumbs">
        {pathSegments.map((seg, i, arr) => {
          const last = i === arr.length - 1;
          return (
            <span key={i}>
              {i > 0 && <span className="rd-topbar__crumb-sep">›</span>}
              {last ? (
                <span className="rd-topbar__crumb-current">{seg}</span>
              ) : (
                <button
                  type="button"
                  className="rd-topbar__crumb"
                  onClick={() => onCrumbClick(i)}
                >
                  {seg}
                </button>
              )}
            </span>
          );
        })}
      </nav>
      <div className="rd-topbar__progress">
        {pct}% · 还剩 {minsRemaining} 分钟
      </div>
      <button
        type="button"
        className={`rd-topbar__icon ${isFavorite ? 'rd-topbar__icon--star' : ''}`}
        onClick={onToggleFavorite}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
      >
        <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
      <button type="button" className="rd-topbar__icon" onClick={ui.openCmdk} aria-label="命令面板">
        <Command size={16} />
      </button>
      <button type="button" className="rd-topbar__icon" onClick={ui.openSettings} aria-label="设置">
        <SettingsIcon size={16} />
      </button>
      <button type="button" className="rd-topbar__icon" onClick={ui.toggleRight} aria-label="大纲">
        <AlignRight size={16} />
      </button>
    </header>
  );
}
