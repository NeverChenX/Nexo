'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { List, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { EditorTOC } from '@/components/editor/EditorBlockEditor';
import { BacklinksPanel } from '@/components/BacklinksPanel';
import { CommentsPanel } from '@/components/CommentsPanel';

interface EditorRightDrawerProps {
  editor: any;
  articlePath: string;
}

export function EditorRightDrawer({ editor, articlePath }: EditorRightDrawerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => { setOpen(false); }, [articlePath]);

  if (!mounted) return null;

  const handleNavigate = (path: string) => {
    setOpen(false);
    const event = new CustomEvent('nexo:pagelink-click', { detail: { path } });
    window.dispatchEvent(event);
  };

  const drawer = (
    <>
      <button
        type="button"
        className="nx-toc-fab"
        aria-label={t('toc.title')}
        title={t('toc.title')}
        onClick={() => setOpen(true)}
      >
        <List size={18} />
      </button>
      {open && (
        <>
          <div
            className="nx-toc-drawer-overlay"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="nx-toc-drawer"
            role="dialog"
            aria-label={t('toc.title')}
            aria-modal="true"
          >
            <div className="nx-toc-drawer-header">
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-texPri)' }}>
                {t('toc.title')}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="nx-hoverable"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--c-icoSec)',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="nx-toc-drawer-body">
              <EditorTOC editor={editor} />
              <BacklinksPanel articlePath={articlePath} onSelect={handleNavigate} />
              <CommentsPanel articlePath={articlePath} />
            </div>
          </aside>
        </>
      )}
    </>
  );

  return createPortal(drawer, document.body);
}
