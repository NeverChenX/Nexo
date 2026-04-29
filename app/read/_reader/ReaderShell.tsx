'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderPrefs } from './hooks/useReaderPrefs';
import { useArticle } from './hooks/useArticle';
import { useReaderProgress } from './hooks/useReaderProgress';
import { ReaderContent } from './ReaderContent';
import { ReaderEndCard } from './ReaderEndCard';
import { ReaderProgressToast } from './ReaderProgressToast';
import styles from './reader.module.css';

export function ReaderShell({ ids }: { ids: string[] | undefined }) {
  const { prefs } = useReaderPrefs();
  const { data, loading, error } = useArticle(ids);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [endEl, setEndEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setScrollEl(scrollRef.current);
    setEndEl(endRef.current);
  }, [data?.id]);

  const { prevEntry, showResumeToast, dismissToast, resumeToTop } = useReaderProgress({
    articleId: data?.id ?? null,
    articleReady: !loading && !!data,
    scrollEl,
    endSentinel: endEl,
  });

  const onInternalLink = useCallback(
    (path: string) => router.push(`/read/${encodeURIComponent(path)}`),
    [router],
  );

  const onChapterJump = useCallback(
    (idChain: string) => router.push(`/read/${idChain}`),
    [router],
  );

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
      <div ref={scrollRef} className={styles.scroller}>
        <main
          className={styles.column}
          data-width={prefs.width}
          data-indent={prefs.indent ? 'true' : 'false'}
        >
          {loading && (
            <div style={{ color: 'var(--rd-text-dim)', fontSize: 14, padding: '40px 0' }}>
              加载中…
            </div>
          )}
          {!loading && error && (
            <div style={{ color: '#f87171', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
              {error}
            </div>
          )}
          {!loading && !data && !error && (
            <div style={{ color: 'var(--rd-text-dim)', textAlign: 'center', padding: '80px 0' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>请选择一篇文章</p>
              <p style={{ fontSize: 13 }}>从左抽屉文章树进入（下一阶段实装）</p>
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
