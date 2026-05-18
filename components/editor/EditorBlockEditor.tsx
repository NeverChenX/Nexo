'use client';

// Pre-register linkify protocols before BlockNote initializes linkifyjs
// This prevents "already initialized" warnings from tiptap's Link extension
import { registerCustomProtocol, init as linkifyInit } from 'linkifyjs';
try {
  ['http', 'https', 'ftp', 'ftps', 'mailto', 'tel', 'callto', 'sms', 'cid', 'xmpp'].forEach((scheme) => {
    registerCustomProtocol(scheme);
  });
  linkifyInit();
} catch {
  // linkify may already be initialized in some environments
}

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { createReactBlockSpec } from '@blocknote/react';
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs, filterSuggestionItems } from '@blocknote/core';
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  FormattingToolbarController,
  FormattingToolbar,
  BasicTextStyleButton,
  BlockTypeSelect,
  TextAlignButton,
  CreateLinkButton,
  NestBlockButton,
  UnnestBlockButton,
  SideMenuController,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import { zh as bnZh, en as bnEn } from '@blocknote/core/locales';
import { useI18n } from '@/lib/i18n';
import { makeNotionSideMenu } from '@/components/editor/NotionSideMenu';
import { BacklinksPanel } from '@/components/BacklinksPanel';
import { CommentsPanel } from '@/components/CommentsPanel';
import { EditorRightDrawer } from '@/components/editor/EditorRightDrawer';
import { AiWritePanel } from '@/components/AiWritePanel';
import { AiCustomAskPanel } from '@/components/AiCustomAskPanel';
import { DocumentPropertiesPanel, type DocumentPropertiesPanelHandle } from '@/components/DocumentPropertiesPanel';
import { PageIconCover, type PageIconCoverHandle } from '@/components/PageIconCover';
import { SmilePlus, ImageIcon, Plus, Sparkles, Wand2, Highlighter, X, Palette, AlertCircle, Copy, Check, MessageCircleQuestion, StickyNote } from 'lucide-react';
import { Z } from '@/lib/z-index';
import { parseFrontmatter, serializeFrontmatter, Frontmatter } from '@/lib/frontmatter';

// ─────────────── PageLink 自定义 Block ───────────────

const PageLink = createReactBlockSpec(
  {
    type: 'pageLink' as const,
    content: 'none' as const,
    propSchema: {
      pageName: { default: '' },
      pagePath: { default: '' },
    },
  },
  {
    render: ({ block }) => {
      const name = block.props.pageName || block.props.pagePath?.split('/').pop() || 'Untitled';
      return (
        <div
          className="nx-hoverable group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer -mx-2"
          style={{ borderRadius: '4px' }}
          onClick={(e) => {
            e.preventDefault();
            const event = new CustomEvent('nexo:pagelink-click', { detail: { path: block.props.pagePath } });
            window.dispatchEvent(event);
          }}
          data-page-path={block.props.pagePath}
        >
          <span className="text-base leading-none">📄</span>
          <span style={{ fontSize: '14px', color: 'var(--c-texPri)', textDecoration: 'underline', textDecorationColor: 'rgba(55,53,47,0.4)', textUnderlineOffset: '3px' }}>
            {name}
          </span>
        </div>
      );
    },
  }
);

// ─────────────── UserNote 自定义 Block（使用者备注） ───────────────

const UserNote = createReactBlockSpec(
  {
    type: 'userNote' as const,
    content: 'inline' as const,
    propSchema: {},
  },
  {
    render: ({ contentRef }) => {
      return (
        <div className="nx-user-note">
          <div className="nx-user-note-header" contentEditable={false}>
            <span className="nx-user-note-icon">📝</span>
            <span className="nx-user-note-label">备注</span>
          </div>
          <div
            className="nx-user-note-body"
            ref={contentRef as unknown as React.RefObject<HTMLDivElement>}
          />
        </div>
      );
    },
  }
);

// ─────────────── 备注持久化（保存 ↔ 加载 双向变换） ───────────────

const USER_NOTE_PREFIX = '📝 备注：';

// 保存前：userNote → paragraph，把 "📝 备注：" 作为前缀 prepend 到 inline 内容
function transformUserNotesForSave(blocks: any[]): any[] {
  return blocks.map((b) => {
    if (b.type !== 'userNote') return b;
    const content = Array.isArray(b.content) ? b.content : [];
    return {
      ...b,
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text: USER_NOTE_PREFIX, styles: {} }, ...content],
    };
  });
}

// 加载后：paragraph 以 "📝 备注：" 开头 → userNote，剥掉前缀
function transformUserNotesAfterLoad(blocks: any[]): any[] {
  return blocks.map((b) => {
    if (b.type !== 'paragraph') return b;
    const content = b.content;
    if (!Array.isArray(content) || content.length === 0) return b;
    const first = content[0];
    if (!first || first.type !== 'text' || typeof first.text !== 'string') return b;
    if (!first.text.startsWith(USER_NOTE_PREFIX)) return b;

    const remainder = first.text.slice(USER_NOTE_PREFIX.length);
    const rest = content.slice(1);
    const newContent = remainder ? [{ ...first, text: remainder }, ...rest] : rest;
    return { ...b, type: 'userNote', props: {}, content: newContent };
  });
}

// ─────────────── Schema ───────────────

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageLink: PageLink(),
    userNote: UserNote(),
  },
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: defaultStyleSpecs,
});

// ─────────────── 切换文档时重置 AI 面板 ───────────────

function AiPanelReset({ articlePath, onReset }: { articlePath: string; onReset: () => void }) {
  const prev = useRef(articlePath);
  useEffect(() => {
    if (prev.current !== articlePath) {
      prev.current = articlePath;
      onReset();
    }
  }, [articlePath, onReset]);
  return null;
}

// ─────────────── AI 解释面板 ───────────────

function AiExplainPanel({
  text,
  articlePath,
  onClose,
}: {
  text: string;
  articlePath: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, articlePath }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.ok) setResult(json.data.explanation);
        else setError(json.error || t('ai.explainFailed'));
      } catch {
        if (!cancelled) setError(t('ai.requestFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [text, articlePath, t]);

  return (
    <div
      className="nx-fadein-fast"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '340px',
        maxHeight: '260px',
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
          <Sparkles style={{ width: '12px', height: '12px', color: '#8b5cf6' }} />
          {t('ai.explain')}
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
      {/* 被解释的原文 */}
      <div style={{
        padding: '8px 14px',
        fontSize: '12px',
        color: 'var(--c-texTer)',
        background: 'var(--c-bacSec)',
        borderBottom: '1px solid var(--c-borSec)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        「{text.slice(0, 60)}{text.length > 60 ? '…' : ''}」
      </div>
      {/* 解释内容 */}
      <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-texTer)', fontSize: '13px' }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> {t('ai.explaining')}
          </div>
        )}
        {error && <p style={{ color: 'var(--nx-red)', fontSize: '13px' }}>{error}</p>}
        {result && <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--c-texPri)', whiteSpace: 'pre-wrap' }}>{result}</p>}
      </div>
    </div>
  );
}

// ─────────────── Nexo 风格工具栏按钮 ───────────────

const toolbarBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '28px', borderRadius: '4px', border: 'none',
  background: 'transparent', cursor: 'pointer', color: 'var(--c-icoPri)',
  fill: 'var(--c-icoPri)', flexShrink: 0, padding: '0',
};

function TBtn({ title, onClick, active, children }: {
  title: string; onClick: () => void; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        ...toolbarBtnStyle,
        background: active ? 'var(--ca-butHovBac)' : 'transparent',
        fontWeight: active ? 600 : 400,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ca-butHovBac)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--ca-butHovBac)' : 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─────────────── 颜色按钮的跨 Mount state（Context 模式） ───────────────
// BlockNote toolbar 在 selection collapse/restore 过程中会 unmount 再 mount
// CustomFormattingToolbar。任何 useState 都会被重置。通过 Context 把 state
// 上提到 EditorBlockEditor（永不 unmount），子组件哪怕 remount 也能从 Context
// 读到最新值 —— 这是彻底解决"点颜色按钮色板消失"的唯一可行方案。

interface ColorState {
  open: boolean;
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  savedSelectionRef: React.MutableRefObject<{ from: number; to: number } | null>;
}
const ColorStateCtx = createContext<ColorState | null>(null);

// ─────────────── 自定义颜色按钮（替代内置 ColorStyleButton） ───────────────
// BlockNote v0.47 的 ColorStyleButton 用 Radix Portal 打开子菜单，
// 但未调用 setToolbarPositionFrozen，导致 Floating-UI 识别为 outside click，
// 工具栏连同色板一起 dismiss。这里用 absolute 色板（DOM 在工具栏内）绕开。

const BN_COLORS = ['default', 'gray', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as const;
const BN_TEXT_SWATCH: Record<string, string> = {
  default: 'var(--c-texPri)',
  gray: '#787774',
  brown: '#976D57',
  red: '#E03E3E',
  orange: '#D9730D',
  yellow: '#DFAB01',
  green: '#0F7B6C',
  blue: '#0B6E99',
  purple: '#6940A5',
  pink: '#AD1A72',
};
const BN_BG_SWATCH: Record<string, string> = {
  default: 'transparent',
  gray: 'rgba(155,154,151,0.4)',
  brown: 'rgba(186,133,111,0.3)',
  red: 'rgba(255,115,105,0.3)',
  orange: 'rgba(255,163,68,0.3)',
  yellow: 'rgba(255,220,73,0.4)',
  green: 'rgba(77,171,154,0.3)',
  blue: 'rgba(82,156,202,0.3)',
  purple: 'rgba(154,109,215,0.3)',
  pink: 'rgba(226,85,161,0.3)',
};

function ColorPopoverBtn({ editor }: { editor: any }) {
  const { t } = useI18n();
  const ctx = useContext(ColorStateCtx);
  // fallback：如果没有 Provider，用 local state（不会跨 unmount 保存，但不崩溃）
  const [localOpen, setLocalOpen] = useState(false);
  const localSavedRef = useRef<{ from: number; to: number } | null>(null);
  const open = ctx?.open ?? localOpen;
  const setOpen = ctx?.setOpen ?? setLocalOpen;
  const savedSelectionRef = ctx?.savedSelectionRef ?? localSavedRef;
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 色板位置（fixed portal），下方空间不够就放按钮上方
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

  const recomputePos = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    // 色板实际高度（若已渲染则精确测量；否则估 210）
    const panelH = panelRef.current?.getBoundingClientRect().height || 210;
    const panelW = panelRef.current?.getBoundingClientRect().width || 240;
    const GAP = 6;
    const vpH = window.innerHeight;
    const vpW = window.innerWidth;
    const spaceBelow = vpH - r.bottom;
    const spaceAbove = r.top;
    // 下方够就放下方，否则若上方更空放上方
    const placeBelow = spaceBelow >= panelH + GAP || spaceBelow >= spaceAbove;
    const top = placeBelow ? r.bottom + GAP : Math.max(8, r.top - panelH - GAP);
    const left = Math.min(Math.max(8, r.left), vpW - panelW - 8);
    setPanelPos({ top, left, placement: placeBelow ? 'bottom' : 'top' });
  }, []);

  useLayoutEffect(() => {
    if (!open) { setPanelPos(null); return; }
    recomputePos();
    // 窗口滚动/resize 时重新计算（色板本身 fixed，但按钮位置变 → 色板要跟随）
    const h = () => recomputePos();
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => {
      window.removeEventListener('scroll', h, true);
      window.removeEventListener('resize', h);
    };
  }, [open, recomputePos]);

  // 色板渲染完之后再测一次精确高度（第一次是估算值）
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const id = window.requestAnimationFrame(recomputePos);
    return () => window.cancelAnimationFrame(id);
  }, [open, recomputePos]);

  // 🔧 真正的根因修复：
  // BlockNote 的 FormattingToolbarExtension 在 editor DOM 监听 pointerdown，
  // 在 document 监听 pointerup(capture)。当用户点击工具栏按钮时：
  // ① pointerdown 发生（早于 mousedown）
  // ② button 默认行为：偷走 focus、清空 editor selection
  // ③ pointerup 触发 extension 重新评估：selection.empty === true → 关闭工具栏
  // 必须在 pointerdown 阶段 preventDefault 才能阻止 focus 转移。
  // onMouseDown preventDefault 太晚，focus 已经转移。
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const handler = (e: PointerEvent) => e.preventDefault();
    wrap.addEventListener('pointerdown', handler, true);
    return () => wrap.removeEventListener('pointerdown', handler, true);
  }, []);

  // 色板 portal 到 body，同样需要 native preventDefault 阻止 ProseMirror 偷走选区
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const handler = (e: PointerEvent) => e.preventDefault();
    panel.addEventListener('pointerdown', handler, true);
    return () => panel.removeEventListener('pointerdown', handler, true);
  }, [open, panelPos]);

  // ProseMirror 会在 click 后通过 view.setSelection → Selection.collapse
  // 把选区清空（puppeteer 栈追踪验证），onMouseDown preventDefault 挡不住。
  // 对策：点击时保存 ProseMirror state.selection 的 from/to，rAF 后恢复。
  const captureSelection = () => {
    const tt = (editor as any)._tiptapEditor;
    const sel = tt?.state?.selection;
    if (sel && !sel.empty) savedSelectionRef.current = { from: sel.from, to: sel.to };
  };
  const restoreSelection = () => {
    const saved = savedSelectionRef.current;
    if (!saved) return;
    const tt = (editor as any)._tiptapEditor;
    if (!tt) return;
    window.requestAnimationFrame(() => {
      try {
        tt.chain().focus().setTextSelection(saved).run();
      } catch (err) {
        console.error('restoreSelection failed:', err);
      }
    });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // 色板现在 portal 到 body，所以两个 ref 都要检查
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const id = window.requestAnimationFrame(() => document.addEventListener('mousedown', handler));
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const apply = (kind: 'textColor' | 'backgroundColor', color: string) => {
    const saved = savedSelectionRef.current;
    const tt = (editor as any)._tiptapEditor;
    try {
      // 先把选区还原回去（ProseMirror 在 click 后会主动 collapse 选区）
      if (saved && tt) {
        tt.chain().focus().setTextSelection(saved).run();
      }
      if (color === 'default') {
        editor.removeStyles({ [kind]: '' });
      } else {
        editor.addStyles({ [kind]: color });
      }
    } catch (err) {
      console.error('Apply color failed:', err);
    }
    setOpen(false);
  };

  const active = (editor.getActiveStyles?.() ?? {}) as { textColor?: string; backgroundColor?: string };

  return (
    <div ref={wrapRef} data-nexo-color-popover="" style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={captureSelection}
        onClick={() => {
          setOpen((o) => !o);
          restoreSelection();
        }}
        title={t('color.title')}
        aria-label={t('color.title')}
        style={{
          ...toolbarBtnStyle,
          background: open ? 'var(--ca-butHovBac)' : 'transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ca-butHovBac)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = open ? 'var(--ca-butHovBac)' : 'transparent'; }}
      >
        <Palette style={{ width: '14px', height: '14px', color: active.textColor && active.textColor !== 'default' ? BN_TEXT_SWATCH[active.textColor] : 'var(--c-icoPri)' }} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          data-nexo-color-popover=""
          className="nx-fadein-fast"
          style={{
            position: 'fixed',
            top: panelPos?.top ?? -9999,
            left: panelPos?.left ?? -9999,
            visibility: panelPos ? 'visible' : 'hidden',
            padding: '6px 4px',
            background: 'var(--c-bacPri)',
            border: '1px solid var(--c-borPri)',
            borderRadius: 'var(--nx-radius-std)',
            boxShadow: 'var(--c-shaOutMd)',
            zIndex: Z.POPOVER,
            minWidth: '240px',
            maxWidth: 'calc(100vw - 16px)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--c-texTer)', padding: '2px 6px 4px' }}>
            {t('color.text')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', padding: '0 4px 4px' }}>
            {BN_COLORS.map((c) => {
              const isActive = (active.textColor ?? 'default') === c;
              return (
                <button
                  key={`t-${c}`}
                  type="button"
                  onPointerDown={captureSelection}
                  onClick={() => apply('textColor', c)}
                  title={t(`color.name.${c}`)}
                  aria-label={t(`color.name.${c}`)}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '4px',
                    border: `1px solid ${isActive ? 'var(--nx-blue)' : 'var(--c-borPri)'}`,
                    background: 'var(--c-bacPri)',
                    color: BN_TEXT_SWATCH[c],
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  A
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--c-texTer)', padding: '6px 6px 4px', borderTop: '1px solid var(--c-borSec)', marginTop: '2px' }}>
            {t('color.background')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', padding: '0 4px 2px' }}>
            {BN_COLORS.map((c) => {
              const isActive = (active.backgroundColor ?? 'default') === c;
              return (
                <button
                  key={`b-${c}`}
                  type="button"
                  onPointerDown={captureSelection}
                  onClick={() => apply('backgroundColor', c)}
                  title={t(`color.name.${c}`)}
                  aria-label={t(`color.name.${c}`)}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '4px',
                    border: `1px solid ${isActive ? 'var(--nx-blue)' : 'var(--c-borPri)'}`,
                    background: BN_BG_SWATCH[c],
                    color: 'var(--c-texPri)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {c === 'default' ? '×' : ''}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─────────────── Nexo 风格选中工具栏 ───────────────

function CustomFormattingToolbar({
  editor,
  onRequestExplain,
  onRequestAiWrite,
  onRequestAiCustom,
  onInsertUserNote,
}: {
  editor: any;
  onRequestExplain: (text: string) => void;
  onRequestAiWrite: (text: string, range: { from: number; to: number } | null) => void;
  onRequestAiCustom: (text: string, range: { from: number; to: number } | null) => void;
  onInsertUserNote: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = async () => {
    try {
      const sel = editor.getSelection?.();
      const blocks: unknown[] = sel?.blocks && sel.blocks.length > 0
        ? sel.blocks
        : [editor.getTextCursorPosition?.()?.block].filter(Boolean);
      if (!blocks || blocks.length === 0) return;
      const md = (await editor.blocksToMarkdownLossy(blocks)) as string;
      const text = (md || '').trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // swallow — 无可用选区
    }
  };

  const handleExplain = () => {
    const selected = editor.getSelectedText?.() ?? '';
    if (!selected.trim()) return;
    onRequestExplain(selected);
  };

  const handleAiWrite = () => {
    const selected = editor.getSelectedText?.() ?? '';
    if (!selected.trim()) return;
    // 保存当前选区范围，工具栏消失后才能准确替换原文
    const tt = editor._tiptapEditor;
    const range = tt ? { from: tt.state.selection.from, to: tt.state.selection.to } : null;
    onRequestAiWrite(selected, range);
  };

  const handleAiCustom = () => {
    const selected = editor.getSelectedText?.() ?? '';
    if (!selected.trim()) return;
    const tt = editor._tiptapEditor;
    const range = tt ? { from: tt.state.selection.from, to: tt.state.selection.to } : null;
    onRequestAiCustom(selected, range);
  };

  const handleToggleHighlight = () => {
    const styles = editor.getActiveStyles?.() ?? {};
    const currentBg = styles.backgroundColor;
    const colors = ['rgba(255, 212, 0, 0.35)', 'rgba(0, 200, 83, 0.25)', 'rgba(0, 120, 255, 0.2)', 'rgba(255, 0, 128, 0.2)'];
    // 若当前无高亮 → 黄色；若为本组色 → 推进到下一档；若走到末尾 → 清除
    if (!currentBg) {
      editor.addStyles({ backgroundColor: colors[0] });
      return;
    }
    const idx = colors.indexOf(currentBg);
    if (idx === -1) {
      // 不是本组的高亮色（可能用户用了 ColorStyleButton）— 直接清除避免"换成黄色"的惊吓
      editor.removeStyles({ backgroundColor: '' });
      return;
    }
    if (idx >= colors.length - 1) {
      editor.removeStyles({ backgroundColor: '' });
    } else {
      editor.addStyles({ backgroundColor: colors[idx + 1] });
    }
  };

  return (
    <FormattingToolbar>
      {/* 行 1: 块类型 + 粗/斜/下划线/删除线 */}
      <BlockTypeSelect key="blockTypeSelect" />
      <BasicTextStyleButton basicTextStyle="bold" key="bold" />
      <BasicTextStyleButton basicTextStyle="italic" key="italic" />
      <BasicTextStyleButton basicTextStyle="underline" key="underline" />
      <BasicTextStyleButton basicTextStyle="strike" key="strike" />
      <BasicTextStyleButton basicTextStyle="code" key="code" />
      <ColorPopoverBtn key="colorStyle" editor={editor} />
      <TextAlignButton textAlignment="left" key="alignLeft" />
      <TextAlignButton textAlignment="center" key="alignCenter" />
      <TextAlignButton textAlignment="right" key="alignRight" />
      <CreateLinkButton key="createLink" />
      <NestBlockButton key="nestBlock" />
      <UnnestBlockButton key="unnestBlock" />
      {/* AI 解释 */}
      <TBtn title={t('ai.explain')} onClick={handleExplain}>
        <Sparkles style={{ width: '14px', height: '14px', color: '#8b5cf6' }} />
      </TBtn>
      {/* AI 写作 */}
      <TBtn title={t('aiWrite.title')} onClick={handleAiWrite}>
        <Wand2 style={{ width: '14px', height: '14px', color: '#2eaadc' }} />
      </TBtn>
      {/* AI 自定义提问 */}
      <TBtn title={t('aiCustom.title')} onClick={handleAiCustom}>
        <MessageCircleQuestion style={{ width: '14px', height: '14px', color: '#ec4899' }} />
      </TBtn>
      {/* 使用者备注 */}
      <TBtn title={t('userNote.insert')} onClick={onInsertUserNote}>
        <StickyNote style={{ width: '14px', height: '14px', color: '#d97706' }} />
      </TBtn>
      {/* 高亮标记 */}
      <TBtn title={t('highlight.title')} onClick={handleToggleHighlight}>
        <Highlighter style={{ width: '14px', height: '14px', color: '#dfab01' }} />
      </TBtn>
      {/* 复制 Markdown */}
      <TBtn title={copied ? t('common.copied') : t('read.copyMarkdown')} onClick={handleCopyMarkdown}>
        {copied ? (
          <Check style={{ width: '14px', height: '14px', color: '#16a34a' }} />
        ) : (
          <Copy style={{ width: '14px', height: '14px', color: 'var(--c-icoSec)' }} />
        )}
      </TBtn>
    </FormattingToolbar>
  );
}

// ─────────────── EditorTOC ───────────────

interface TocEntry {
  id: string;
  level: number;
  text: string;
}

export function EditorTOC({ editor }: { editor: any }) {
  const [items, setItems] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const scanRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const { t } = useI18n();

  const extractHeadings = useCallback(() => {
    if (!editor) return;
    const headings: TocEntry[] = [];
    for (const block of editor.document) {
      if (block.type === 'heading' && block.content) {
        const text = block.content
          .map((c: any) => (typeof c === 'string' ? c : c.text ?? ''))
          .join('');
        if (text.trim()) {
          headings.push({ id: block.id, level: block.props?.level ?? 1, text });
        }
      }
    }
    setItems(headings);
  }, [editor]);

  useEffect(() => {
    extractHeadings();
  }, [extractHeadings]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (scanRef.current) clearTimeout(scanRef.current);
      scanRef.current = setTimeout(extractHeadings, 300);
    };
    const unsubscribe = editor.onChange(handler);
    return () => {
      if (scanRef.current) clearTimeout(scanRef.current);
      unsubscribe();
    };
  }, [editor, extractHeadings]);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.getAttribute('data-id') ?? '');
          }
        }
      },
      { rootMargin: '-20% 0% -70% 0%', threshold: 0 }
    );
    for (const item of items) {
      const el = document.querySelector(`[data-id="${item.id}"]`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const handleClick = useCallback(
    (id: string) => {
      if (!editor) return;
      editor.focus();
      editor.setTextCursorPosition(id, 'end');
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [editor]
  );

  useEffect(() => {
    if (!activeId) return;
    const li = itemRefs.current.get(activeId);
    if (!li) return;
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  if (items.length === 0) return null;

  return (
    <nav aria-label={t('toc.title')} style={{ cursor: 'default' }}>
      <p
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--c-texSec)',
          letterSpacing: '0',
          marginBottom: '12px',
        }}
      >
        {t('toc.title')}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleClick(item.id); }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  padding: '3px 0',
                  paddingLeft: `${(item.level - 1) * 12 + 8}px`,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--nx-blue)' : 'var(--c-texTer)',
                  background: 'transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeftStyle: 'solid',
                  borderLeftWidth: '2px',
                  borderLeftColor: isActive ? 'var(--nx-blue)' : 'transparent',
                  cursor: 'pointer',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--c-texSec)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--c-texTer)';
                }}
              >
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─────────────── Component ───────────────

interface SubPage {
  name: string;
  path: string;
  isFolder: boolean;
}

interface EditorBlockEditorProps {
  content: string;
  articlePath: string;
  articleId: string | null;
  /** 当前页面是否为父页面（目录） */
  isFolder?: boolean;
  onSaveStateChange?: (state: 'saved' | 'saving' | 'unsaved') => void;
  onCreatePage?: (parentPath: string) => void;
  subPages?: SubPage[];
  onSelectSubPage?: (path: string) => void;
  /** 本次打开是"刚通过 create 创建"的空页面：进入后聚焦首个 H1；光标离开若仍为空则补默认 */
  isJustCreated?: boolean;
  /** 空标题兜底文案（来自 i18n） */
  defaultTitleFallback?: string;
  /** 兜底动作完成 or 用户开始输入 / 离开，通知父组件清除 isJustCreated */
  onJustCreatedConsumed?: () => void;
  /** 标题→文件名同步触发：editor 改完文件名后通知父组件更新路径状态（不要重载内容） */
  onPathRenamed?: (oldPath: string, newPath: string) => void;
}

// 把标题文本净化为合法文件名片段
function sanitizeTitleToFilename(raw: string): string {
  return raw
    .replace(/[<>:"/\\|?*\n\r\t]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

export function EditorBlockEditor({
  content,
  articlePath,
  articleId,
  isFolder = false,
  onSaveStateChange,
  onCreatePage,
  subPages,
  onSelectSubPage,
  isJustCreated,
  defaultTitleFallback,
  onJustCreatedConsumed,
  onPathRenamed,
}: EditorBlockEditorProps) {
  const { t, locale: i18nLocale } = useI18n();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const prevContentRef = useRef(content);
  const prevSubPagesRef = useRef<SubPage[]>([]);
  const prevPageLinkOrderRef = useRef<string[]>([]);
  const articlePathRef = useRef(articlePath);
  const isFolderRef = useRef(isFolder);
  // 防并发改名 + 记录最近一次改名结果，避免回环触发
  const renameInflightRef = useRef(false);
  const lastRenameAttemptRef = useRef<string>('');
  const [editorReady, setEditorReady] = useState(false);
  const [docProperties, setDocProperties] = useState<Frontmatter>({});
  const docPropertiesRef = useRef<Frontmatter>({});
  const iconCoverRef = useRef<PageIconCoverHandle>(null);
  const propsPanelRef = useRef<DocumentPropertiesPanelHandle>(null);
  // AI 面板 state 提升到顶层 —— 工具栏浮层重建不会导致面板丢失
  const [aiPanelText, setAiPanelText] = useState<string | null>(null);
  const [aiWriteCtx, setAiWriteCtx] = useState<{ text: string; range: { from: number; to: number } | null } | null>(null);
  const [aiCustomCtx, setAiCustomCtx] = useState<{ text: string; range: { from: number; to: number } | null } | null>(null);

  // 保存失败提示 toast
  const [saveError, setSaveError] = useState<string | null>(null);
  const showSaveError = useCallback((msg: string) => {
    setSaveError(msg);
    window.setTimeout(() => setSaveError(null), 4500);
  }, []);

  // 块菜单成功操作 toast（提取子页/复制/etc）
  const [infoToast, setInfoToast] = useState<string | null>(null);
  const showInfoToast = useCallback((msg: string) => {
    setInfoToast(msg);
    window.setTimeout(() => setInfoToast(null), 2000);
  }, []);

  // 用 ref 跟踪"刚创建"标记，避免 loadContent useCallback 依赖爆炸
  const isJustCreatedRef = useRef<boolean>(!!isJustCreated);
  useEffect(() => { isJustCreatedRef.current = !!isJustCreated; }, [isJustCreated]);
  const defaultTitleRef = useRef<string>(defaultTitleFallback || '');
  useEffect(() => { defaultTitleRef.current = defaultTitleFallback || ''; }, [defaultTitleFallback]);
  const onJustCreatedConsumedRef = useRef<typeof onJustCreatedConsumed>(onJustCreatedConsumed);
  useEffect(() => { onJustCreatedConsumedRef.current = onJustCreatedConsumed; }, [onJustCreatedConsumed]);

  // 颜色按钮 state 也提升到顶层：
  // BlockNote 在 selection collapse→restore 过程中会 unmount 再 mount
  // CustomFormattingToolbar，放在工具栏内部的任何 useState 都会被重置，
  // 这也是颜色按钮"点一下就消失"的最终根因。
  const [colorOpen, setColorOpen] = useState(false);
  const savedColorSelectionRef = useRef<{ from: number; to: number } | null>(null);

  // ⚠️ 关键：BlockNote 的 FormattingToolbarController 把 formattingToolbar 当作组件类型
  // 渲染 (React.createElement(s, {}))。如果 render 函数每次 render 都是新引用，
  // React 会认为组件类型变了，强制 unmount/remount 整个工具栏子树，
  // 内部 useState 被重置 —— 这是"点颜色按钮色板就消失"的根因。
  // 必须用 useCallback 稳定所有传进去的回调和 render 函数。
  const handleRequestExplain = useCallback((text: string) => {
    setAiPanelText(text);
  }, []);
  const handleRequestAiWrite = useCallback(
    (text: string, range: { from: number; to: number } | null) => {
      setAiWriteCtx({ text, range });
    },
    [],
  );
  const handleRequestAiCustom = useCallback(
    (text: string, range: { from: number; to: number } | null) => {
      setAiCustomCtx({ text, range });
    },
    [],
  );

  // 解析 frontmatter 属性
  useEffect(() => {
    const { frontmatter } = parseFrontmatter(content);
    setDocProperties(frontmatter);
    docPropertiesRef.current = frontmatter;
  }, [content]);

  useEffect(() => { articlePathRef.current = articlePath; }, [articlePath]);
  useEffect(() => { isFolderRef.current = isFolder; }, [isFolder]);

  // 监听 pageLink 点击事件
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail?.path;
      if (path && onSelectSubPage) onSelectSubPage(path);
    };
    window.addEventListener('nexo:pagelink-click', handler);
    return () => window.removeEventListener('nexo:pagelink-click', handler);
  }, [onSelectSubPage]);

  // 用事件捕获阶段拦截编辑器内的链接点击（在 BlockNote 阻止冒泡之前）
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handler = (e: Event) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      // 外部链接：阻止默认跳转，改为新标签页打开
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
        e.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }

      // 锚点链接直接跳过
      if (href.startsWith('#')) return;

      // 内部链接：阻止默认跳转，转为应用内导航
      e.preventDefault();
      e.stopPropagation();
      let docPath = decodeURIComponent(href);
      // 剥掉 Markdown `<url>` 语法残留的尖括号
      docPath = docPath.replace(/^</, '').replace(/>$/, '');
      docPath = docPath.replace(/^\//, '').replace(/\.md$/, '');
      // 如果是相对路径，基于当前文档目录解析
      if (!docPath.startsWith('/') && articlePathRef.current.includes('/')) {
        const parentDir = articlePathRef.current.split('/').slice(0, -1).join('/');
        docPath = parentDir + '/' + docPath;
      }
      const event = new CustomEvent('nexo:pagelink-click', { detail: { path: docPath } });
      window.dispatchEvent(event);
    };

    // 使用 capture: true 确保在 BlockNote 内部处理之前拦截
    container.addEventListener('click', handler, true);
    return () => container.removeEventListener('click', handler, true);
  }, []);

  // 标题 → 文件名同步：从 markdown 抽取首个 H1，若与当前 basename 不一致则改名
  const syncTitleToFilename = useCallback(async (markdown: string) => {
    if (renameInflightRef.current) return;
    const oldPath = articlePathRef.current;
    if (!oldPath) return;

    const titleMatch = markdown.match(/^#\s+(.+?)\s*$/m);
    if (!titleMatch) return;
    const sanitized = sanitizeTitleToFilename(titleMatch[1]);
    if (!sanitized) return;

    const oldName = oldPath.split('/').pop() || '';
    if (sanitized === oldName) return;
    if (lastRenameAttemptRef.current === sanitized) return;

    const parent = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
    const newPath = parent ? `${parent}/${sanitized}` : sanitized;
    const url = isFolderRef.current ? '/api/folders' : '/api/articles';
    const method = isFolderRef.current ? 'PUT' : 'PATCH';

    lastRenameAttemptRef.current = sanitized;
    renameInflightRef.current = true;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      const json = await res.json();
      if (json.ok) {
        const finalPath = json.data?.newPath || newPath;
        articlePathRef.current = finalPath;
        onPathRenamed?.(oldPath, finalPath);
      }
      // 失败（重名/非法）静默：保留旧文件名，不打扰用户
    } catch {
      // 网络错误也静默
    } finally {
      renameInflightRef.current = false;
    }
  }, [onPathRenamed]);

  const save = useCallback(
    async (markdown: string) => {
      if (!articlePathRef.current) return;
      onSaveStateChange?.('saving');
      // 如果有 frontmatter 属性，重新序列化
      const fm = docPropertiesRef.current;
      const hasProps = Object.keys(fm).length > 0;
      const fullContent = hasProps ? serializeFrontmatter(fm, markdown) : markdown;
      try {
        const res = await fetch('/api/articles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: articlePathRef.current, content: fullContent }),
        });
        const json = await res.json();
        if (json.ok) {
          onSaveStateChange?.('saved');
          // 保存成功后异步同步文件名（不阻塞 saved 状态）
          void syncTitleToFilename(markdown);
        } else {
          onSaveStateChange?.('unsaved');
          showSaveError(`保存失败: ${json.error || '未知错误'}`);
        }
      } catch (err) {
        onSaveStateChange?.('unsaved');
        const msg = err instanceof Error ? err.message : '网络错误';
        showSaveError(`保存失败（网络）: ${msg}`);
      }
    },
    [onSaveStateChange, showSaveError, syncTitleToFilename]
  );

  // 稳定 uploadFile 引用，避免 useCreateBlockNote 重建 editor 实例
  const uploadFileStable = useCallback(async (file: File) => {
    const fd = new FormData();
    fd.append('image', file, file.name);
    const res = await fetch('/api/uploads', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.ok && json.data?.url) return json.data.url;
    throw new Error('Upload failed');
  }, []);

  // 编辑器初始化时按当前 locale 选一次 dict；后续切换语言需要刷新页面才生效，
  // 避免编辑器实例频繁重建导致选区/历史丢失。
  const initialBnDictRef = useRef(i18nLocale === 'en' ? bnEn : bnZh);

  const editor = useCreateBlockNote({
    schema,
    uploadFile: uploadFileStable,
    dictionary: initialBnDictRef.current,
  });

  // 工具栏：插入"使用者备注" block
  const handleInsertUserNote = useCallback(() => {
    if (!editor) return;
    try {
      const sel = editor.getSelection?.();
      const selBlocks = sel?.blocks;
      const anchor = selBlocks && selBlocks.length > 0
        ? selBlocks[selBlocks.length - 1]
        : editor.getTextCursorPosition?.()?.block;
      if (!anchor) return;
      const inserted = editor.insertBlocks(
        [{ type: 'userNote' as any, content: [] }],
        anchor,
        'after',
      );
      const newBlock = Array.isArray(inserted) ? inserted[0] : null;
      if (newBlock?.id) {
        const tt = (editor as any)._tiptapEditor;
        try { tt?.commands?.blur?.(); } catch { /* ignore */ }
        setTimeout(() => {
          try {
            editor.focus();
            editor.setTextCursorPosition(newBlock.id, 'end');
          } catch { /* ignore */ }
        }, 30);
      }
    } catch (err) {
      console.error('插入备注失败:', err);
    }
  }, [editor]);

  // 块菜单：把当前块提取为子页面（POST /api/articles 创建文档 + 用 PageLink 替换原块）
  const handleExtractSubpage = useCallback(
    async (block: any, blockMarkdown: string) => {
      const md = (blockMarkdown || '').trim();
      const firstLine = md.split('\n').find((l) => l.trim()) ?? '';
      const cleanTitle = firstLine
        .replace(/^#+\s*/, '')
        .replace(/^[-*+>`]+\s*/, '')
        .replace(/[<>:"/\\|?*]/g, '')
        .trim();
      const title = (cleanTitle.slice(0, 30) || 'Untitled').replace(/\s+/g, ' ');
      const slug = title.replace(/\s+/g, '-');
      const parent = articlePathRef.current;
      const subPath = parent ? `${parent}/${slug}` : slug;
      const fileMd = `# ${title}\n\n${md}\n`;
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: subPath, content: fileMd }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'create failed');
      try {
        editor.insertBlocks(
          [{ type: 'pageLink', props: { pageName: title, pagePath: subPath } }],
          block,
          'before',
        );
        editor.removeBlocks([block]);
      } catch (err) {
        console.error('replace block with pageLink failed:', err);
      }
    },
    [editor],
  );

  const handlePropertiesChange = useCallback(
    async (newProps: Frontmatter) => {
      setDocProperties(newProps);
      docPropertiesRef.current = newProps;
      if (!editor || !articlePathRef.current) return;
      onSaveStateChange?.('saving');
      const contentBlocks = editor.document.filter((b: any) => b.type !== 'pageLink');
      const md = await editor.blocksToMarkdownLossy(transformUserNotesForSave(contentBlocks));
      const fullContent = serializeFrontmatter(newProps, md);
      try {
        const res = await fetch('/api/articles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: articlePathRef.current, content: fullContent }),
        });
        const json = await res.json();
        onSaveStateChange?.(json.ok ? 'saved' : 'unsaved');
      } catch {
        onSaveStateChange?.('unsaved');
      }
    },
    [editor, onSaveStateChange]
  );

  const loadContent = useCallback(async (md: string, pages: SubPage[]) => {
    if (!editor) return;
    isLoadingRef.current = true;
    try {
      const parsed = await editor.tryParseMarkdownToBlocks(md);
      const blocks = transformUserNotesAfterLoad(parsed);
      const pageLinkBlocks = pages.map((sub) => ({
        type: 'pageLink' as const,
        props: {
          pageName: sub.name || sub.path.split('/').pop() || '',
          pagePath: sub.path,
        },
      }));
      const allBlocks = [...blocks, ...pageLinkBlocks];
      editor.replaceBlocks(editor.document, allBlocks);
      prevPageLinkOrderRef.current = pageLinkBlocks.map((b) => {
        const p = b.props.pagePath;
        return p.split('/').pop() || p;
      });
      // replaceBlocks 会让 ProseMirror 产生一个横跨新内容的选区，
      // 进而让 FormattingToolbar 在页面加载完就直接挂着。
      // 分两种情况：
      // - 刚通过 create 创建的新页面：聚焦首个 H1，方便直接输入标题
      // - 其他情况：主动折叠选区 + 失焦，避免工具栏误激活
      try {
        const tt = (editor as any)._tiptapEditor;
        if (isJustCreatedRef.current) {
          // 若空 markdown（如 '# '）被 parser 丢成空文档，主动补一个空 H1
          let first = editor.document[0];
          if (!first || first.type !== 'heading') {
            editor.insertBlocks(
              [{ type: 'heading', props: { level: 1 }, content: [] }],
              first ?? undefined,
              first ? 'before' : 'after',
            );
            first = editor.document[0];
          }
          if (first && first.type === 'heading') {
            editor.focus();
            editor.setTextCursorPosition(first.id, 'end');
          } else {
            tt?.commands?.setTextSelection?.(0);
            tt?.commands?.blur?.();
          }
        } else {
          tt?.commands?.setTextSelection?.(0);
          tt?.commands?.blur?.();
        }
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('Failed to parse content:', err);
    }
    // 延迟重置 isLoadingRef，确保 replaceBlocks 触发的异步 onChange 被过滤掉
    requestAnimationFrame(() => {
      setTimeout(() => { isLoadingRef.current = false; }, 50);
    });
  }, [editor]);

  // 合并为单一 effect：首次加载 + 内容变更时重新加载
  useEffect(() => {
    if (!editor) return;
    // 首次加载：editorReady 为 false，有内容可加载
    if (!editorReady) {
      if (!content && (!subPages || subPages.length === 0)) return;
      (async () => {
        await loadContent(content || '', subPages || []);
        prevContentRef.current = content;
        prevSubPagesRef.current = subPages || [];
        setEditorReady(true);
      })();
      return;
    }
    // 后续更新：仅当内容真正变化时重新加载
    const contentChanged = content !== prevContentRef.current;
    const subPagesChanged = JSON.stringify(subPages) !== JSON.stringify(prevSubPagesRef.current);
    if (!contentChanged && !subPagesChanged) return;

    prevContentRef.current = content;
    prevSubPagesRef.current = subPages || [];
    (async () => {
      await loadContent(content, subPages || []);
      onSaveStateChange?.('saved');
    })();
  }, [editor, content, subPages, editorReady, loadContent, onSaveStateChange]);

  const handleChange = useCallback(async () => {
    if (isLoadingRef.current || !editor) return;
    onSaveStateChange?.('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const contentBlocks = editor.document.filter((b: any) => b.type !== 'pageLink');
      const md = await editor.blocksToMarkdownLossy(transformUserNotesForSave(contentBlocks));
      void save(md);

      const pageLinkBlocks = editor.document.filter((b: any) => b.type === 'pageLink');
      if (pageLinkBlocks.length > 0) {
        const order = pageLinkBlocks.map((b: any) => {
          const p = b.props.pagePath as string;
          return p.split('/').pop() || p;
        });
        const prev = prevPageLinkOrderRef.current;
        const orderChanged =
          order.length !== prev.length || order.some((n, i) => n !== prev[i]);
        if (orderChanged) {
          const parentPath = articlePathRef.current;
          try {
            await fetch('/api/sort-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parentPath, order }),
            });
            prevPageLinkOrderRef.current = order;
          } catch {
            // ignore
          }
        }
      }
    }, 1200);
  }, [editor, save, onSaveStateChange]);

  // 新页面标题兜底：光标离开首个空 H1 时，自动填入默认标题；用户只要输入了
  // 任意字符，就立刻消费 flag 不再自动兜底，避免打扰后续编辑。
  useEffect(() => {
    if (!editor || !isJustCreated) return;
    const tt = (editor as any)._tiptapEditor;
    if (!tt) return;

    const getFirstHeadingText = () => {
      const first = editor.document[0];
      if (!first || first.type !== 'heading') return { block: null, text: '' };
      const text = (first.content ?? [])
        .map((c: any) => (typeof c === 'string' ? c : c?.text ?? ''))
        .join('')
        .trim();
      return { block: first, text };
    };

    const handleSelection = () => {
      const { block, text } = getFirstHeadingText();
      if (!block) {
        onJustCreatedConsumedRef.current?.();
        return;
      }
      const cursor = editor.getTextCursorPosition?.();
      const cursorInFirst = cursor?.block?.id === block.id;
      if (cursorInFirst) return;
      // 光标已离开首个 H1：空则补默认；非空说明用户已经填过，直接消费 flag
      if (text === '') {
        try {
          editor.updateBlock(block, {
            type: 'heading',
            props: { ...(block.props ?? {}), level: 1 },
            content: [{ type: 'text', text: defaultTitleRef.current || 'Untitled', styles: {} }],
          });
        } catch (err) {
          console.error('auto-fill title failed:', err);
        }
      }
      onJustCreatedConsumedRef.current?.();
    };

    tt.on('selectionUpdate', handleSelection);
    return () => { tt.off('selectionUpdate', handleSelection); };
  }, [editor, isJustCreated]);

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (editor && articlePathRef.current) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          const contentBlocks = editor.document.filter((b: any) => b.type !== 'pageLink');
          const md = await editor.blocksToMarkdownLossy(contentBlocks);
          void save(md);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor, save]);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const getSlashMenuItems = useMemo(() => {
    return async (query: string) => {
      const defaultItems = getDefaultReactSlashMenuItems(editor);
      const createPageItem = {
        title: t('bn.newSubPage'),
        subtext: t('bn.newSubPageDesc'),
        group: t('bn.pageGroup'),
        onItemClick: () => {
          onCreatePage?.(articlePathRef.current);
        },
        aliases: ['page', 'subpage', '页面'],
        icon: <span style={{ fontSize: '14px' }}>📄</span>,
      };
      return filterSuggestionItems([...defaultItems, createPageItem], query);
    };
  }, [editor, onCreatePage, t]);

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxSrc(null);
    };
    window.addEventListener('keydown', handler);
    // 打开 lightbox 时锁滚动，避免底层编辑器被滚动
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxSrc]);

  const handleEditorDblClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' && (target as HTMLImageElement).src) {
      setLightboxSrc((target as HTMLImageElement).src);
    }
  }, []);

  const handleBlankClick = useCallback((e: React.MouseEvent) => {
    if (!editor) return;
    const target = e.target as HTMLElement;
    if (target.closest('.bn-editor') || target.closest('.nx-layout-toc')) return;
    const blocks = editor.document;
    if (blocks.length === 0) return;
    const lastBlock = blocks[blocks.length - 1];
    editor.focus();
    editor.setTextCursorPosition(lastBlock.id, 'end');
  }, [editor]);

  // ⚠️ formattingToolbar render 函数必须稳定引用
  // 见上方说明：BlockNote 用 React.createElement(s, {}) 把 s 当组件类型，
  // 引用变 => unmount/remount => 内部 state（颜色面板 open 等）丢失
  const renderFormattingToolbar = useCallback(
    () => (
      <CustomFormattingToolbar
        editor={editor}
        onRequestExplain={handleRequestExplain}
        onRequestAiWrite={handleRequestAiWrite}
        onRequestAiCustom={handleRequestAiCustom}
        onInsertUserNote={handleInsertUserNote}
      />
    ),
    [editor, handleRequestExplain, handleRequestAiWrite, handleRequestAiCustom, handleInsertUserNote],
  );

  // ColorStateCtx 的 value：colorOpen 变化时 memoize 出新对象，
  // Provider 通知 consumer 重渲染（但 BlockNote toolbar 子树不 unmount）
  const colorCtxValue = useMemo<ColorState>(
    () => ({ open: colorOpen, setOpen: setColorOpen, savedSelectionRef: savedColorSelectionRef }),
    [colorOpen],
  );

  // Notion 风格 SideMenu：每次 articlePath / 关键回调变化时重建组件类型，
  // BlockNote 的 SideMenuController 用 React.createElement 渲染，所以
  // 这里必须 useMemo 稳定引用，否则 sideMenu 会被频繁 unmount。
  const lastEditedAtText = useMemo(() => {
    const u = (docProperties as any)?.updatedAt
      ?? (docProperties as any)?.updated_at
      ?? (docProperties as any)?.lastEditedAt;
    if (typeof u === 'string' && u.trim()) return u;
    try {
      return new Date().toLocaleString(i18nLocale === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, [docProperties, i18nLocale]);

  const NotionSideMenuComp = useMemo(
    () => makeNotionSideMenu({
      articlePath,
      onAskAi: handleRequestExplain,
      onExtractSubpage: handleExtractSubpage,
      onToast: showInfoToast,
      lastEditedAt: lastEditedAtText,
    }),
    [articlePath, handleRequestExplain, handleExtractSubpage, showInfoToast, lastEditedAtText],
  );

  return (
    <div ref={editorContainerRef} className="h-full overflow-auto" style={{ background: 'var(--c-bacPri)', cursor: 'text' }} onClick={handleBlankClick} onDoubleClick={handleEditorDblClick}>
      <div className="nx-layout" style={{ paddingTop: '40px', paddingBottom: '100px' }}>
        <div className="nx-layout-content" style={{ position: 'relative' }}>
          <PageIconCover
            ref={iconCoverRef}
            icon={docProperties.icon as string | undefined}
            cover={docProperties.cover as string | undefined}
            onIconChange={(icon) => handlePropertiesChange({ ...docProperties, icon })}
            onCoverChange={(cover) => handlePropertiesChange({ ...docProperties, cover })}
            hideActions
          />
          {/* 统一 Action Bar：添加图标 | 添加封面 | 添加属性 */}
          <div className="flex items-center flex-wrap gap-1" style={{ marginBottom: '8px' }}>
            {!docProperties.icon && (
              <button
                type="button"
                onClick={() => iconCoverRef.current?.openEmojiPicker()}
                className="nx-hoverable flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{ fontSize: '12px', color: 'var(--c-texTer)' }}
              >
                <SmilePlus className="h-3.5 w-3.5" />
                {t('pageIcon.addIcon')}
              </button>
            )}
            {!docProperties.cover && (
              <button
                type="button"
                onClick={() => iconCoverRef.current?.openCoverInput()}
                className="nx-hoverable flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{ fontSize: '12px', color: 'var(--c-texTer)' }}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {t('pageIcon.addCover')}
              </button>
            )}
            <button
              type="button"
              onClick={() => propsPanelRef.current?.openAddMenu()}
              className="nx-hoverable flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{ fontSize: '12px', color: 'var(--c-texTer)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('props.addProperty')}
            </button>
          </div>
          <DocumentPropertiesPanel
            ref={propsPanelRef}
            properties={docProperties}
            onChange={handlePropertiesChange}
            hideTrigger
          />
          <ColorStateCtx.Provider value={colorCtxValue}>
          <BlockNoteView
            editor={editor}
            onChange={handleChange}
            theme="light"
            slashMenu={false}
            formattingToolbar={false}
            sideMenu={false}
          >
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={getSlashMenuItems}
            />
            <SideMenuController sideMenu={NotionSideMenuComp} />
            <FormattingToolbarController
              formattingToolbar={renderFormattingToolbar}
              floatingUIOptions={{
                // 🔧 核心修复：BlockNote 默认 useDismiss 会在工具栏内点击时误判
                // 为 outside-press 并关闭工具栏（ColorStyleButton 等打开子菜单时
                // 触发的根本原因）。自定义 outsidePress 判断函数：只有真正落在
                // 工具栏 DOM 之外的点击才关闭，且排除我们自定义色板、AI 面板等。
                useDismissProps: {
                  outsidePress: (event) => {
                    const target = event.target as HTMLElement | null;
                    if (!target) return true;
                    // 只有三类元素算 inside：
                    // ① 我们自定义的色板 portal
                    // ② AI 面板 portal
                    // ③ FormattingToolbar 本身（注意 .bn-formatting-toolbar
                    //    也带 .bn-toolbar class，所以这一条已覆盖所有
                    //    合法的工具栏点击，不再兜底 .bn-toolbar —— 否则
                    //    会把 side menu / link toolbar 等也误判为 inside）
                    if (target.closest('[data-nexo-color-popover]')) return false;
                    if (target.closest('[data-nexo-ai-panel]')) return false;
                    if (target.closest('.bn-formatting-toolbar')) return false;
                    return true;
                  },
                },
              }}
            />
          </BlockNoteView>
          </ColorStateCtx.Provider>
        </div>
        <aside className="nx-layout-toc">
          <div
            className="sticky nx-layout-toc-inner"
            style={{
              top: '40px',
              maxHeight: 'calc(100vh - 56px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              paddingRight: '4px',
            }}
          >
            <EditorTOC editor={editor} />
            <BacklinksPanel
              articlePath={articlePath}
              onSelect={(path) => {
                const event = new CustomEvent('nexo:pagelink-click', { detail: { path } });
                window.dispatchEvent(event);
              }}
            />
            <CommentsPanel articlePath={articlePath} />
          </div>
        </aside>
      </div>
      {/* 保存失败 toast */}
      {saveError && (
        <div
          role="alert"
          className="nx-fadein-fast"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 16px',
            background: 'var(--c-bacPri)',
            border: '1px solid rgba(224,62,62,0.3)',
            boxShadow: 'var(--c-shaOutLg)',
            borderRadius: '8px',
            color: 'var(--nx-red)',
            fontSize: '13px',
            zIndex: 400,
            maxWidth: '500px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={16} />
          <span style={{ wordBreak: 'break-word' }}>{saveError}</span>
        </div>
      )}
      {/* 块菜单成功提示 toast */}
      {infoToast && (
        <div
          role="status"
          className="nx-fadein-fast"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 14px',
            background: 'rgba(15,15,15,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'var(--c-shaOutLg)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            zIndex: 400,
            maxWidth: '480px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
          <span style={{ wordBreak: 'break-word' }}>{infoToast}</span>
        </div>
      )}
      {/* AI 解释结果面板（顶层渲染，不受工具栏浮层生命周期影响） */}
      {aiPanelText && (
        <AiExplainPanel
          text={aiPanelText}
          articlePath={articlePath}
          onClose={() => setAiPanelText(null)}
        />
      )}

      {/* AI 写作面板 */}
      {aiWriteCtx && (
        <AiWritePanel
          text={aiWriteCtx.text}
          onClose={() => setAiWriteCtx(null)}
          onReplace={(newText) => {
            if (!editor) return;
            const tt = (editor as any)._tiptapEditor;
            try {
              if (tt && aiWriteCtx.range) {
                tt.chain().focus().setTextSelection(aiWriteCtx.range).insertContent(newText).run();
              } else if (tt) {
                tt.chain().focus().insertContent(newText).run();
              }
            } catch (err) {
              console.error('AI 写作替换失败:', err);
            }
          }}
          onInsert={(newText) => {
            if (!editor) return;
            try {
              const cursor = editor.getTextCursorPosition?.();
              if (cursor?.block) {
                editor.insertBlocks(
                  [{ type: 'paragraph', content: newText }],
                  cursor.block,
                  'after',
                );
              } else {
                const tt = (editor as any)._tiptapEditor;
                tt?.chain().focus().insertContent(`\n\n${newText}`).run();
              }
            } catch (err) {
              console.error('AI 写作插入失败:', err);
            }
          }}
        />
      )}

      {/* AI 自定义提问面板 */}
      {aiCustomCtx && (
        <AiCustomAskPanel
          text={aiCustomCtx.text}
          onClose={() => setAiCustomCtx(null)}
          onInsert={(newText) => {
            if (!editor) return;
            try {
              const cursor = editor.getTextCursorPosition?.();
              if (cursor?.block) {
                editor.insertBlocks(
                  [{ type: 'paragraph', content: newText }],
                  cursor.block,
                  'after',
                );
              } else {
                const tt = (editor as any)._tiptapEditor;
                tt?.chain().focus().insertContent(`\n\n${newText}`).run();
              }
            } catch (err) {
              console.error('AI 自定义提问插入失败:', err);
            }
          }}
        />
      )}

      {/* 切换文档时清空浮动 AI 面板，避免解释上一篇文档的选段 */}
      <AiPanelReset articlePath={articlePath} onReset={() => { setAiPanelText(null); setAiWriteCtx(null); setAiCustomCtx(null); }} />

      {lightboxSrc && (
        <div className="image-lightbox-overlay" role="dialog" aria-label="Image preview" onClick={() => setLightboxSrc(null)}>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
            style={{ position: 'fixed', top: '16px', right: '16px', color: '#fff', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: Z.LIGHTBOX + 1 }}
            aria-label="Close"
          >
            ✕
          </button>
          <img src={lightboxSrc} alt="" />
        </div>
      )}

      {/* 窄屏（≤1279px，含 iPad 横屏 1024）TOC 浮按钮 + 抽屉 */}
      <EditorRightDrawer editor={editor} articlePath={articlePath} />
    </div>
  );
}
