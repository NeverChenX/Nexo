'use client';

import { forwardRef } from 'react';
import { useChapterNav } from './hooks/useChapterNav';

interface Props {
  articleId: string;
  override?: { prev?: string; next?: string };
  onNavigate: (idChain: string) => void;
}

export const ReaderEndCard = forwardRef<HTMLDivElement, Props>(function ReaderEndCard(
  { articleId, override, onNavigate },
  ref,
) {
  const { prev, next } = useChapterNav(articleId, override);

  return (
    <div ref={ref} className="rd-endcard">
      <div className="rd-endcard__divider" />
      <div className="rd-endcard__row">
        {prev ? (
          <button
            type="button"
            className="rd-endcard__link rd-endcard__link--prev"
            onClick={() => onNavigate(prev.idChain)}
          >
            <span className="rd-endcard__arrow">←</span>
            <span className="rd-endcard__label">上一章</span>
            <span className="rd-endcard__title">{prev.title}</span>
          </button>
        ) : (
          <span className="rd-endcard__placeholder" />
        )}
        {next ? (
          <button
            type="button"
            className="rd-endcard__link rd-endcard__link--next"
            onClick={() => onNavigate(next.idChain)}
          >
            <span className="rd-endcard__title">{next.title}</span>
            <span className="rd-endcard__label">下一章</span>
            <span className="rd-endcard__arrow">→</span>
          </button>
        ) : (
          <span className="rd-endcard__placeholder" />
        )}
      </div>
      <div className="rd-endcard__finis">— 完 —</div>
    </div>
  );
});
