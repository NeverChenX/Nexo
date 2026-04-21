'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Send, FileText, Save, RotateCcw, History } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useModalFocus } from '@/lib/useModalFocus';

interface AiAskSource {
  path: string;
  score: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: AiAskSource[];
}

interface AiAskPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

const HISTORY_KEY = 'nexo_aiask_conversations_v1';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveConversations(list: Conversation[]): void {
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 30))); } catch { /* ignore */ }
}

export function AiAskPanel({ isOpen, onClose, onNavigate }: AiAskPanelProps) {
  const { t } = useI18n();
  useModalFocus(isOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (isOpen) setConversations(loadConversations());
  }, [isOpen]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottomRef.current = nearBottom;
  };

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 对话自动存档：messages 变化时更新 localStorage
  useEffect(() => {
    if (messages.length === 0) return;
    const id = currentId || 'c-' + Date.now().toString(36);
    if (!currentId) setCurrentId(id);
    const firstQ = messages.find((m) => m.role === 'user')?.content?.slice(0, 40) || '未命名对话';
    const conv: Conversation = {
      id,
      title: firstQ,
      updatedAt: new Date().toISOString(),
      messages,
    };
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      const next = [conv, ...filtered];
      saveConversations(next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleAsk = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: json.data.answer,
          sources: json.data.sources,
        }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `${t('common.error')}: ${json.error}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('aiAsk.requestFailed') }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, t]);

  const startNew = () => {
    setMessages([]);
    setCurrentId(null);
    setShowHistory(false);
    setSaveStatus(null);
  };

  const loadConversation = (c: Conversation) => {
    setMessages(c.messages);
    setCurrentId(c.id);
    setShowHistory(false);
  };

  const saveAsNote = async () => {
    if (messages.length === 0) return;
    const firstQ = messages.find((m) => m.role === 'user')?.content?.slice(0, 40) || '对话';
    const ts = new Date();
    const date = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
    const md = [
      `# AI 对话: ${firstQ}`,
      '',
      `> 导出时间: ${ts.toLocaleString()}`,
      '',
      ...messages.map((m) => {
        const who = m.role === 'user' ? '🙋 用户' : '🤖 AI';
        const sourcesLine = m.sources && m.sources.length > 0
          ? '\n\n📚 来源: ' + m.sources.map((s) => `[${s.path}]`).join(' ')
          : '';
        return `### ${who}\n\n${m.content}${sourcesLine}\n`;
      }),
    ].join('\n');

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `对话归档/${date}-${firstQ.replace(/[\\/]/g, '_').slice(0, 30)}`,
          content: md,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSaveStatus('✓ 已保存到 对话归档/');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('× 保存失败');
      }
    } catch {
      setSaveStatus('× 网络错误');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.15)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="nx-fadein-fast"
        style={{
          width: '680px',
          maxHeight: '82vh',
          background: 'var(--c-bacPri)',
          borderRadius: '10px',
          boxShadow: 'var(--c-shaOutLg)',
          border: '1px solid var(--c-borPri)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 标题 + 工具 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--c-borSec)',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-texPri)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🧠 {t('aiAsk.title')}
          </span>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <>
                <button
                  onClick={saveAsNote}
                  title="保存为笔记"
                  className="nx-hoverable rounded p-1"
                  style={{ color: 'var(--c-icoSec)' }}
                >
                  <Save size={14} />
                </button>
                <button
                  onClick={startNew}
                  title="新对话"
                  className="nx-hoverable rounded p-1"
                  style={{ color: 'var(--c-icoSec)' }}
                >
                  <RotateCcw size={14} />
                </button>
              </>
            )}
            <button
              onClick={() => setShowHistory((v) => !v)}
              title="历史对话"
              className="nx-hoverable rounded p-1"
              style={{ color: showHistory ? 'var(--nx-blue)' : 'var(--c-icoSec)' }}
            >
              <History size={14} />
            </button>
            <button onClick={onClose} aria-label={t('common.close')} className="nx-hoverable rounded p-1" style={{ color: 'var(--c-icoSec)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 侧边历史列表 */}
          {showHistory && (
            <div style={{ width: '180px', borderRight: '1px solid var(--c-borSec)', overflowY: 'auto', background: 'var(--c-bacSec)' }}>
              <div style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 500, color: 'var(--c-texDis)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--c-borSec)' }}>
                对话历史 ({conversations.length})
              </div>
              {conversations.length === 0 && (
                <div style={{ padding: '16px', fontSize: '12px', color: 'var(--c-texDis)' }}>暂无</div>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConversation(c)}
                  className="nx-hoverable w-full text-left"
                  style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-borSec)', background: currentId === c.id ? 'var(--ca-butHovBac)' : 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--c-texPri)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--c-texDis)', marginTop: '2px' }}>
                    {new Date(c.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 主对话区 */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: '240px' }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--c-texDis)' }}>
                  <p style={{ fontSize: '14px', marginBottom: '8px' }}>{t('aiAsk.welcome')}</p>
                  <p style={{ fontSize: '12px' }}>{t('aiAsk.hint')} · 现在支持**连续多轮对话**</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: msg.role === 'user' ? 'var(--nx-blue)' : 'var(--nx-purple)',
                    marginBottom: '4px',
                  }}>
                    {msg.role === 'user' ? t('aiAsk.you') : t('aiAsk.ai')}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: 'var(--c-texPri)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {msg.sources.map((s, j) => (
                        <button
                          key={j}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onNavigate?.(s.path)}
                          className="nx-hoverable flex items-center gap-1 px-2 py-0.5 rounded"
                          style={{
                            fontSize: '11px',
                            color: 'var(--nx-blue)',
                            background: 'var(--nx-badge-bg)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <FileText className="h-3 w-3" />
                          {s.path.split('/').pop()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ fontSize: '13px', color: 'var(--c-texTer)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                  {t('aiAsk.thinking')}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {saveStatus && (
              <div style={{ padding: '6px 16px', fontSize: '12px', color: 'var(--nx-green)', borderTop: '1px solid var(--c-borSec)' }}>
                {saveStatus}
              </div>
            )}

            {/* 输入区 */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--c-borSec)',
              display: 'flex',
              gap: '8px',
            }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                placeholder={messages.length > 0 ? '继续追问…' : t('aiAsk.placeholder')}
                disabled={loading}
                style={{
                  flex: 1,
                  fontSize: '14px',
                  color: 'var(--c-texPri)',
                  background: 'var(--c-bacTer)',
                  border: '1px solid var(--c-borPri)',
                  outline: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                }}
              />
              <button
                onClick={handleAsk}
                disabled={loading || !input.trim()}
                className="nx-btn-primary disabled:opacity-40"
                style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
