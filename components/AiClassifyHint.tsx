'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, X, FolderInput, Tag } from 'lucide-react';

interface AiClassifyHintProps {
  articlePath: string;
  content: string;
  /** 内容变更计数：改变时重置已拒绝状态（进入新文档要重新建议） */
  resetKey?: unknown;
  /** 把文档移动到新目录（父组件实际执行） */
  onMove: (newParentPath: string) => Promise<void> | void;
  /** 应用标签到 frontmatter（父组件实际写入） */
  onApplyTags: (tags: string[]) => void;
}

/**
 * 编辑器右下角浮条：保存后几秒钟分析当前文档，推荐最合适的目录和标签。
 * 只在新文档、近期修改大或明确点击按钮时触发。
 */
export function AiClassifyHint({ articlePath, content, resetKey, onMove, onApplyTags }: AiClassifyHintProps) {
  const [suggestedFolders, setSuggestedFolders] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnalyzedLenRef = useRef(0);

  // 文档切换时重置
  useEffect(() => {
    setDismissed(false);
    setVisible(false);
    setSuggestedFolders([]);
    setSuggestedTags([]);
    lastAnalyzedLenRef.current = 0;
  }, [articlePath, resetKey]);

  const analyze = useCallback(async () => {
    if (!articlePath || !content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: articlePath, content }),
      });
      const json = await res.json();
      if (json.ok) {
        const f: string[] = (json.data.suggestedFolders || []).filter((s: string) => {
          // 过滤：当前目录已经是建议目录时，不提示
          const curParent = articlePath.includes('/') ? articlePath.slice(0, articlePath.lastIndexOf('/')) : '';
          return s !== curParent;
        });
        setSuggestedFolders(f);
        setSuggestedTags(json.data.suggestedTags || []);
        if (f.length > 0 || (json.data.suggestedTags && json.data.suggestedTags.length > 0)) {
          setVisible(true);
        }
      }
    } catch {
      /* 静默 */
    }
    setLoading(false);
  }, [articlePath, content]);

  // 内容从无到有或大幅增长时触发（首次保存、粘贴大段内容、AI 生成等）
  useEffect(() => {
    if (dismissed || !articlePath) return;
    const len = content.replace(/\s/g, '').length;
    // 至少 300 字才值得分析
    if (len < 300) return;
    // 每次增长 >1000 字再分析一次
    if (len - lastAnalyzedLenRef.current < 1000) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastAnalyzedLenRef.current = len;
      analyze();
    }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content, articlePath, analyze, dismissed]);

  if (!visible || dismissed) return null;
  if (suggestedFolders.length === 0 && suggestedTags.length === 0) return null;

  return (
    <div
      role="complementary"
      className="nx-fadein-fast"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '300px',
        padding: '12px 14px',
        background: 'var(--c-bacPri)',
        border: '1px solid var(--c-borPri)',
        borderRadius: '10px',
        boxShadow: 'var(--c-shaOutLg)',
        zIndex: 150,
        fontSize: '12px',
        color: 'var(--c-texSec)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} style={{ color: '#8b5cf6' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--c-texPri)' }}>AI 分类建议</span>
          {loading && <span style={{ fontSize: '10px', color: 'var(--c-texDis)' }}>…</span>}
        </div>
        <button
          onClick={() => { setDismissed(true); setVisible(false); }}
          aria-label="忽略"
          className="nx-hoverable rounded p-0.5"
          style={{ color: 'var(--c-icoSec)' }}
        >
          <X size={12} />
        </button>
      </div>

      {suggestedFolders.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div className="flex items-center gap-1 mb-1">
            <FolderInput size={11} style={{ color: 'var(--c-icoTer)' }} />
            <span style={{ fontSize: '11px', color: 'var(--c-texTer)' }}>建议移动到</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {suggestedFolders.map((f) => (
              <button
                key={f}
                onClick={async () => { await onMove(f); setVisible(false); }}
                className="nx-hoverable"
                style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--nx-badge-bg)', color: 'var(--nx-blue)', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {suggestedTags.length > 0 && (
        <div style={{ marginBottom: '4px' }}>
          <div className="flex items-center gap-1 mb-1">
            <Tag size={11} style={{ color: 'var(--c-icoTer)' }} />
            <span style={{ fontSize: '11px', color: 'var(--c-texTer)' }}>建议标签</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {suggestedTags.map((tag) => (
              <span
                key={tag}
                style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--c-bacTer)', color: 'var(--c-texSec)', borderRadius: '3px' }}
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={() => { onApplyTags(suggestedTags); setVisible(false); }}
            className="nx-hoverable"
            style={{ marginTop: '8px', padding: '4px 10px', fontSize: '11px', background: 'var(--nx-blue)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            应用标签
          </button>
        </div>
      )}
    </div>
  );
}
