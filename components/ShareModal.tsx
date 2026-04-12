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

  // 重置状态当对话框关闭
  useEffect(() => {
    if (!isOpen) {
      setShareToken(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  const generateShareLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type }),
      });

      const json = await res.json();
      if (json.ok) {
        setShareToken(json.data.token);
      } else {
        setError(json.error || '生成失败');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError('生成失败: ' + message);
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
            分享{type === 'article' ? '文章' : '文件夹'}
          </DialogTitle>
          <DialogDescription>
            生成一个永久的分享链接，允许其他人查看内容
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="px-3 py-2 rounded text-sm" style={{ background: 'rgba(235,87,87,0.06)', border: '1px solid rgba(235,87,87,0.2)', color: 'var(--notion-red)' }}>
              {error}
            </div>
          )}

          {!shareToken ? (
            <Button
              onClick={generateShareLink}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? '生成中...' : '生成分享链接'}
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">分享链接</label>
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
                生成新链接
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
