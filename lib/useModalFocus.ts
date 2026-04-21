import { useEffect, useRef } from 'react';

/**
 * Modal 打开时记录当前 activeElement，关闭时恢复焦点。
 * 消灭"关掉 modal 后必须先点一下编辑器才能用 Ctrl+K"这类体验问题。
 */
export function useModalFocus(isOpen: boolean): void {
  const prevFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
      return;
    }
    const el = prevFocusRef.current;
    if (!el) return;
    // 延迟一帧，避开 modal 卸载 / 子元素 blur 与 restore 的竞争
    const id = window.requestAnimationFrame(() => {
      try {
        if (document.contains(el)) el.focus();
      } catch {
        /* ignore */
      }
    });
    prevFocusRef.current = null;
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);
}
