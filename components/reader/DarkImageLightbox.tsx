'use client';

import { useState, useEffect } from 'react';

export function DarkImageLightbox({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!src) return null;
  return (
    <>
      <img
        src={src}
        alt={alt || ''}
        onClick={() => setOpen(true)}
        style={{ borderRadius: 4, cursor: 'zoom-in', maxWidth: '100%' }}
      />
      {open && (
        <div
          role="dialog"
          aria-label={alt || 'Image preview'}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={src}
            alt={alt || ''}
            style={{ maxWidth: '92vw', maxHeight: '92vh', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
