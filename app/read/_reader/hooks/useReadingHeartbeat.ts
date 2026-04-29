'use client';

import { useEffect, useRef } from 'react';
import { sendHeartbeat } from '@/lib/reader/storage-client';

const TICK_MS = 30_000;
const ACTIVITY_WINDOW_MS = 30_000;

/**
 * 阅读心跳：每 30s 在 (visible && active) 条件下向后端 stats 累加阅读时长。
 * - visible: document.visibilityState === 'visible'
 * - active:  最近一次 scroll/mousemove/keydown/touchstart 在窗口内
 */
export function useReadingHeartbeat(articleId: string | null): void {
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    const bump = () => {
      lastActiveRef.current = Date.now();
    };
    window.addEventListener('scroll', bump, { passive: true });
    window.addEventListener('mousemove', bump);
    window.addEventListener('keydown', bump);
    window.addEventListener('touchstart', bump, { passive: true });
    return () => {
      window.removeEventListener('scroll', bump);
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('touchstart', bump);
    };
  }, []);

  useEffect(() => {
    if (!articleId) return;
    const handle = window.setInterval(() => {
      const visible = document.visibilityState === 'visible';
      const active = Date.now() - lastActiveRef.current < ACTIVITY_WINDOW_MS;
      if (visible && active) {
        void sendHeartbeat(articleId, TICK_MS);
      }
    }, TICK_MS);
    return () => window.clearInterval(handle);
  }, [articleId]);
}
