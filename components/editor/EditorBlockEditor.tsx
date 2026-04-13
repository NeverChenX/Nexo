'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { useI18n } from '@/lib/i18n';
import { BacklinksPanel } from '@/components/BacklinksPanel';
import { CommentsPanel } from '@/components/CommentsPanel';

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
            const event = new CustomEvent('pagelink-click', { detail: { path: block.props.pagePath } });
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

// ─────────────── Schema ───────────────

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageLink: PageLink(),
  },
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: defaultStyleSpecs,
});

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
        else setError(json.error || 'Explanation failed');
      } catch {
        if (!cancelled) setError('Request failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [text, articlePath]);

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
        zIndex: 9999,
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
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-texSec)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ✦ AI Explain
        </span>
        <button
          onClick={onClose}
          style={{ color: 'var(--c-icoSec)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '3px', lineHeight: 1, fontSize: '14px' }}
        >✕</button>
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
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Explaining...
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
  width: '32px', height: '28px', borderRadius: '6px', border: 'none',
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

// ─────────────── Nexo 风格选中工具栏 ───────────────

function CustomFormattingToolbar({
  editor,
  articlePath,
}: {
  editor: any;
  articlePath: string;
}) {
  const [aiPanelText, setAiPanelText] = useState<string | null>(null);

  const handleExplain = () => {
    const selected = editor.getSelectedText?.() ?? '';
    if (!selected.trim()) return;
    setAiPanelText(selected);
  };

  return (
    <>
      {/* Nexo 风格浮动工具栏 */}
      <FormattingToolbar>
        {/* 行 1: 块类型 + 粗/斜/下划线/删除线 */}
        <BlockTypeSelect key="blockTypeSelect" />
        <BasicTextStyleButton basicTextStyle="bold" key="bold" />
        <BasicTextStyleButton basicTextStyle="italic" key="italic" />
        <BasicTextStyleButton basicTextStyle="underline" key="underline" />
        <BasicTextStyleButton basicTextStyle="strike" key="strike" />
        <BasicTextStyleButton basicTextStyle="code" key="code" />
        {/* AI 解释 */}
        <TBtn title="AI 解释" onClick={handleExplain}>
          <span style={{ fontSize: '13px', color: '#8b5cf6' }}>✦</span>
        </TBtn>
      </FormattingToolbar>

      {/* AI 解释结果面板 */}
      {aiPanelText && (
        <AiExplainPanel
          text={aiPanelText}
          articlePath={articlePath}
          onClose={() => setAiPanelText(null)}
        />
      )}
    </>
  );
}

// ─────────────── EditorTOC ───────────────

interface TocEntry {
  id: string;
  level: number;
  text: string;
}

function EditorTOC({ editor }: { editor: any }) {
  const [items, setItems] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const scanRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
            <li key={item.id}>
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
                  borderLeft: isActive ? '2px solid var(--nx-blue)' : '2px solid transparent',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--nx-blue)' : 'var(--c-texTer)',
                  background: 'transparent',
                  border: 'none',
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
  onSaveStateChange?: (state: 'saved' | 'saving' | 'unsaved') => void;
  onCreatePage?: (parentPath: string) => void;
  subPages?: SubPage[];
  onSelectSubPage?: (path: string) => void;
}

export function EditorBlockEditor({
  content,
  articlePath,
  articleId,
  onSaveStateChange,
  onCreatePage,
  subPages,
  onSelectSubPage,
}: EditorBlockEditorProps) {
  const { t } = useI18n();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const prevContentRef = useRef(content);
  const prevSubPagesRef = useRef<SubPage[]>([]);
  const articlePathRef = useRef(articlePath);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => { articlePathRef.current = articlePath; }, [articlePath]);

  // 监听 pageLink 点击事件
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail?.path;
      if (path && onSelectSubPage) onSelectSubPage(path);
    };
    window.addEventListener('pagelink-click', handler);
    return () => window.removeEventListener('pagelink-click', handler);
  }, [onSelectSubPage]);

  const save = useCallback(
    async (markdown: string) => {
      if (!articlePathRef.current) return;
      onSaveStateChange?.('saving');
      try {
        const res = await fetch('/api/articles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: articlePathRef.current, content: markdown }),
        });
        const json = await res.json();
        onSaveStateChange?.(json.ok ? 'saved' : 'unsaved');
      } catch {
        onSaveStateChange?.('unsaved');
      }
    },
    [onSaveStateChange]
  );

  const editor = useCreateBlockNote({
    schema,
    uploadFile: async (file: File) => {
      const fd = new FormData();
      fd.append('image', file, file.name);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.ok && json.data?.url) return json.data.url;
      throw new Error('Upload failed');
    },
  });

  const loadContent = useCallback(async (md: string, pages: SubPage[]) => {
    if (!editor) return;
    isLoadingRef.current = true;
    try {
      const blocks = await editor.tryParseMarkdownToBlocks(md);
      const pageLinkBlocks = pages.map((sub) => ({
        type: 'pageLink' as const,
        props: {
          pageName: sub.name || sub.path.split('/').pop() || '',
          pagePath: sub.path,
        },
      }));
      const allBlocks = [...blocks, ...pageLinkBlocks];
      editor.replaceBlocks(editor.document, allBlocks);
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
      const md = await editor.blocksToMarkdownLossy(contentBlocks);
      void save(md);

      const pageLinkBlocks = editor.document.filter((b: any) => b.type === 'pageLink');
      if (pageLinkBlocks.length > 0) {
        const order = pageLinkBlocks.map((b: any) => {
          const p = b.props.pagePath as string;
          return p.split('/').pop() || p;
        });
        const parentPath = articlePathRef.current;
        try {
          await fetch('/api/sort-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentPath, order }),
          });
        } catch {
          // ignore
        }
      }
    }, 1200);
  }, [editor, save, onSaveStateChange]);

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
    return () => window.removeEventListener('keydown', handler);
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

  return (
    <div className="h-full overflow-auto" style={{ background: 'var(--c-bacPri)', cursor: 'text' }} onClick={handleBlankClick} onDoubleClick={handleEditorDblClick}>
      <div className="nx-layout" style={{ paddingTop: '60px', paddingBottom: '100px' }}>
        <div className="nx-layout-content">
          <BlockNoteView
            editor={editor}
            onChange={handleChange}
            theme="light"
            slashMenu={false}
            formattingToolbar={false}
          >
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={getSlashMenuItems}
            />
            <FormattingToolbarController
              formattingToolbar={() => (
                <CustomFormattingToolbar editor={editor} articlePath={articlePathRef.current} />
              )}
            />
          </BlockNoteView>
        </div>
        <aside className="nx-layout-toc">
          <div className="sticky" style={{ top: '60px' }}>
            <EditorTOC editor={editor} />
            <BacklinksPanel
              articlePath={articlePath}
              onSelect={(path) => {
                const event = new CustomEvent('pagelink-click', { detail: { path } });
                window.dispatchEvent(event);
              }}
            />
            <CommentsPanel articlePath={articlePath} />
          </div>
        </aside>
      </div>
      {lightboxSrc && (
        <div className="image-lightbox-overlay" role="dialog" aria-label="Image preview" onClick={() => setLightboxSrc(null)}>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
            style={{ position: 'fixed', top: '16px', right: '16px', color: '#fff', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}
            aria-label="Close"
          >
            ✕
          </button>
          <img src={lightboxSrc} alt="" />
        </div>
      )}
    </div>
  );
}
