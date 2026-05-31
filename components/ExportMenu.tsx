'use client';

import { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ExportMenuProps {
  articlePath: string;
}

export function ExportMenu({ articlePath }: ExportMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleExport = (format: 'md' | 'html') => {
    setOpen(false);
    const url = `/api/export?path=${encodeURIComponent(articlePath)}&format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    setOpen(false);
    window.print();
  };

  const handleExportPdf = () => {
    setOpen(false);
    // 新标签页打开当前编辑器视图 + ?print=1：复用 BlockNote 真实渲染管线（所见即所得），
    // 隐藏所有 chrome（侧栏 / 顶栏 / TOC / 拖拽手柄 / 工具栏），加载完毕后自动触发浏览器打印对话框。
    const url = window.location.pathname + '?print=1';
    window.open(url, '_blank');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        title={t('export.title')}
        className="nx-hoverable flex items-center gap-1 text-sm px-2 py-1 rounded disabled:opacity-40"
        style={{ color: 'var(--c-texSec)' }}
      >
        <Download className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 py-1 min-w-[160px]"
          style={{
            background: 'var(--c-bacPri)',
            borderRadius: '6px',
            boxShadow: 'var(--c-shaOutMd)',
            border: '1px solid var(--c-borPri)',
          }}
        >
          <button
            className="nx-hoverable w-full text-left px-3 py-1.5 text-sm"
            style={{ color: 'var(--c-texSec)' }}
            onClick={() => handleExport('md')}
          >
            {t('export.markdown')}
          </button>
          <button
            className="nx-hoverable w-full text-left px-3 py-1.5 text-sm"
            style={{ color: 'var(--c-texSec)' }}
            onClick={() => handleExport('html')}
          >
            {t('export.html')}
          </button>
          <div className="my-1" style={{ borderTop: '1px solid var(--c-borSec)' }} />
          <button
            className="nx-hoverable w-full text-left px-3 py-1.5 text-sm"
            style={{ color: 'var(--c-texSec)' }}
            onClick={handleExportPdf}
          >
            {t('export.pdfStyled')}
          </button>
          <button
            className="nx-hoverable w-full text-left px-3 py-1.5 text-sm"
            style={{ color: 'var(--c-texSec)' }}
            onClick={handlePrint}
          >
            {t('export.pdf')}
          </button>
        </div>
      )}
    </div>
  );
}
