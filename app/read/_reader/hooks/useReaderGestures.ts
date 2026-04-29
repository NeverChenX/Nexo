'use client';

import { useEffect } from 'react';
import { useReaderUI } from '../ReaderUIContext';

const EDGE_PX = 24;
const MIN_SWIPE_DX = 60;
const MAX_SWIPE_DY = 50;

export function useReaderGestures(scrollEl: HTMLElement | null) {
  const ui = useReaderUI();
  useEffect(() => {
    if (!scrollEl) return;
    let startX = 0;
    let startY = 0;
    let edge: 'left' | 'right' | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      const w = window.innerWidth;
      if (startX < EDGE_PX) edge = 'left';
      else if (startX > w - EDGE_PX) edge = 'right';
      else edge = null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!edge) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dy > MAX_SWIPE_DY) return;
      if (edge === 'left' && dx > MIN_SWIPE_DX) ui.openLeft();
      else if (edge === 'right' && -dx > MIN_SWIPE_DX) ui.openRight();
    };
    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      scrollEl.removeEventListener('touchstart', onTouchStart);
      scrollEl.removeEventListener('touchend', onTouchEnd);
    };
  }, [scrollEl, ui]);
}
