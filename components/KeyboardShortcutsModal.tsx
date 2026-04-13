'use client';

import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  const shortcuts = [
    { keys: `${mod} + S`, desc: t('shortcuts.save') },
    { keys: `${mod} + K`, desc: t('shortcuts.search') },
    { keys: '/', desc: t('shortcuts.slashMenu') },
    { keys: '?', desc: t('shortcuts.help') },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={onClose}>
      <div
        className="w-[360px] overflow-hidden nx-fadein-fast"
        style={{ background: 'var(--c-bacPri)', borderRadius: '10px', boxShadow: 'var(--c-shaOutLg)', border: '1px solid var(--c-borPri)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
          <span className="text-sm" style={{ fontWeight: 500, color: 'var(--c-texPri)' }}>{t('shortcuts.title')}</span>
          <button onClick={onClose} className="nx-hoverable rounded p-0.5" style={{ color: 'var(--c-icoSec)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1">
              <span className="text-sm" style={{ color: 'var(--c-texSec)' }}>{s.desc}</span>
              <kbd
                className="px-2 py-0.5 text-xs rounded"
                style={{
                  background: 'var(--c-bacTer)',
                  color: 'var(--c-texSec)',
                  border: '1px solid var(--c-borPri)',
                  fontFamily: 'inherit',
                }}
              >
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
