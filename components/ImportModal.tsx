'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ImportResult {
  name: string;
  path: string;
  ok: boolean;
  error?: string;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

export function ImportModal({ isOpen, onClose, onImported }: ImportModalProps) {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter((f) => f.name.endsWith('.md'));
    setFiles(selected);
    setResults([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.md'));
    setFiles(dropped);
    setResults([]);
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setImporting(true);
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    try {
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.ok) {
        setResults(json.data);
        onImported?.();
      }
    } catch { /* ignore */ }
    setImporting(false);
  };

  const handleClose = () => {
    setFiles([]);
    setResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)' }} onClick={handleClose}>
      <div
        className="w-[400px] overflow-hidden nx-fadein-fast"
        style={{ background: 'var(--c-bacPri)', borderRadius: '10px', boxShadow: 'var(--c-shaOutLg)', border: '1px solid var(--c-borPri)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-borSec)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ fontWeight: 500, color: 'var(--c-texPri)' }}>
            <Upload className="h-4 w-4" style={{ color: 'var(--c-icoSec)' }} />
            {t('import.title')}
          </div>
          <button onClick={handleClose} className="nx-hoverable rounded p-0.5" style={{ color: 'var(--c-icoSec)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {/* 拖拽区域 */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
            style={{ borderColor: 'var(--c-borPri)', color: 'var(--c-texTer)' }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--nx-blue)'; }}
            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-borPri)'; }}
            onDrop={(e) => { e.currentTarget.style.borderColor = 'var(--c-borPri)'; handleDrop(e); }}
          >
            <Upload className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--c-icoSec)' }} />
            <p className="text-sm">{t('import.dragHint')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--c-texDis)' }}>.md</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* 已选文件 */}
          {files.length > 0 && results.length === 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-texSec)' }}>
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--c-icoSec)' }} />
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* 导入结果 */}
          {results.length > 0 && (
            <div className="mt-3 space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.ok ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#27ae60' }} />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--nx-red)' }} />
                  )}
                  <span className="truncate" style={{ color: r.ok ? 'var(--c-texPri)' : 'var(--nx-red)' }}>
                    {r.name} {r.error ? `— ${r.error}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 pb-4">
          <button onClick={handleClose} className="nx-hoverable px-3 py-1.5 text-sm rounded-md" style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}>
            {t('common.close')}
          </button>
          {results.length === 0 && (
            <button
              disabled={files.length === 0 || importing}
              onClick={handleImport}
              className="px-3 py-1.5 text-sm rounded-md text-white disabled:opacity-40"
              style={{ background: 'var(--nx-blue)' }}
            >
              {importing ? t('import.importing') : t('import.title')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
