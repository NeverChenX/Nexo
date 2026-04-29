'use client';

import { useEffect, useRef } from 'react';
import { useReaderUI } from '../ReaderUIContext';

export function useChromeToggle(scrollEl: HTMLElement | null) {
  const { chromeVisible, toggleChrome, setChromeVisible } = useReaderUI();
  const lastScrollTopRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);

  // 1) Click center → toggle (only when not selecting text / not on link)
  useEffect(() => {
    if (!scrollEl) return;
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 4) return;                 // drag/scroll, not click
      const sel = window.getSelection?.();
      if (sel && !sel.isCollapsed) return;   // selecting text
      const t = e.target as HTMLElement;
      if (
        t.closest('a, button, input, textarea, [data-rd-no-toggle]') ||
        t.closest('.rd-codeblock, .rd-resume-toast, .rd-drawer, .rd-topbar, .rd-bottombar')
      ) return;
      toggleChrome();
    };
    scrollEl.addEventListener('pointerdown', onPointerDown);
    scrollEl.addEventListener('pointerup', onPointerUp);
    return () => {
      scrollEl.removeEventListener('pointerdown', onPointerDown);
      scrollEl.removeEventListener('pointerup', onPointerUp);
    };
  }, [scrollEl, toggleChrome]);

  // 2) Scrolling hides chrome; pause for 1.5s after stop → keep visible
  useEffect(() => {
    if (!scrollEl) return;
    const onScroll = () => {
      const top = scrollEl.scrollTop;
      const delta = Math.abs(top - lastScrollTopRef.current);
      lastScrollTopRef.current = top;
      if (delta > 8 && chromeVisible) setChromeVisible(false);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [scrollEl, chromeVisible, setChromeVisible]);
}
