'use client';

import { useState } from 'react';
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

  const generateShareLink = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type }),
      });

      const json = await res.json();
      if (json.ok) {
        setShareToken(json.data.token);
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareToken) {
      const url = `${window.location.origin}/share/${shareToken}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            分享{type === 'article' ? '文章' : '文件夹'}
          </DialogTitle>
          <DialogDescription>
            生成一个永久的分享链接，允许其他人查看内容
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareToken ? (
            <Button
              onClick={generateShareLink}
              disabled={loading}
              className="w-full"
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
                    value={`${window.location.origin}/share/${shareToken}`}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
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
                onClick={() => setShareToken(null)}
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
