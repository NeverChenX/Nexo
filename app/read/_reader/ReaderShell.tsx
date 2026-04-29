'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ReaderUIProvider, useReaderUI } from './ReaderUIContext';
import { useReaderPrefs } from './hooks/useReaderPrefs';
import { useArticle } from './hooks/useArticle';
import { useReaderProgress } from './hooks/useReaderProgress';
import { useChromeToggle } from './hooks/useChromeToggle';
import { useReaderHotkeys } from './hooks/useReaderHotkeys';
import { useReaderGestures } from './hooks/useReaderGestures';
import { useChapterNav } from './hooks/useChapterNav';
import { ReaderContent } from './ReaderContent';
import { ReaderEndCard } from './ReaderEndCard';
import { ReaderProgressToast } from './ReaderProgressToast';
import { ReaderTopBar } from './ReaderTopBar';
import { ReaderBottomBar } from './ReaderBottomBar';
import { LeftDrawer } from './drawers/LeftDrawer';
import { RightDrawer } from './drawers/RightDrawer';
import { countWords } from '@/lib/reader/reading-time';
import styles from './reader.module.css';

function Inner({ ids }: { ids: string[] | undefined }) {
  const { prefs } = useReaderPrefs();
  const { data, loading, error } = useArticle(ids);
  const router = useRouter();
  const ui = useReaderUI();

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [endEl, setEndEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setScrollEl(scrollRef.current);
    setEndEl(endRef.current);
  }, [data?.id]);

  const { progress, prevEntry, showResumeToast, dismissToast, resumeToTop } = useReaderProgress({
    articleId: data?.id ?? null,
    articleReady: !loading && !!data,
    scrollEl,
    endSentinel: endEl,
  });
  useChromeToggle(scrollEl);
  useReaderGestures(scrollEl);

  const { prev, next } = useChapterNav(data?.id);
  const totalWords = useMemo(
    () => (data ? countWords(data.content, { stripCode: true }) : 0),
    [data],
  );

  const onChapterJump = useCallback(
    (idChain: string) => router.push(`/read/${idChain}`),
    [router],
  );
  const onInternalLink = useCallback(
    (path: string) => router.push(`/read/${encodeURIComponent(path)}`),
    [router],
  );
  const jumpTop = useCallback(
    () => scrollEl?.scrollTo({ top: 0, behavior: 'smooth' }),
    [scrollEl],
  );
  const jumpEnd = useCallback(
    () => scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' }),
    [scrollEl],
  );
  const resumeToLast = useCallback(() => {
    if (!scrollEl || !prevEntry) return;
    scrollEl.scrollTo({ top: prevEntry.scrollPos, behavior: 'smooth' });
  }, [scrollEl, prevEntry]);

  useReaderHotkeys({
    scrollEl,
    prevChain: prev?.idChain,
    nextChain: next?.idChain,
    onJumpToTop: jumpTop,
    onJumpToEnd: jumpEnd,
    onResumeToLast: resumeToLast,
  });

  const segments = data ? data.path.split('/').filter(Boolean) : [];

  return (
    <div
      className={`${styles.shell} ${styles[`theme-${prefs.theme}`]}`}
      data-font={prefs.font}
      style={{
        ['--rd-font-size' as never]: `${prefs.fontSize}px`,
        ['--rd-line-height' as never]: prefs.lineHeight,
      }}
    >
      <ReaderProgressToast
        progress={prevEntry?.lastReadProgress ?? 0}
        visible={showResumeToast}
        onDismiss={dismissToast}
        onResumeToTop={resumeToTop}
      />
      <ReaderTopBar
        visible={ui.chromeVisible}
        pathSegments={segments}
        progress={progress}
        totalWords={totalWords}
        isFavorite={false /* phase 6 wires real state */}
        onCrumbClick={() => {}}
        onToggleFavorite={() =>
          document.dispatchEvent(new CustomEvent('reader:toggle-favorite'))
        }
      />
      <ReaderBottomBar
        visible={ui.chromeVisible}
        prevTitle={prev?.title}
        nextTitle={next?.title}
        positionN={1 /* TODO: real index in phase 7 */}
        positionTotal={1}
        progress={progress}
        scrollEl={scrollEl}
        onPrev={() => prev && onChapterJump(prev.idChain)}
        onNext={() => next && onChapterJump(next.idChain)}
      />

      <LeftDrawer currentArticleId={data?.id} onSelect={onChapterJump} />
      <RightDrawer scrollEl={scrollEl} contentMd={data?.content} />

      <div ref={scrollRef} className={styles.scroller}>
        <main
          className={`${styles.column} rd-content-root`}
          data-width={prefs.width}
          data-indent={prefs.indent ? 'true' : 'false'}
        >
          {loading && (
            <div style={{ color: 'var(--rd-text-dim)', fontSize: 14, padding: '40px 0' }}>
              加载中…
            </div>
          )}
          {!loading && error && (
            <div
              style={{
                color: '#f87171',
                fontSize: 14,
                padding: '40px 0',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}
          {!loading && !data && !error && (
            <div
              style={{
                color: 'var(--rd-text-dim)',
                textAlign: 'center',
                padding: '80px 0',
              }}
            >
              <p style={{ fontSize: 16, marginBottom: 8 }}>请选择一篇文章</p>
              <p style={{ fontSize: 12 }}>
                按 <kbd>[</kbd> 打开目录
              </p>
            </div>
          )}
          {!loading && data && (
            <>
              <ReaderContent
                content={data.content}
                currentPath={data.path}
                onInternalLink={onInternalLink}
              />
              <ReaderEndCard articleId={data.id} onNavigate={onChapterJump} />
            </>
          )}
          <div ref={endRef} aria-hidden style={{ height: 1 }} />
        </main>
      </div>
    </div>
  );
}

export function ReaderShell({ ids }: { ids: string[] | undefined }) {
  return (
    <ReaderUIProvider>
      <Inner ids={ids} />
    </ReaderUIProvider>
  );
}
