'use client';

import { useEffect, useRef, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { defaultTemplates, getTemplateContent } from '@/lib/templates';

interface CreateArticleModalProps {
  isOpen: boolean;
  parentPath: string;
  onConfirm: (name: string, templateContent?: string) => void;
  onClose: () => void;
}

export function CreateArticleModal({ isOpen, parentPath, onConfirm, onClose }: CreateArticleModalProps) {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedTemplate('blank');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (/[\/\\]/.test(trimmed) || trimmed === '..' || trimmed === '.') return;
    const content = getTemplateContent(selectedTemplate, trimmed);
    onConfirm(trimmed, content);
    setName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.15)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[360px] p-5"
        style={{
          background: 'var(--c-bacPri)',
          borderRadius: '8px',
          boxShadow: 'var(--c-shaOutLg)',
          border: '1px solid var(--c-borPri)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: 'var(--c-icoSec)' }} />
            <span className="text-sm" style={{ fontWeight: 500, color: 'var(--c-texPri)' }}>{t('createModal.title')}</span>
          </div>
          <button
            className="nx-hoverable w-6 h-6 flex items-center justify-center rounded"
            style={{ color: 'var(--c-icoSec)' }}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {parentPath && (
          <p className="text-xs mb-3 truncate" style={{ color: 'var(--c-texTer)' }}>
            {t('createModal.location', { path: parentPath })}
          </p>
        )}

        <input
          ref={inputRef}
          type="text"
          className="w-full px-3 py-2 text-sm rounded-md mb-3"
          style={{
            border: '1px solid var(--c-borPri)',
            background: 'var(--c-bacPri)',
            color: 'var(--c-texPri)',
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--c-bacPri), 0 0 0 4px var(--nx-blue)'; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          placeholder={t('createModal.placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* 模板选择 */}
        <div className="mb-4">
          <p className="text-xs mb-2" style={{ color: 'var(--c-texTer)', fontWeight: 500 }}>{t('template.select')}</p>
          <div className="flex flex-wrap gap-1.5">
            {defaultTemplates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl.id)}
                className="px-2.5 py-1 text-xs rounded-md transition-colors"
                style={{
                  border: selectedTemplate === tmpl.id ? '1px solid var(--nx-blue)' : '1px solid var(--c-borPri)',
                  background: selectedTemplate === tmpl.id ? 'rgba(35,131,226,0.06)' : 'var(--c-bacPri)',
                  color: selectedTemplate === tmpl.id ? 'var(--nx-blue)' : 'var(--c-texSec)',
                  fontWeight: selectedTemplate === tmpl.id ? 500 : 400,
                }}
              >
                {t(tmpl.nameKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="nx-hoverable px-3 py-1.5 text-sm rounded-md"
            style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={!name.trim()}
            onClick={handleConfirm}
            className="px-3 py-1.5 text-sm rounded-md transition-colors text-white disabled:opacity-40"
            style={{ background: 'var(--nx-blue)' }}
          >
            {t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
