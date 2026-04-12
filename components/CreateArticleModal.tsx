'use client';

import { useEffect, useRef, useState } from 'react';
import { X, FileText } from 'lucide-react';

interface CreateArticleModalProps {
  isOpen: boolean;
  parentPath: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export function CreateArticleModal({ isOpen, parentPath, onConfirm, onClose }: CreateArticleModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.15)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-80 p-5"
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
            <span className="text-sm" style={{ fontWeight: 500, color: 'var(--c-texPri)' }}>新建文档</span>
          </div>
          <button
            className="notion-hoverable w-6 h-6 flex items-center justify-center rounded"
            style={{ color: 'var(--c-icoSec)' }}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {parentPath && (
          <p className="text-xs mb-3 truncate" style={{ color: 'var(--c-texTer)' }}>
            位置：{parentPath}
          </p>
        )}

        <input
          ref={inputRef}
          type="text"
          className="w-full px-3 py-2 text-sm rounded-md mb-4"
          style={{
            border: '1px solid var(--c-borPri)',
            background: 'var(--c-bacPri)',
            color: 'var(--c-texPri)',
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--c-bacPri), 0 0 0 4px var(--notion-blue)'; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          placeholder="文档名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="notion-hoverable px-3 py-1.5 text-sm rounded-md"
            style={{ color: 'var(--c-texSec)', background: 'var(--c-bacTer)' }}
          >
            取消
          </button>
          <button
            disabled={!name.trim()}
            onClick={handleConfirm}
            className="px-3 py-1.5 text-sm rounded-md transition-colors text-white disabled:opacity-40"
            style={{ background: 'var(--notion-blue)' }}
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
