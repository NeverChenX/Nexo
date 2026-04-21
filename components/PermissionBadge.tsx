'use client';

import { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, Eye } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type Permission = 'editable' | 'readonly' | 'private';

interface PermissionBadgeProps {
  permission: Permission;
  onChange: (perm: Permission) => void;
}

const PERMS: { key: Permission; icon: typeof Lock; color: string }[] = [
  { key: 'editable', icon: Unlock, color: 'var(--nx-green)' },
  { key: 'readonly', icon: Eye, color: 'var(--nx-orange)' },
  { key: 'private', icon: Lock, color: 'var(--nx-red)' },
];

export function PermissionBadge({ permission, onChange }: PermissionBadgeProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = PERMS.find((p) => p.key === permission) || PERMS[0];
  const Icon = current.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded"
        style={{ color: current.color }}
        title={t('perm.title')}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 py-1 min-w-[140px]"
          style={{
            background: 'var(--c-bacPri)',
            borderRadius: '6px',
            boxShadow: 'var(--c-shaOutMd)',
            border: '1px solid var(--c-borPri)',
          }}
        >
          {PERMS.map((p) => {
            const PIcon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => { onChange(p.key); setOpen(false); }}
                className="nx-hoverable w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
                style={{
                  color: permission === p.key ? p.color : 'var(--c-texSec)',
                  fontWeight: permission === p.key ? 500 : 400,
                }}
              >
                <PIcon className="h-3.5 w-3.5" />
                {t(`perm.${p.key}`)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
