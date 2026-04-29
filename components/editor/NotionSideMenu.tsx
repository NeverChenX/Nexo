'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useBlockNoteEditor,
  useExtension,
  useExtensionState,
} from '@blocknote/react';
import { SideMenuExtension, SuggestionMenu } from '@blocknote/core/extensions';
import {
  GripVertical,
  Plus,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Palette,
  FileCode2,
  AlignLeft,
  Link as LinkIcon,
  FileText,
  Sparkles,
  Trash2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Search,
  Check,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Z } from '@/lib/z-index';

// ─────────── 工厂函数：把外部依赖(opts)闭包进 SideMenu 组件 ───────────

export interface NotionSideMenuOptions {
  articlePath: string;
  /** 触发 AI 解释面板（外层 EditorBlockEditor 注册的 setAiPanelText） */
  onAskAi: (text: string) => void;
  /** 把当前块提取为子页面（外层负责创建文档 + 替换为 PageLink） */
  onExtractSubpage: (block: any, blockMarkdown: string) => Promise<void>;
  /** 文档最近编辑时间（来自父级，可空） */
  lastEditedAt?: string;
  /** 短暂提示 toast（外层渲染） */
  onToast?: (msg: string) => void;
}

export function makeNotionSideMenu(opts: NotionSideMenuOptions): React.FC {
  const NotionSideMenu: React.FC = () => {
    const editor = useBlockNoteEditor<any, any, any>();
    const sideMenu = useExtension(SideMenuExtension);
    const block = useExtensionState(SideMenuExtension, {
      selector: (state: any) => state?.block,
    });

    if (!block) return null;

    return (
      <div
        className="bn-side-menu nx-fadein-fast"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
        }}
      >
        <AddBlockBtn block={block} editor={editor} />
        <DragHandleBtn
          block={block}
          editor={editor}
          sideMenu={sideMenu}
          opts={opts}
        />
      </div>
    );
  };
  NotionSideMenu.displayName = 'NotionSideMenu';
  return NotionSideMenu;
}

// ─────────── 加号按钮（点击：插入块 / Alt+点击：AI） ───────────

function AddBlockBtn({ block, editor }: { block: any; editor: any }) {
  const { t } = useI18n();
  const suggestionMenu = useExtension(SuggestionMenu);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const isEmpty =
        Array.isArray(block.content) && block.content.length === 0;
      if (isEmpty) {
        editor.setTextCursorPosition(block);
      } else {
        const inserted = editor.insertBlocks(
          [{ type: 'paragraph' }],
          block,
          'after',
        )[0];
        editor.setTextCursorPosition(inserted);
      }
      suggestionMenu.openSuggestionMenu(e.altKey ? 'AI ' : '/');
    },
    [block, editor, suggestionMenu],
  );

  return (
    <button
      type="button"
      className="bn-button"
      title={t('bn.menu.addBlock')}
      aria-label={t('bn.menu.addBlock')}
      onPointerDown={(e) => e.preventDefault()}
      onClick={handleClick}
      style={btnIconStyle}
    >
      <Plus size={16} />
    </button>
  );
}

// ─────────── 拖动手柄按钮 + Notion 风格下拉菜单 ───────────

function DragHandleBtn({
  block,
  editor,
  sideMenu,
  opts,
}: {
  block: any;
  editor: any;
  sideMenu: any;
  opts: NotionSideMenuOptions;
}) {
  const { t } = useI18n();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next) sideMenu.freezeMenu?.();
      else sideMenu.unfreezeMenu?.();
      return next;
    });
  }, [sideMenu]);

  const handleClose = useCallback(() => {
    setOpen(false);
    sideMenu.unfreezeMenu?.();
  }, [sideMenu]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="bn-button"
        title={t('bn.menu.dragHandle')}
        aria-label={t('bn.menu.dragHandle')}
        draggable
        onDragStart={(e) => sideMenu.blockDragStart(e, block)}
        onDragEnd={() => sideMenu.blockDragEnd()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleToggle}
        style={btnIconStyle}
      >
        <GripVertical size={16} />
      </button>
      {open && (
        <NotionDragMenu
          anchorEl={btnRef.current}
          block={block}
          editor={editor}
          onClose={handleClose}
          opts={opts}
        />
      )}
    </>
  );
}

// ─────────── 主菜单（portal 到 body） ───────────

type View = 'main' | 'turn' | 'color';

function NotionDragMenu({
  anchorEl,
  block,
  editor,
  onClose,
  opts,
}: {
  anchorEl: HTMLElement | null;
  block: any;
  editor: any;
  onClose: () => void;
  opts: NotionSideMenuOptions;
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('main');
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // ─── 位置计算（按钮右侧；底部空间不够则上翻） ───
  const recomputePos = useCallback(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    const W = panelRef.current?.offsetWidth ?? 280;
    const H = panelRef.current?.offsetHeight ?? 420;
    const GAP = 6;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    let left = r.right + GAP;
    if (left + W > vpW - 8) left = Math.max(8, r.left - W - GAP);
    let top = r.top;
    if (top + H > vpH - 8) top = Math.max(8, vpH - H - 8);
    setPos({ top, left });
  }, [anchorEl]);

  useLayoutEffect(() => {
    recomputePos();
    const h = () => recomputePos();
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => {
      window.removeEventListener('scroll', h, true);
      window.removeEventListener('resize', h);
    };
  }, [recomputePos, view]);

  // ─── 键盘 & 外部点击关闭 ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view !== 'main') {
          setView('main');
          setSearch('');
          inputRef.current?.focus();
          e.preventDefault();
          return;
        }
        onClose();
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    // 自动聚焦搜索框
    const focusId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
      window.cancelAnimationFrame(focusId);
    };
  }, [onClose, view, anchorEl]);

  // ─── 块辅助：抽取纯文本 / Markdown ───
  const blockText = useCallback(() => {
    return extractBlockText(block);
  }, [block]);

  const blockMarkdown = useCallback(async () => {
    try {
      return await editor.blocksToMarkdownLossy([block]);
    } catch {
      return blockText();
    }
  }, [editor, block, blockText]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }, []);

  // ─── 操作回调 ───
  const handleCopyMd = useCallback(async () => {
    const md = (await blockMarkdown())?.trim();
    if (md) {
      await copyToClipboard(md);
      opts.onToast?.(t('bn.menu.mdCopied'));
    }
    onClose();
  }, [blockMarkdown, copyToClipboard, opts, t, onClose]);

  const handleCopyText = useCallback(async () => {
    const text = blockText().trim();
    if (text) {
      await copyToClipboard(text);
      opts.onToast?.(t('bn.menu.textCopied'));
    }
    onClose();
  }, [blockText, copyToClipboard, opts, t, onClose]);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.href.split('#')[0]}#${block.id}`;
    await copyToClipboard(url);
    opts.onToast?.(t('bn.menu.linkCopied'));
    onClose();
  }, [block.id, copyToClipboard, opts, t, onClose]);

  const handleAskAi = useCallback(() => {
    const text = blockText().trim();
    if (text) opts.onAskAi(text);
    onClose();
  }, [blockText, opts, onClose]);

  const handleExtract = useCallback(async () => {
    try {
      const md = (await blockMarkdown())?.trim() ?? '';
      await opts.onExtractSubpage(block, md);
      opts.onToast?.(t('bn.menu.subpageCreated'));
    } catch (err) {
      console.error('extract subpage failed:', err);
      opts.onToast?.(t('bn.menu.subpageFailed'));
    }
    onClose();
  }, [blockMarkdown, block, opts, t, onClose]);

  const handleDelete = useCallback(() => {
    editor.removeBlocks([block]);
    onClose();
  }, [editor, block, onClose]);

  // ─── Turn into 处理 ───
  const turnInto = useCallback(
    (target: TurnTarget) => {
      try {
        editor.updateBlock(block, target.update);
      } catch (err) {
        console.error('turn into failed:', err);
      }
      onClose();
    },
    [editor, block, onClose],
  );

  // ─── 颜色处理（块级 props，BlockNote 内置） ───
  const setColor = useCallback(
    (kind: 'text' | 'bg', color: string) => {
      try {
        const propKey = kind === 'text' ? 'textColor' : 'backgroundColor';
        editor.updateBlock(block, {
          props: { [propKey]: color },
        });
      } catch (err) {
        console.error('set color failed:', err);
      }
      onClose();
    },
    [editor, block, onClose],
  );

  // ─── 主菜单条目数据 ───
  const supportsColor =
    'textColor' in (block.props ?? {}) ||
    'backgroundColor' in (block.props ?? {});

  const mainItems = useMemo(() => {
    const items: MainItem[] = [
      {
        id: 'turn',
        icon: <RefreshCw size={16} />,
        label: t('bn.menu.turnInto'),
        kind: 'submenu',
        onClick: () => setView('turn'),
        keywords: 'turn into 转换 修改 类型 type',
      },
    ];
    if (supportsColor) {
      items.push({
        id: 'color',
        icon: <Palette size={16} />,
        label: t('bn.menu.color'),
        kind: 'submenu',
        onClick: () => setView('color'),
        keywords: 'color colour 颜色 背景 高亮',
      });
    }
    items.push(
      { id: 'sep1', kind: 'sep' },
      {
        id: 'copyMd',
        icon: <FileCode2 size={16} />,
        label: t('bn.menu.copyMarkdown'),
        kind: 'action',
        onClick: handleCopyMd,
        keywords: 'copy markdown md 复制',
      },
      {
        id: 'copyText',
        icon: <AlignLeft size={16} />,
        label: t('bn.menu.copyText'),
        kind: 'action',
        onClick: handleCopyText,
        keywords: 'copy text plain 文本 复制 纯',
      },
      {
        id: 'copyLink',
        icon: <LinkIcon size={16} />,
        label: t('bn.menu.copyLink'),
        kind: 'action',
        onClick: handleCopyLink,
        keywords: 'copy link 块链接 锚点 anchor',
      },
      {
        id: 'subpage',
        icon: <FileText size={16} />,
        label: t('bn.menu.toSubpage'),
        kind: 'action',
        onClick: handleExtract,
        keywords: 'subpage page extract 提取 子页面',
      },
      { id: 'sep2', kind: 'sep' },
      {
        id: 'askAi',
        icon: <Sparkles size={16} color="#8b5cf6" />,
        label: t('bn.menu.askAi'),
        kind: 'action',
        onClick: handleAskAi,
        keywords: 'ai ask 解释 explain 询问',
      },
      { id: 'sep3', kind: 'sep' },
      {
        id: 'delete',
        icon: <Trash2 size={16} />,
        label: t('bn.menu.delete'),
        kind: 'action',
        danger: true,
        onClick: handleDelete,
        shortcut: t('bn.menu.deleteShortcut'),
        keywords: 'delete remove 删除',
      },
    );
    return items;
  }, [
    supportsColor,
    t,
    handleCopyMd,
    handleCopyText,
    handleCopyLink,
    handleExtract,
    handleAskAi,
    handleDelete,
  ]);

  // ─── 搜索过滤（仅主视图）───
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mainItems;
    return mainItems.filter((it) => {
      if (it.kind === 'sep') return false;
      const hay = `${it.label} ${it.keywords ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search, mainItems]);

  // ─── 键盘上下选择（仅主视图） ───
  const selectableIdxs = useMemo(
    () =>
      filtered
        .map((it, i) => (it.kind === 'sep' ? -1 : i))
        .filter((i) => i >= 0),
    [filtered],
  );
  useEffect(() => {
    setActiveIdx(selectableIdxs[0] ?? 0);
  }, [selectableIdxs]);

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (view !== 'main') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const cur = selectableIdxs.indexOf(activeIdx);
        const next = selectableIdxs[(cur + 1) % selectableIdxs.length] ?? activeIdx;
        setActiveIdx(next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const cur = selectableIdxs.indexOf(activeIdx);
        const prev =
          selectableIdxs[(cur - 1 + selectableIdxs.length) % selectableIdxs.length] ??
          activeIdx;
        setActiveIdx(prev);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = filtered[activeIdx];
        if (it && it.kind !== 'sep') it.onClick();
      }
    },
    [view, selectableIdxs, activeIdx, filtered],
  );

  // ─── 元信息：lastEdited ───
  const lastEditedText = opts.lastEditedAt
    ? t('bn.menu.lastEdited', { time: opts.lastEditedAt })
    : '';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      className="nx-fadein-fast"
      data-nexo-block-menu=""
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        zIndex: Z.POPOVER,
        width: '270px',
        maxHeight: 'min(70vh, 480px)',
        background: 'var(--c-bacPri)',
        border: '1px solid var(--c-borSec)',
        borderRadius: '10px',
        boxShadow: 'var(--c-shaOutLg), 0 0 0 1px rgba(15,15,15,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '14px',
      }}
    >
      {view === 'main' && (
        <>
          <div style={searchWrapStyle}>
            <Search size={13} style={{ color: 'var(--c-icoSec)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={t('bn.menu.searchPlaceholder')}
              style={searchInputStyle}
            />
          </div>
          <div style={listScrollStyle}>
            {filtered.length === 0 ? (
              <div style={emptyStyle}>{t('bn.menu.noResults')}</div>
            ) : (
              filtered.map((it, idx) => {
                if (it.kind === 'sep') return <Separator key={it.id} />;
                return (
                  <Row
                    key={it.id}
                    item={it}
                    active={idx === activeIdx}
                    onMouseEnter={() => setActiveIdx(idx)}
                  />
                );
              })
            )}
          </div>
          {lastEditedText && (
            <div style={footerStyle} title={lastEditedText}>
              {lastEditedText}
            </div>
          )}
        </>
      )}

      {view === 'turn' && (
        <SubView
          title={t('bn.turn.title')}
          onBack={() => setView('main')}
        >
          {turnTargets(t).map((tgt) => (
            <Row
              key={tgt.id}
              item={{
                id: tgt.id,
                kind: 'action',
                icon: tgt.icon,
                label: tgt.label,
                onClick: () => turnInto(tgt),
              }}
              active={false}
              activeFromMatch={isCurrentBlockType(block, tgt)}
            />
          ))}
        </SubView>
      )}

      {view === 'color' && (
        <SubView title={t('bn.menu.color')} onBack={() => setView('main')}>
          <ColorPanel
            block={block}
            onPick={setColor}
            tText={t('bn.color.text')}
            tBg={t('bn.color.background')}
          />
        </SubView>
      )}
    </div>,
    document.body,
  );
}

// ─────────── 子视图容器 ───────────

function SubView({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        style={subHeaderStyle}
        className="nx-hoverable"
      >
        <ArrowLeft size={14} style={{ color: 'var(--c-icoSec)' }} />
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-texSec)' }}>
          {title}
        </span>
      </button>
      <div style={listScrollStyle}>{children}</div>
    </>
  );
}

// ─────────── 列表行 ───────────

interface BaseItem {
  id: string;
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  keywords?: string;
}
type ActionItem = BaseItem & { kind: 'action'; onClick: () => void };
type SubmenuItem = BaseItem & { kind: 'submenu'; onClick: () => void };
type SepItem = { id: string; kind: 'sep' };
type MainItem = ActionItem | SubmenuItem | SepItem;

function Row({
  item,
  active,
  activeFromMatch,
  onMouseEnter,
}: {
  item: ActionItem | SubmenuItem;
  active: boolean;
  activeFromMatch?: boolean;
  onMouseEnter?: () => void;
}) {
  const isSub = item.kind === 'submenu';
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={item.onClick}
      style={{
        ...rowBaseStyle,
        background: active ? 'var(--ca-butHovBac)' : 'transparent',
        color: item.danger ? 'var(--nx-red, #e03e3e)' : 'var(--c-texPri)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'var(--ca-butHovBac)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = active ? 'var(--ca-butHovBac)' : 'transparent';
      }}
    >
      {item.icon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            color: item.danger ? 'var(--nx-red, #e03e3e)' : 'var(--c-icoPri)',
            flexShrink: 0,
          }}
        >
          {item.icon}
        </span>
      )}
      <span
        style={{
          flex: 1,
          textAlign: 'left',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          fontSize: '14px',
          lineHeight: 1.2,
        }}
      >
        {item.label}
      </span>
      {activeFromMatch && (
        <Check size={14} style={{ color: 'var(--nx-blue)', flexShrink: 0 }} />
      )}
      {item.shortcut && (
        <span style={{ fontSize: '12px', color: 'var(--c-texTer)', flexShrink: 0 }}>
          {item.shortcut}
        </span>
      )}
      {isSub && <ChevronRight size={14} style={{ color: 'var(--c-icoSec)', flexShrink: 0 }} />}
    </button>
  );
}

function Separator() {
  return (
    <div
      style={{
        height: '1px',
        margin: '4px 6px',
        background: 'var(--c-borSec)',
      }}
    />
  );
}

// ─────────── Turn into 目标定义 ───────────

interface TurnTarget {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** 喂给 editor.updateBlock(block, ...) 的 patch */
  update: { type: string; props?: Record<string, unknown> };
  /** 用于在子菜单内显示当前类型 ✓ */
  match: (block: any) => boolean;
}

function turnTargets(t: (k: string) => string): TurnTarget[] {
  return [
    {
      id: 't-paragraph',
      label: t('bn.turn.paragraph'),
      icon: <AlignLeft size={16} />,
      update: { type: 'paragraph' },
      match: (b) => b.type === 'paragraph',
    },
    {
      id: 't-h1',
      label: t('bn.turn.h1'),
      icon: <Heading1 size={16} />,
      update: { type: 'heading', props: { level: 1 } },
      match: (b) => b.type === 'heading' && b.props?.level === 1,
    },
    {
      id: 't-h2',
      label: t('bn.turn.h2'),
      icon: <Heading2 size={16} />,
      update: { type: 'heading', props: { level: 2 } },
      match: (b) => b.type === 'heading' && b.props?.level === 2,
    },
    {
      id: 't-h3',
      label: t('bn.turn.h3'),
      icon: <Heading3 size={16} />,
      update: { type: 'heading', props: { level: 3 } },
      match: (b) => b.type === 'heading' && b.props?.level === 3,
    },
    {
      id: 't-bullet',
      label: t('bn.turn.bulletList'),
      icon: <List size={16} />,
      update: { type: 'bulletListItem' },
      match: (b) => b.type === 'bulletListItem',
    },
    {
      id: 't-numbered',
      label: t('bn.turn.numberedList'),
      icon: <ListOrdered size={16} />,
      update: { type: 'numberedListItem' },
      match: (b) => b.type === 'numberedListItem',
    },
    {
      id: 't-check',
      label: t('bn.turn.checkList'),
      icon: <ListChecks size={16} />,
      update: { type: 'checkListItem' },
      match: (b) => b.type === 'checkListItem',
    },
    {
      id: 't-quote',
      label: t('bn.turn.quote'),
      icon: <Quote size={16} />,
      update: { type: 'quote' },
      match: (b) => b.type === 'quote',
    },
    {
      id: 't-code',
      label: t('bn.turn.code'),
      icon: <Code size={16} />,
      update: { type: 'codeBlock' },
      match: (b) => b.type === 'codeBlock',
    },
  ];
}

function isCurrentBlockType(block: any, tgt: TurnTarget): boolean {
  return tgt.match(block);
}

// ─────────── 颜色面板 ───────────

const SWATCHES = [
  { id: 'default', textColor: 'var(--c-texPri)', bgColor: 'transparent' },
  { id: 'gray', textColor: '#787774', bgColor: 'rgba(155,154,151,0.4)' },
  { id: 'brown', textColor: '#976D57', bgColor: 'rgba(186,133,111,0.3)' },
  { id: 'red', textColor: '#E03E3E', bgColor: 'rgba(255,115,105,0.3)' },
  { id: 'orange', textColor: '#D9730D', bgColor: 'rgba(255,163,68,0.3)' },
  { id: 'yellow', textColor: '#DFAB01', bgColor: 'rgba(255,220,73,0.4)' },
  { id: 'green', textColor: '#0F7B6C', bgColor: 'rgba(77,171,154,0.3)' },
  { id: 'blue', textColor: '#0B6E99', bgColor: 'rgba(82,156,202,0.3)' },
  { id: 'purple', textColor: '#6940A5', bgColor: 'rgba(154,109,215,0.3)' },
  { id: 'pink', textColor: '#AD1A72', bgColor: 'rgba(226,85,161,0.3)' },
];

function ColorPanel({
  block,
  onPick,
  tText,
  tBg,
}: {
  block: any;
  onPick: (kind: 'text' | 'bg', color: string) => void;
  tText: string;
  tBg: string;
}) {
  const supportsText = 'textColor' in (block.props ?? {});
  const supportsBg = 'backgroundColor' in (block.props ?? {});
  const curText = block.props?.textColor ?? 'default';
  const curBg = block.props?.backgroundColor ?? 'default';

  return (
    <div style={{ padding: '4px 6px 8px' }}>
      {supportsText && (
        <>
          <div style={colorGroupLabel}>{tText}</div>
          <div style={swatchRowStyle}>
            {SWATCHES.map((s) => (
              <button
                key={`t-${s.id}`}
                type="button"
                onClick={() => onPick('text', s.id)}
                title={s.id}
                style={{
                  ...swatchBtnStyle,
                  border: `1px solid ${
                    curText === s.id ? 'var(--nx-blue)' : 'var(--c-borPri)'
                  }`,
                  color: s.id === 'default' ? 'var(--c-texPri)' : s.textColor,
                }}
              >
                A
              </button>
            ))}
          </div>
        </>
      )}
      {supportsBg && (
        <>
          <div style={{ ...colorGroupLabel, marginTop: supportsText ? '8px' : 0 }}>
            {tBg}
          </div>
          <div style={swatchRowStyle}>
            {SWATCHES.map((s) => (
              <button
                key={`b-${s.id}`}
                type="button"
                onClick={() => onPick('bg', s.id)}
                title={s.id}
                style={{
                  ...swatchBtnStyle,
                  border: `1px solid ${
                    curBg === s.id ? 'var(--nx-blue)' : 'var(--c-borPri)'
                  }`,
                  background: s.bgColor,
                }}
              >
                {s.id === 'default' ? '×' : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────── helpers ───────────

function extractBlockText(block: any): string {
  const buf: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node === 'string') {
      buf.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'object') {
      if (typeof node.text === 'string') buf.push(node.text);
      if (Array.isArray(node.content)) walk(node.content);
      if (Array.isArray(node.children)) walk(node.children);
    }
  };
  walk(block.content);
  if (Array.isArray(block.children)) walk(block.children);
  return buf.join('').trim();
}

// ─────────── 内联样式 ───────────

const btnIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '22px',
  height: '22px',
  borderRadius: '4px',
  border: 'none',
  background: 'transparent',
  color: 'var(--c-icoSec)',
  cursor: 'grab',
  padding: 0,
};

const searchWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 10px',
  borderBottom: '1px solid var(--c-borSec)',
  background: 'var(--c-bacSec)',
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '13px',
  color: 'var(--c-texPri)',
  padding: 0,
};

const listScrollStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '4px 0',
};

const rowBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: 'calc(100% - 8px)',
  padding: '6px 10px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  borderRadius: '4px',
  margin: '1px 4px',
};

const subHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  borderBottom: '1px solid var(--c-borSec)',
  textAlign: 'left',
};

const footerStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderTop: '1px solid var(--c-borSec)',
  fontSize: '11px',
  color: 'var(--c-texTer)',
  background: 'var(--c-bacSec)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const emptyStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'center',
  color: 'var(--c-texTer)',
  fontSize: '13px',
};

const colorGroupLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--c-texTer)',
  padding: '4px 4px 4px',
};

const swatchRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
};

const swatchBtnStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '4px',
  background: 'transparent',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};
