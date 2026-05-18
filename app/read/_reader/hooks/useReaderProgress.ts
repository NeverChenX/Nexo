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
    if (lastReadProgress >= 0.05 && lastReadProgress < 0.95) {
      requestAnimationFrame(() => {
        scrollEl.scrollTo({ top: scrollPos, behavior: 'auto' });
        setShowResumeToast(true);
        window.setTimeout(() => setShowResumeToast(false), 3000);
      });
    }
    resumedRef.current = true;
  }, [articleReady, scrollEl, prevEntry]);

  // 3) Track scroll → throttled history write
  useEffect(() => {
    if (!articleId || !scrollEl) return;
    const onScroll = () => {
      const max = scrollEl.scrollHeight - scrollEl.clientHeight;
      const pr = max > 0 ? scrollEl.scrollTop / max : 0;
      setProgress(pr);
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
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
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
