'use client';

import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, X, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface TrashItem {
  id: string;
  originalPath: string;
  isFolder: boolean;
  deletedAt: string;
  name: string;
}

interface TrashPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: () => void;
}

export function TrashPanel({ isOpen, onClose, onRestore }: TrashPanelProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  useEffect(() => {
    if (isOpen) loadTrash();
  }, [isOpen]);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trash');
      const json = await res.json();
      if (json.ok) setItems(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        onRestore?.();
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/trash?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ }
  };

  const handleEmptyTrash = async () => {
    setConfirmEmpty(false);
    try {
      const res = await fetch('/api/trash?id=all', { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) setItems([]);
    } catch { /* ignore */ }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)' }} onClick={onClose}>
      <div
        className="w-[440px] max-h-[70vh] flex flex-col overflow-hidden nx-fadein-fast"
        style={{
          background: 'var(--c-bacPri)',
          borderRadius: '10px',
          boxShadow: 'var(--c-shaOutLg)',
          border: '1px solid var(--c-borPri)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ fontWeight: 500, color: 'var(--c-texPri)' }}>
            <Trash2 className="h-4 w-4" style={{ color: 'var(--c-icoSec)' }} />
            {t('trash.title')}
            {items.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--c-texTer)' }}>({items.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="nx-hoverable px-2 py-1 rounded text-xs"
                style={{ color: 'var(--nx-red)' }}
              >
                {t('trash.emptyTrash')}
              </button>
            )}
            <button onClick={onClose} className="nx-hoverable rounded p-0.5" style={{ color: 'var(--c-icoSec)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--c-texTer)' }}>{t('common.loading')}</div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--c-texTer)' }}>{t('trash.empty')}</div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5 gap-3"
              style={{ borderBottom: '1px solid var(--c-borSec)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate" style={{ color: 'var(--c-texPri)' }}>{item.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--c-texDis)' }}>
                  {item.originalPath} · {formatDate(item.deletedAt)}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleRestore(item.id)}
                  className="nx-hoverable p-1 rounded"
                  style={{ color: 'var(--c-icoSec)' }}
                  title={t('trash.restore')}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="nx-hoverable-danger p-1 rounded"
                  style={{ color: 'var(--c-icoSec)' }}
                  title={t('trash.deletePermanently')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 确认清空弹窗 */}
        {confirmEmpty && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '10px' }}>
            <div className="p-5 w-[300px]" style={{ background: 'var(--c-bacPri)', borderRadius: '8px', boxShadow: 'var(--c-shaOutLg)', border: '1px solid var(--c-borPri)' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4" style={{ color: 'var(--nx-red)' }} />
                <span className="text-sm" style={{ fontWeight: 500, color: 'var(--c-texPri)' }}>{t('trash.emptyTrash')}</span>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--c-texSec)' }}>{t('trash.confirmEmpty')}</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmEmpty(false)} className="nx-hoverable px-3 py-1.5 text-sm rounded-md" style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}>
                  {t('common.cancel')}
                </button>
                <button onClick={handleEmptyTrash} className="px-3 py-1.5 text-sm rounded-md text-white" style={{ background: 'var(--nx-red)' }}>
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
