'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Copy, Check, MessageCircleQuestion, CornerDownLeft, RotateCcw } from 'lucide-react';
import { Z } from '@/lib/z-index';
import { useI18n } from '@/lib/i18n';

interface AiCustomAskPanelProps {
  text: string;
  onClose: () => void;
  onInsert?: (text: string) => void;
}

export function AiCustomAskPanel({ text, onClose, onInsert }: AiCustomAskPanelProps) {
  const { t } = useI18n();
  const [instruction, setInstruction] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 自动聚焦输入
    setTimeout(() => textareaRef.current?.focus(), 30);
  }, []);

  // Esc 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const submit = useCallback(async () => {
    const ins = instruction.trim();
    if (!ins || loading) return;
    setLoading(true);
    setError('');
    setResult('');
    setSubmitted(ins);
    try {
      const res = await fetch('/api/ai-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedText: text, instruction: ins }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json.data.result || '');
      } else {
        setError(json.error || t('aiCustom.failed'));
      }
    } catch {
      setError(t('aiCustom.requestFailed'));
    } finally {
      setLoading(false);
    }
  }, [instruction, loading, text, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter / Ctrl+Enter 提交
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = result;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [result]);

  const handleReset = () => {
    setSubmitted(null);
    setResult('');
    setError('');
    setInstruction('');
    setTimeout(() => textareaRef.current?.focus(), 30);
  };

  return (
    <div
      className="nx-fadein-fast"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '420px',
        maxHeight: '520px',
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
          <MessageCircleQuestion style={{ width: '13px', height: '13px', color: '#ec4899' }} />
          {t('aiCustom.title')}
        </span>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="nx-hoverable"
          style={{ color: 'var(--c-icoSec)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '3px', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X style={{ width: '13px', height: '13px' }} />
        </button>
      </div>

      {/* 选中原文预览 */}
      <div style={{
        padding: '8px 14px',
        fontSize: '12px',
        color: 'var(--c-texTer)',
        background: 'var(--c-bacSec)',
        borderBottom: '1px solid var(--c-borSec)',
        maxHeight: '60px',
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        「{text.slice(0, 200)}{text.length > 200 ? '…' : ''}」
      </div>

      {/* 输入区 */}
      {!submitted && (
        <div style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('aiCustom.placeholder')}
            rows={4}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--c-texPri)',
              background: 'var(--c-bacPri)',
              border: '1px solid var(--c-borPri)',
              borderRadius: '6px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--c-texDis)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <CornerDownLeft style={{ width: '11px', height: '11px' }} />
              {t('aiCustom.submitHint')}
            </span>
            <button
              onClick={submit}
              disabled={!instruction.trim() || loading}
              className="nx-btn-primary"
              style={{ padding: '5px 14px', fontSize: '12px', opacity: !instruction.trim() || loading ? 0.4 : 1, cursor: !instruction.trim() || loading ? 'not-allowed' : 'pointer' }}
            >
              {t('aiCustom.submit')}
            </button>
          </div>
        </div>
      )}

      {/* 结果区 */}
      {submitted && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 14px', fontSize: '11.5px', color: 'var(--c-texSec)', borderBottom: '1px solid var(--c-borSec)', flexShrink: 0, background: 'var(--c-bacTer)' }}>
            <span style={{ color: 'var(--c-texDis)', marginRight: 4 }}>{t('aiCustom.yourQuestion')}：</span>
            {submitted}
          </div>
          <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-texTer)', fontSize: '13px' }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                {t('aiCustom.thinking')}
              </div>
            )}
            {error && <p style={{ color: 'var(--nx-red)', fontSize: '13px' }}>{error}</p>}
            {result && (
              <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--c-texPri)', whiteSpace: 'pre-wrap' }}>{result}</p>
            )}
          </div>

          {/* 操作按钮 */}
          {(result || error) && (
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--c-borSec)',
              display: 'flex',
              gap: '6px',
              flexShrink: 0,
              alignItems: 'center',
            }}>
              {result && onInsert && (
                <button
                  onClick={() => { onInsert(result); onClose(); }}
                  className="nx-btn-primary"
                  style={{ padding: '4px 10px', fontSize: '12px', flex: 1 }}
                >
                  {t('aiCustom.insertBelow')}
                </button>
              )}
              {result && (
                <button
                  onClick={handleCopy}
                  className="nx-hoverable rounded p-1.5"
                  style={{ color: 'var(--c-icoSec)', flexShrink: 0 }}
                  title={t('aiCustom.copy')}
                >
                  {copied ? <Check style={{ width: '14px', height: '14px', color: 'var(--nx-green)' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                </button>
              )}
              <button
                onClick={handleReset}
                className="nx-hoverable rounded px-2 py-1"
                style={{ fontSize: '12px', color: 'var(--c-texTer)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <RotateCcw style={{ width: '12px', height: '12px' }} />
                {t('aiCustom.reset')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
