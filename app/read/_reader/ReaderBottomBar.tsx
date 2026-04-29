'use client';

import type { MouseEvent } from 'react';

interface Props {
  visible: boolean;
  prevTitle?: string;
  nextTitle?: string;
  positionN: number; // 1-indexed
  positionTotal: number;
  progress: number; // 0..1
  scrollEl: HTMLElement | null;
  onPrev: () => void;
  onNext: () => void;
}

export function ReaderBottomBar({
  visible,
  prevTitle,
  nextTitle,
  positionN,
  positionTotal,
  progress,
  scrollEl,
  onPrev,
  onNext,
}: Props) {
  const onScrub = (e: MouseEvent<HTMLDivElement>) => {
    if (!scrollEl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = ratio * (scrollEl.scrollHeight - scrollEl.clientHeight);
    scrollEl.scrollTo({ top: target, behavior: 'smooth' });
  };

  return (
    <footer
      className={`rd-bottombar ${visible ? 'rd-bottombar--visible' : ''}`}
      aria-hidden={!visible}
    >
      <div className="rd-bottombar__row">
        <button
          type="button"
          className="rd-bottombar__nav"
          disabled={!prevTitle}
          onClick={onPrev}
        >
          ‹ {prevTitle ?? '上一篇'}
        </button>
        <span className="rd-bottombar__pos">
          第 {positionN} / {positionTotal} 篇
        </span>
        <button
          type="button"
          className="rd-bottombar__nav rd-bottombar__nav--next"
          disabled={!nextTitle}
          onClick={onNext}
        >
          {nextTitle ?? '下一篇'} ›
        </button>
      </div>
      <div
        className="rd-bottombar__bar"
        onClick={onScrub}
        role="slider"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={-1}
      >
        <div className="rd-bottombar__bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </footer>
  );
}
