'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Copy, Check, Wand2 } from 'lucide-react';
import { Z } from '@/lib/z-index';
import { useI18n } from '@/lib/i18n';

const AI_ACTIONS = [
  { key: 'summarize', icon: '📝' },
  { key: 'expand', icon: '📖' },
  { key: 'rewrite', icon: '✏️' },
  { key: 'continue', icon: '➡️' },
  { key: 'fix_grammar', icon: '🔧' },
  { key: 'translate_zh', icon: '🇨🇳' },
  { key: 'translate_en', icon: '🇬🇧' },
  { key: 'simplify', icon: '💡' },
  { key: 'formal', icon: '👔' },
  { key: 'bullet_points', icon: '📋' },
] as const;

interface AiWritePanelProps {
  text: string;
  onClose: () => void;
  onReplace?: (text: string) => void;
  onInsert?: (text: string) => void;
}

export function AiWritePanel({ text, onClose, onReplace, onInsert }: AiWritePanelProps) {
  const { t } = useI18n();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAction = useCallback(async (action: string) => {
    setSelectedAction(action);
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await fetch('/api/ai-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, action }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json.data.result);
      } else {
        setError(json.error || t('aiWrite.failed'));
      }
    } catch {
      setError(t('aiWrite.requestFailed'));
    } finally {
      setLoading(false);
    }
  }, [text, t]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  // Esc 关闭面板
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="nx-fadein-fast"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        maxHeight: '420px',
        background: 'var(--c-bacPri)',
        border: '1px solid var(--c-borPri)',
        borderRadius: '8px',
        boxShadow: 'var(--c-shaOutLg)',
        zIndex: Z.FLOATING_PANEL,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--c-borSec)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-texSec)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Wand2 style={{ width: '12px', height: '12px', color: '#2eaadc' }} />
          {t('aiWrite.title')}
        </span>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="nx-hoverable"
          style={{ color: 'var(--c-icoSec)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '3px', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 原文预览 */}
      <div style={{
        padding: '6px 14px',
        fontSize: '12px',
        color: 'var(--c-texTer)',
        background: 'var(--c-bacSec)',
        borderBottom: '1px solid var(--c-borSec)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        「{text.slice(0, 80)}{text.length > 80 ? '…' : ''}」
      </div>

      {/* 操作按钮网格 */}
      {!selectedAction && (
        <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
          {AI_ACTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => handleAction(a.key)}
              className="nx-hoverable flex items-center gap-2 px-2 py-1.5 rounded text-left"
              style={{ fontSize: '13px', color: 'var(--c-texPri)', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <span>{a.icon}</span>
              <span>{t(`aiWrite.${a.key}`)}</span>
            </button>
          ))}
        </div>
      )}

      {/* 结果区域 */}
      {selectedAction && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 14px', fontSize: '11px', color: 'var(--c-texDis)', borderBottom: '1px solid var(--c-borSec)', flexShrink: 0 }}>
            {t(`aiWrite.${selectedAction}`)}
          </div>
          <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-texTer)', fontSize: '13px' }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                {t('aiWrite.processing')}
              </div>
            )}
            {error && <p style={{ color: 'var(--nx-red)', fontSize: '13px' }}>{error}</p>}
            {result && (
              <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--c-texPri)', whiteSpace: 'pre-wrap' }}>{result}</p>
            )}
          </div>

          {/* 操作按钮 */}
          {result && (
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--c-borSec)',
              display: 'flex',
              gap: '6px',
              flexShrink: 0,
            }}>
              <button
                onClick={() => { onReplace?.(result); onClose(); }}
                className="nx-btn-primary"
                style={{ padding: '4px 10px', fontSize: '12px', flex: 1 }}
              >
                {t('aiWrite.replace')}
              </button>
              <button
                onClick={() => { onInsert?.(result); onClose(); }}
                className="nx-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px', flex: 1 }}
              >
                {t('aiWrite.insertBelow')}
              </button>
              <button
                onClick={handleCopy}
                className="nx-hoverable rounded p-1.5"
                style={{ color: 'var(--c-icoSec)', flexShrink: 0 }}
                title={t('aiWrite.copy')}
              >
                {copied ? <Check className="h-3.5 w-3.5" style={{ color: 'var(--nx-green)' }} /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => { setSelectedAction(null); setResult(''); setError(''); }}
                className="nx-hoverable rounded px-2 py-1"
                style={{ fontSize: '12px', color: 'var(--c-texTer)', flexShrink: 0 }}
              >
                {t('aiWrite.back')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
