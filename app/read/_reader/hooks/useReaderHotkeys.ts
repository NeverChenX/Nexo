'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderUI } from '../ReaderUIContext';

export interface UseReaderHotkeysOptions {
  scrollEl: HTMLElement | null;
  prevChain?: string;
  nextChain?: string;
  onJumpToTop: () => void;
  onJumpToEnd: () => void;
  onResumeToLast: () => void;
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    el.isContentEditable === true
  );
}

export function useReaderHotkeys({
  scrollEl,
  prevChain,
  nextChain,
  onJumpToTop,
  onJumpToEnd,
  onResumeToLast,
}: UseReaderHotkeysOptions) {
  const router = useRouter();
  const ui = useReaderUI();

  useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ui.toggleCmdk();
        return;
      }
      // ⌘,  (settings)
      if (meta && e.key === ',') {
        e.preventDefault();
        ui.toggleSettings();
        return;
      }
      // ⌘B  (favorite — wired in phase 6)
      if (meta && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('reader:toggle-favorite'));
        return;
      }
      if (e.key === 'Escape') {
        ui.closeAll();
        return;
      }
      switch (e.key) {
        case '[':
          e.preventDefault();
          ui.toggleLeft();
          return;
        case ']':
          e.preventDefault();
          ui.toggleRight();
          return;
        case 'ArrowLeft':
          if (prevChain) {
            e.preventDefault();
            router.push(`/read/${prevChain}`);
          }
          return;
        case 'ArrowRight':
          if (nextChain) {
            e.preventDefault();
            router.push(`/read/${nextChain}`);
          }
          return;
        case ' ':
          if (scrollEl) {
            e.preventDefault();
            scrollEl.scrollBy({ top: scrollEl.clientHeight * 0.85, behavior: 'smooth' });
          }
          return;
        case 'h':
        case 'H':
          e.preventDefault();
          onResumeToLast();
          return;
        case 'g':
          if (Date.now() - lastG < 400) {
            e.preventDefault();
            onJumpToTop();
            lastG = 0;
          } else {
            lastG = Date.now();
          }
          return;
        case 'e':
        case 'E':
          if (lastG > 0) {
            e.preventDefault();
            onJumpToEnd();
            lastG = 0;
          }
          return;
        case 'f':
        case 'F':
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, ui, scrollEl, prevChain, nextChain, onJumpToTop, onJumpToEnd, onResumeToLast]);
}
