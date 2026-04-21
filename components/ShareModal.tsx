'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ShareModalProps {
  path: string;
  type: 'article' | 'folder';
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({
  path,
  type,
  isOpen,
  onClose,
}: ShareModalProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | 'forever'>('forever');
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) {
      setShareToken(null);
      setError(null);
      setCopied(false);
      setPin('');
      setExpiresInDays('forever');
    }
  }, [isOpen]);

  const generateShareLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { path, type };
      if (pin.trim()) body.pin = pin.trim();
      if (expiresInDays !== 'forever') body.expiresInDays = expiresInDays;
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        setShareToken(json.data.token);
      } else {
        setError(json.error || t('share.generateFailed'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError(t('share.generateFailed') + ': ' + message);
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const copyToClipboard = async () => {
    if (shareToken) {
      const url = `${baseUrl}/share/${shareToken}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // 降级：创建临时 input 元素复制
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {type === 'article' ? t('share.shareArticle') : t('share.shareFolder')}
          </DialogTitle>
          <DialogDescription>
            {t('share.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="px-3 py-2 rounded text-sm" style={{ background: 'rgba(235,87,87,0.06)', border: '1px solid rgba(235,87,87,0.2)', color: 'var(--nx-red)' }}>
              {error}
            </div>
          )}

          {!shareToken ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">访问密码 (可选，4-20 字符)</label>
                <Input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="留空 = 无密码，任何人可访问"
                  maxLength={20}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">有效期</label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { value: 1 as const, label: '1 天' },
                    { value: 7 as const, label: '7 天' },
                    { value: 30 as const, label: '30 天' },
                    { value: 'forever' as const, label: '永久' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setExpiresInDays(opt.value)}
                      className="nx-hoverable"
                      style={{
                        fontSize: '13px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${expiresInDays === opt.value ? 'var(--nx-blue)' : 'var(--c-borPri)'}`,
                        background: expiresInDays === opt.value ? 'var(--nx-badge-bg)' : 'var(--c-bacPri)',
                        color: expiresInDays === opt.value ? 'var(--nx-blue)' : 'var(--c-texSec)',
                        fontWeight: expiresInDays === opt.value ? 500 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={generateShareLink}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? t('share.generating') : t('share.generate')}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('share.linkLabel')}</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${baseUrl}/share/${shareToken}`}
                    className="text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="flex-shrink-0"
                    aria-label={copied ? t('share.copied') : t('share.copyLink')}
                    title={copied ? t('share.copied') : t('share.copyLink')}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShareToken(null);
                  setError(null);
                }}
                className="w-full"
              >
                {t('share.generateNew')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
