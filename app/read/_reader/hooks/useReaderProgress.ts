'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getHistoryEntry,
  upsertHistoryEntry,
  type HistoryEntry,
} from '@/lib/reader/storage-client';

export interface UseReaderProgressOptions {
  articleId: string | null;
  articleReady: boolean;
  scrollEl: HTMLElement | null;
  endSentinel: HTMLElement | null;
}

export interface UseReaderProgressResult {
  progress: number; // 0..1, live
  prevEntry: HistoryEntry | null;
  showResumeToast: boolean;
  dismissToast: () => void;
  resumeToTop: () => void;
}

export function useReaderProgress({
  articleId,
  articleReady,
  scrollEl,
  endSentinel,
}: UseReaderProgressOptions): UseReaderProgressResult {
  const [progress, setProgress] = useState(0);
  const [prevEntry, setPrevEntry] = useState<HistoryEntry | null>(null);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const lastWriteRef = useRef(0);
  const resumedRef = useRef(false);

  // 1) Load prev entry & schedule resume
  useEffect(() => {
    resumedRef.current = false;
    setShowResumeToast(false);
    setPrevEntry(null);
    if (!articleId) return;
    let cancelled = false;
    getHistoryEntry(articleId).then((e) => {
      if (cancelled) return;
      setPrevEntry(e);
      // accumulate read counter
      void upsertHistoryEntry(articleId, {
        lastReadAt: Date.now(),
        reads: (e?.reads ?? 0) + 1,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // 2) Restore scroll once article is ready
  useEffect(() => {
    if (!articleReady || resumedRef.current) return;
    // 无历史记录时直接标记完成；scrollEl 尚未挂载时则等待下一次 effect
    if (!prevEntry) {
      resumedRef.current = true;
      return;
    }
    if (!scrollEl) return;
    const { lastReadProgress, scrollPos } = prevEntry;
    let toastTimer: number | null = null;
    if (lastReadProgress >= 0.05 && lastReadProgress < 0.95) {
      requestAnimationFrame(() => {
        scrollEl.scrollTo({ top: scrollPos, behavior: 'auto' });
        setShowResumeToast(true);
        // H9: store the timer id so cleanup can clear it; previously left
        // dangling timers would fire on the *next* article and flash a stale
        // "resume" toast.
        toastTimer = window.setTimeout(() => setShowResumeToast(false), 3000);
      });
    }
    resumedRef.current = true;
    return () => {
      if (toastTimer !== null) window.clearTimeout(toastTimer);
    };
  }, [articleReady, scrollEl, prevEntry]);

  // 3) Track scroll → throttled history write + H2: visibilitychange flush
  useEffect(() => {
    if (!articleId || !scrollEl) return;
    const lastPosRef = { current: { pr: 0, scrollPos: 0 } };

    const onScroll = () => {
      const max = scrollEl.scrollHeight - scrollEl.clientHeight;
      const pr = max > 0 ? scrollEl.scrollTop / max : 0;
      setProgress(pr);
      lastPosRef.current = { pr, scrollPos: scrollEl.scrollTop };
      const now = Date.now();
      if (now - lastWriteRef.current > 5000) {
        lastWriteRef.current = now;
        void upsertHistoryEntry(articleId, {
          lastReadAt: now,
          lastReadProgress: pr,
          scrollPos: scrollEl.scrollTop,
        });
      }
    };

    // H2: flush position when the tab goes background or page unloads so the
    // last ~5s of scrolling is never lost (mobile app switch, laptop close).
    // Prefer sendBeacon (still flushes during pagehide); fall back to a
    // best-effort fetch.
    const flush = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < 500) return;
      lastWriteRef.current = now;
      const { pr, scrollPos } = lastPosRef.current;
      const payload = JSON.stringify({
        articleId,
        lastReadAt: now,
        lastReadProgress: pr,
        scrollPos,
      });
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/reader/history', blob);
          return;
        }
      } catch {
        /* fall through to fetch */
      }
      void upsertHistoryEntry(articleId, {
        lastReadAt: now,
        lastReadProgress: pr,
        scrollPos,
      });
    };
    const onVisibilityChange = () => {
      if (document.hidden) flush();
    };
    const onPageHide = () => flush();

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [articleId, scrollEl]);

  // 4) End sentinel triggers completion
  useEffect(() => {
    if (!articleId || !endSentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void upsertHistoryEntry(articleId, {
            completedAt: Date.now(),
            lastReadProgress: 1,
          });
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(endSentinel);
    return () => obs.disconnect();
  }, [articleId, endSentinel]);

  const dismissToast = useCallback(() => setShowResumeToast(false), []);
  const resumeToTop = useCallback(() => {
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
    setShowResumeToast(false);
  }, [scrollEl]);

  return { progress, prevEntry, showResumeToast, dismissToast, resumeToTop };
}
