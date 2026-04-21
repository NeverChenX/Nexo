'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ImageIcon, SmilePlus, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface PageIconCoverHandle {
  openEmojiPicker: () => void;
  openCoverInput: () => void;
}

const EMOJI_LIST = [
  '📄', '📝', '📚', '📖', '📓', '📒', '📕', '📗', '📘', '📙',
  '🗂️', '📁', '📂', '🗃️', '📊', '📈', '📉', '🔬', '🔭', '🧪',
  '💡', '🎯', '🚀', '⭐', '🔥', '💎', '🏆', '🎨', '🎵', '🎬',
  '💻', '🖥️', '📱', '⌨️', '🖱️', '🔧', '⚙️', '🛠️', '📐', '🧮',
  '🌍', '🌎', '🌏', '🏠', '🏢', '🏗️', '🌳', '🌺', '🍀', '🌈',
  '❤️', '💙', '💚', '💛', '💜', '🖤', '🤍', '🧡', '💗', '✨',
  '📌', '🔖', '🏷️', '📎', '✏️', '🖊️', '🖋️', '📏', '📐', '🗓️',
  '🤖', '🧠', '👨‍💻', '👩‍💻', '🎓', '📡', '🔑', '🔒', '🛡️', '⚡',
];

interface PageIconCoverProps {
  icon?: string;
  cover?: string;
  onIconChange: (icon: string | undefined) => void;
  onCoverChange: (cover: string | undefined) => void;
  readOnly?: boolean;
  hideActions?: boolean;
}

export const PageIconCover = forwardRef<PageIconCoverHandle, PageIconCoverProps>(function PageIconCover({
  icon,
  cover,
  onIconChange,
  onCoverChange,
  readOnly = false,
  hideActions = false,
}, ref) {
  const { t } = useI18n();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [showCoverInput, setShowCoverInput] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    openEmojiPicker: () => setShowEmojiPicker(true),
    openCoverInput: () => setShowCoverInput(true),
  }));

  // 点击外部关闭 emoji picker
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    const id = window.requestAnimationFrame(() => document.addEventListener('mousedown', handler));
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [showEmojiPicker]);

  // Esc 关闭 emoji picker / cover input
  useEffect(() => {
    if (!showEmojiPicker && !showCoverInput) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEmojiPicker(false);
        setShowCoverInput(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showEmojiPicker, showCoverInput]);

  return (
    <div style={{ marginBottom: icon || cover ? '8px' : '0' }}>
      {/* 封面图 */}
      {cover && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: icon ? '-32px' : '12px',
          }}
        >
          <img
            src={cover}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              cursor: 'default',
            }}
          />
          {!readOnly && (
            <button
              onClick={() => onCoverChange(undefined)}
              className="nx-hoverable"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                opacity: 0.7,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 图标 */}
      {icon && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            marginLeft: '2px',
            marginBottom: '4px',
          }}
        >
          <span
            role={readOnly ? undefined : 'button'}
            onClick={readOnly ? undefined : () => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              fontSize: '48px',
              lineHeight: 1,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'inline-block',
            }}
          >
            {icon}
          </span>
        </div>
      )}

      {/* 操作按钮（由父组件通过 hideActions 接管时不渲染） */}
      {!readOnly && !hideActions && !icon && !cover && (
        <div className="flex items-center gap-1" style={{ marginBottom: '4px' }}>
          <button
            onClick={() => setShowEmojiPicker(true)}
            className="nx-hoverable flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{ fontSize: '12px', color: 'var(--c-texTer)' }}
          >
            <SmilePlus className="h-3.5 w-3.5" />
            {t('pageIcon.addIcon')}
          </button>
          <button
            onClick={() => setShowCoverInput(true)}
            className="nx-hoverable flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{ fontSize: '12px', color: 'var(--c-texTer)' }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {t('pageIcon.addCover')}
          </button>
        </div>
      )}

      {/* Emoji 选择器 */}
      {showEmojiPicker && (
        <div
          ref={emojiRef}
          className="nx-fadein-fast"
          style={{
            position: 'absolute',
            zIndex: 200,
            background: 'var(--c-bacPri)',
            border: '1px solid var(--c-borPri)',
            borderRadius: '8px',
            boxShadow: 'var(--c-shaOutLg)',
            padding: '8px',
            width: '280px',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-texSec)' }}>
              {t('pageIcon.selectEmoji')}
            </span>
            <div className="flex gap-1">
              {icon && (
                <button
                  onClick={() => { onIconChange(undefined); setShowEmojiPicker(false); }}
                  className="nx-hoverable px-1.5 py-0.5 rounded"
                  style={{ fontSize: '11px', color: 'var(--nx-red)' }}
                >
                  {t('pageIcon.removeIcon')}
                </button>
              )}
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="nx-hoverable rounded p-0.5"
                style={{ color: 'var(--c-icoTer)' }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px' }}>
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onIconChange(emoji); setShowEmojiPicker(false); }}
                className="nx-hoverable rounded flex items-center justify-center"
                style={{ fontSize: '20px', width: '28px', height: '28px', cursor: 'pointer', border: 'none', background: 'transparent' }}
              >
                {emoji}
              </button>
            ))}
          </div>
          {/* 封面图 URL 输入 */}
          {!cover && (
            <div style={{ borderTop: '1px solid var(--c-borSec)', marginTop: '8px', paddingTop: '8px' }}>
              <button
                onClick={() => setShowCoverInput(!showCoverInput)}
                className="nx-hoverable flex items-center gap-1 px-1 py-0.5 rounded w-full"
                style={{ fontSize: '12px', color: 'var(--c-texTer)' }}
              >
                <ImageIcon className="h-3 w-3" />
                {t('pageIcon.addCover')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 封面 URL 输入 */}
      {showCoverInput && (
        <div
          className="nx-fadein-fast flex items-center gap-2"
          style={{ marginBottom: '8px' }}
        >
          <input
            autoFocus
            type="text"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && coverUrl.trim()) {
                onCoverChange(coverUrl.trim());
                setCoverUrl('');
                setShowCoverInput(false);
              }
              if (e.key === 'Escape') setShowCoverInput(false);
            }}
            placeholder={t('pageIcon.coverUrlPlaceholder')}
            style={{
              flex: 1,
              fontSize: '13px',
              color: 'var(--c-texPri)',
              background: 'var(--c-bacTer)',
              border: '1px solid var(--c-borPri)',
              outline: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          />
          <button
            onClick={() => {
              if (coverUrl.trim()) {
                onCoverChange(coverUrl.trim());
                setCoverUrl('');
              }
              setShowCoverInput(false);
            }}
            className="nx-btn-primary"
            style={{ padding: '4px 12px', fontSize: '12px' }}
          >
            {t('common.confirm')}
          </button>
          <button
            onClick={() => setShowCoverInput(false)}
            className="nx-hoverable rounded p-1"
            style={{ color: 'var(--c-icoTer)' }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
});
