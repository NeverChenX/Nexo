'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { useParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

interface ShareTreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children?: ShareTreeItem[];
}

interface ShareData {
  type: 'article' | 'folder';
  path: string;
  content?: string;
  contents?: ShareTreeItem[];
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needPin, setNeedPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);

  const fetchWithPin = async (pin?: string) => {
    const headers: Record<string, string> = {};
    if (pin) headers['X-Share-Pin'] = pin;
    const res = await fetch(`/api/share/${token}`, { headers });
    const json = await res.json();
    return { status: res.status, json };
  };

  useEffect(() => {
    (async () => {
      try {
        const { status, json } = await fetchWithPin();
        if (json.ok) {
          setShareData(json.data);
        } else if (status === 401 && json.reason === 'need_pin') {
          setNeedPin(true);
        } else {
          setError(json.error || '加载失败');
        }
      } catch (err) {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submitPin = async () => {
    if (!pinInput.trim()) return;
    setSubmittingPin(true);
    setError(null);
    try {
      const { json } = await fetchWithPin(pinInput.trim());
      if (json.ok) {
        setShareData(json.data);
        setNeedPin(false);
      } else {
        setError(json.error || '密码错误');
      }
    } finally {
      setSubmittingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bacPri)' }}>
        <div style={{ color: 'var(--c-texTer)' }}>加载中...</div>
      </div>
    );
  }

  if (needPin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bacPri)' }}>
        <div style={{ width: '320px', padding: '24px', border: '1px solid var(--c-borPri)', borderRadius: '10px', background: 'var(--c-bacPri)', boxShadow: 'var(--c-shaOutMd)' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--c-texPri)', marginBottom: '8px' }}>🔒 此分享链接需要密码</p>
          <p style={{ fontSize: '12px', color: 'var(--c-texTer)', marginBottom: '16px' }}>请输入发起人提供的访问密码</p>
          <input
            autoFocus
            type="text"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitPin(); }}
            placeholder="访问密码"
            style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid var(--c-borPri)', borderRadius: '6px', outline: 'none', marginBottom: '12px', color: 'var(--c-texPri)', background: 'var(--c-bacPri)' }}
          />
          {error && (
            <p style={{ fontSize: '12px', color: 'var(--nx-red)', marginBottom: '12px' }}>{error}</p>
          )}
          <button
            onClick={submitPin}
            disabled={submittingPin || !pinInput.trim()}
            className="disabled:opacity-40"
            style={{ width: '100%', padding: '8px', fontSize: '14px', background: 'var(--nx-blue)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            {submittingPin ? '验证中...' : '访问'}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bacPri)' }}>
        <div
          className="flex gap-3 p-6 rounded-lg max-w-md"
          style={{ border: '1px solid var(--c-borPri)', color: 'var(--nx-red)' }}
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bacPri)' }}>
        <p style={{ color: 'var(--c-texDis)' }}>没有内容</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bacPri)', paddingTop: '48px', paddingBottom: '80px' }}>
      <div className="nx-layout">
        <div className="nx-layout-content">
          {shareData.type === 'article' ? (
            <div className="nx-content">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeSanitize]}>
                {shareData.content || ''}
              </ReactMarkdown>
            </div>
          ) : (
            <div>
              <h1 style={{ fontSize: '1.875em', fontWeight: 700, color: 'var(--c-texPri)', marginBottom: '16px' }}>
                {shareData.path}
              </h1>
              {shareData.contents && shareData.contents.length > 0 ? (
                <div>
                  <h2 style={{ fontSize: '1.25em', fontWeight: 600, color: 'var(--c-texPri)', marginBottom: '12px' }}>文件列表</h2>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {shareData.contents.map((item: ShareTreeItem) => (
                      <li
                        key={item.path}
                        className="nx-hoverable flex items-center gap-2 px-2 py-1.5 rounded"
                      >
                        <span style={{ fontSize: '14px' }}>{item.isFolder ? '📁' : '📄'}</span>
                        <span style={{ color: 'var(--c-texPri)', fontSize: '14px' }}>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ color: 'var(--c-texDis)' }}>该文件夹为空</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
