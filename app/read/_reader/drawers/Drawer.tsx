'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  side: 'left' | 'right';
  open: boolean;
  width: number;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
}

export function Drawer({ side, open, width, onClose, children, ariaLabel }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="rd-drawer__overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`rd-drawer rd-drawer--${side} ${open ? 'rd-drawer--open' : ''}`}
        style={{ width: `${width}px` }}
        aria-label={ariaLabel}
        aria-hidden={!open}
      >
        <div className="rd-drawer__head">
          <span>{ariaLabel}</span>
          <button
            type="button"
            className="rd-drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={14} />
          </button>
        </div>
        <div className="rd-drawer__body">{children}</div>
      </aside>
    </>
  );
}
