'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ReaderUIProvider, useReaderUI } from './ReaderUIContext';
import { useReaderPrefs } from './hooks/useReaderPrefs';
import { useArticle } from './hooks/useArticle';
import { useReaderProgress } from './hooks/useReaderProgress';
import { useChromeToggle } from './hooks/useChromeToggle';
import { useReaderHotkeys } from './hooks/useReaderHotkeys';
import { useReaderGestures } from './hooks/useReaderGestures';
import { useChapterNav } from './hooks/useChapterNav';
import { useAnnotations } from './hooks/useAnnotations';
import { useFavorite } from './hooks/useFavorite';
import { useSelection } from './hooks/useSelection';
import { useReadingHeartbeat } from './hooks/useReadingHeartbeat';
import { ReaderContent } from './ReaderContent';
import { ReaderEndCard } from './ReaderEndCard';
import { ReaderSkeleton } from './ReaderSkeleton';
import { ReaderProgressToast } from './ReaderProgressToast';
import { ReaderTopBar } from './ReaderTopBar';
import { ReaderBottomBar } from './ReaderBottomBar';
import { LeftDrawer } from './drawers/LeftDrawer';
import { RightDrawer } from './drawers/RightDrawer';
import { SelectionToolbar } from './annotation/SelectionToolbar';
import { HighlightOverlay } from './annotation/HighlightOverlay';
import { MarkPopover } from './annotation/MarkPopover';
import { InlineNoteCard } from './annotation/InlineNoteCard';
import { NoteComposer } from './annotation/NoteComposer';
import { CommandPalette } from './cmdk/CommandPalette';
import { SettingsSheet } from './settings/SettingsSheet';
import { countWords } from '@/lib/reader/reading-time';
import { parseFrontmatter } from '@/lib/frontmatter';
import { makeAnchor, isSameAnchor } from '@/lib/reader/anchor';
import type { Mark, Anchor } from '@/lib/reader/types';
import type { MarkColor } from '@/lib/reader/prefs';
import styles from './reader.module.css';

interface ComposerState {
  kind: 'note' | 'thought';
  anchor: Anchor;
  existingId?: string;
  initial?: string;
}

function Inner({ ids }: { ids: string[] | undefined }) {
  const { prefs } = useReaderPrefs();
  const { data, loading, error } = useArticle(ids);
  const router = useRouter();
  const ui = useReaderUI();

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const contentRootRef = useRef<HTMLElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [endEl, setEndEl] = useState<HTMLDivElement | null>(null);
  const [contentRoot, setContentRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setScrollEl(scrollRef.current);
    setEndEl(endRef.current);
    setContentRoot(contentRootRef.current);
  }, [data?.id]);

  // 文件夹页（_index.md 内容除了 H1 外为空）→ 自动跳到第一篇子文章。
  // 避免显示空白正文 + EndCard 的"— 完 —"误导。
  const autoJumpedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!data || !data.isFolder) return;
    if (autoJumpedRef.current === data.id) return; // 同一篇文件夹只尝试一次
    const { body } = parseFrontmatter(data.content);
    // 去掉首个 # 标题行后剩余正文
    const remaining = body
      .replace(/^\s*#\s+[^\n]*\n?/, '')
      .trim();
    if (remaining.length > 0) return; // 文件夹有"父页面"实际内容，不跳
    autoJumpedRef.current = data.id;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/folders?path=${encodeURIComponent(data.path)}`,
        );
        const json = await res.json();
        if (cancelled || !json.ok || !Array.isArray(json.data)) return;
        // getFolderContentsDetailed 已按 .order.json 排好序；找第一篇非文件夹
        const firstDoc = (json.data as Array<{
          path: string;
          isFolder: boolean;
        }>).find((it) => !it.isFolder);
        if (!firstDoc) return;
        // 拿 idChain 再跳，URL 才能保持稳定 ID 格式
        const detailRes = await fetch(
          `/api/articles?path=${encodeURIComponent(firstDoc.path)}`,
        );
        const detailJson = await detailRes.json();
        if (cancelled || !detailJson.ok) return;
        const childChain = detailJson.data.idChain as string | undefined;
        if (!childChain) return;
        router.replace(`/read/${childChain}`);
      } catch {
        /* swallow — 跳转失败就让用户看到原本的空文件夹页 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, router]);

  // 监听 CommandPalette 选中笔记/想法后的 anchor 跳转事件
  useEffect(() => {
    const onGoto = (e: Event): void => {
      const detail = (e as CustomEvent<{ quote: string }>).detail;
      if (!detail || !contentRoot) return;
      const quote = detail.quote;
      if (!quote) return;
      // 在正文中查找含 quote 前缀的首个块级元素
      const blocks = contentRoot.querySelectorAll<HTMLElement>(
        'p, li, h1, h2, h3, h4, blockquote',
      );
      const needle = quote.slice(0, Math.min(30, quote.length));
      for (const b of blocks) {
        if (b.textContent?.includes(needle)) {
          b.scrollIntoView({ behavior: 'smooth', block: 'center' });
          b.classList.add('rd-flash');
          setTimeout(() => b.classList.remove('rd-flash'), 1500);
          break;
        }
      }
    };
    document.addEventListener('reader:goto-anchor', onGoto);
    return () => document.removeEventListener('reader:goto-anchor', onGoto);
  }, [contentRoot]);

  const { progress, prevEntry, showResumeToast, dismissToast, resumeToTop } =
    useReaderProgress({
      articleId: data?.id ?? null,
      articleReady: !loading && !!data,
      scrollEl,
      endSentinel: endEl,
    });
  useChromeToggle(scrollEl);
  useReaderGestures(scrollEl);
  useReadingHeartbeat(data?.id ?? null);

  const { prev, next } = useChapterNav(data?.id);
  const totalWords = useMemo(
    () => (data ? countWords(data.content, { stripCode: true }) : 0),
    [data],
  );

  // Annotations + favorite
  const {
    marks,
    notes,
    thoughts,
    addMark,
    changeMarkColor,
    removeMark,
    addNote,
    editNote,
    removeNote,
    addThought,
    editThought,
    removeThought,
  } = useAnnotations(data?.id ?? null);
  const { isFavorite } = useFavorite(data?.id ?? null);

  const { info: selInfo, clear: clearSel } = useSelection({
    contentRoot,
    source: data?.content ?? '',
    enabled: !!data,
  });

  // 保留最后一次非空选区。某些设备 / 浏览器在用户点击工具栏按钮的
  // 触摸/点击事件链里会先触发 selectionchange 把 selInfo 清掉，
  // 等 onClick 回调真正执行时已是 null。这里用 ref 兜底，
  // 工具栏按钮回调里优先用 selInfo，没有就回退到 ref。
  const lastSelInfoRef = useRef(selInfo);
  useEffect(() => {
    if (selInfo) lastSelInfoRef.current = selInfo;
  }, [selInfo]);

  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [pop, setPop] = useState<{ mark: Mark; rect: DOMRect } | null>(null);

  const onMark = useCallback(
    (color: MarkColor) => {
      const info = selInfo ?? lastSelInfoRef.current;
      if (!info || !data) return;
      const anchor = makeAnchor(
        data.content,
        info.startOffset,
        info.endOffset,
        { prefix: info.prefix, selected: info.text, suffix: info.suffix },
      );
      void addMark(anchor, color);
      lastSelInfoRef.current = null;
      clearSel();
    },
    [selInfo, data, addMark, clearSel],
  );

  const onNote = useCallback(() => {
    const info = selInfo ?? lastSelInfoRef.current;
    if (!info || !data) return;
    const anchor = makeAnchor(
      data.content,
      info.startOffset,
      info.endOffset,
      { prefix: info.prefix, selected: info.text, suffix: info.suffix },
    );
    setComposer({ kind: 'note', anchor });
    lastSelInfoRef.current = null;
    clearSel();
  }, [selInfo, data, clearSel]);

  const onThought = useCallback(() => {
    const info = selInfo ?? lastSelInfoRef.current;
    if (!info || !data) return;
    const anchor = makeAnchor(
      data.content,
      info.startOffset,
      info.endOffset,
      { prefix: info.prefix, selected: info.text, suffix: info.suffix },
    );
    setComposer({ kind: 'thought', anchor });
    lastSelInfoRef.current = null;
    clearSel();
  }, [selInfo, data, clearSel]);

  const onCopySelection = useCallback(() => {
    const info = selInfo ?? lastSelInfoRef.current;
    if (!info) return;
    void navigator.clipboard.writeText(info.text);
    lastSelInfoRef.current = null;
    clearSel();
  }, [selInfo, clearSel]);

  const onShare = useCallback(() => {
    const info = selInfo ?? lastSelInfoRef.current;
    if (!info || !data) return;
    const url = `${location.origin}/read/${data.idChain}`;
    void navigator.clipboard.writeText(
      `> ${info.text}\n\n— 来自《${data.path.split('/').pop()}》${url}`,
    );
    lastSelInfoRef.current = null;
    clearSel();
  }, [selInfo, data, clearSel]);

  const composerSubmit = useCallback(
    async (text: string) => {
      if (!composer) return;
      if (composer.existingId) {
        if (composer.kind === 'note')
          await editNote(composer.existingId, text);
        else await editThought(composer.existingId, text);
      } else {
        if (composer.kind === 'note') await addNote(composer.anchor, text);
        else await addThought(composer.anchor, text);
      }
      setComposer(null);
    },
    [composer, addNote, editNote, addThought, editThought],
  );

  const onInlineEdit = useCallback(
    (kind: 'note' | 'thought', id: string) => {
      const item =
        kind === 'note'
          ? notes.find((n) => n.id === id)
          : thoughts.find((t) => t.id === id);
      if (!item) return;
      setComposer({
        kind,
        anchor: item.anchor,
        existingId: id,
        initial: item.text,
      });
    },
    [notes, thoughts],
  );

  const onInlineDelete = useCallback(
    (kind: 'note' | 'thought', id: string) => {
      if (kind === 'note') void removeNote(id);
      else void removeThought(id);
    },
    [removeNote, removeThought],
  );

  const onChapterJump = useCallback(
    (idChain: string) => router.push(`/read/${idChain}`),
    [router],
  );
  const onInternalLink = useCallback(
    (path: string) => router.push(`/read/${encodeURIComponent(path)}`),
    [router],
  );
  const jumpTop = useCallback(
    () => scrollEl?.scrollTo({ top: 0, behavior: 'smooth' }),
    [scrollEl],
  );
  const jumpEnd = useCallback(
    () =>
      scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' }),
    [scrollEl],
  );
  const resumeToLast = useCallback(() => {
    if (!scrollEl || !prevEntry) return;
    scrollEl.scrollTo({ top: prevEntry.scrollPos, behavior: 'smooth' });
  }, [scrollEl, prevEntry]);

  useReaderHotkeys({
    scrollEl,
    prevChain: prev?.idChain,
    nextChain: next?.idChain,
    onJumpToTop: jumpTop,
    onJumpToEnd: jumpEnd,
    onResumeToLast: resumeToLast,
  });

  const segments = data ? data.path.split('/').filter(Boolean) : [];
  const popNote = pop
    ? notes.find((n) => isSameAnchor(n.anchor, pop.mark.anchor))
    : undefined;

  return (
    <div
      className={`${styles.shell} ${styles[`theme-${prefs.theme}`]}`}
      data-font={prefs.font}
      style={{
        ['--rd-font-size' as never]: `${prefs.fontSize}px`,
        ['--rd-line-height' as never]: prefs.lineHeight,
      }}
      suppressHydrationWarning
    >
      <ReaderProgressToast
        progress={prevEntry?.lastReadProgress ?? 0}
        visible={showResumeToast}
        onDismiss={dismissToast}
        onResumeToTop={resumeToTop}
      />
      <ReaderTopBar
        visible={ui.chromeVisible}
        pathSegments={segments}
        progress={progress}
        totalWords={totalWords}
        isFavorite={isFavorite}
        editHref={data?.idChain ? `/editor/${data.idChain}` : undefined}
        onCrumbClick={() => {}}
        onToggleFavorite={() =>
          document.dispatchEvent(new CustomEvent('reader:toggle-favorite'))
        }
      />
      <ReaderBottomBar
        visible={ui.chromeVisible}
        prevTitle={prev?.title}
        nextTitle={next?.title}
        positionN={1 /* TODO: real index in phase 7 */}
        positionTotal={1}
        progress={progress}
        scrollEl={scrollEl}
        onPrev={() => prev && onChapterJump(prev.idChain)}
        onNext={() => next && onChapterJump(next.idChain)}
      />

      <LeftDrawer currentArticleId={data?.id} onSelect={onChapterJump} />
      <RightDrawer scrollEl={scrollEl} contentMd={data?.content} />

      <div ref={scrollRef} className={styles.scroller}>
        <main
          ref={contentRootRef}
          className={`${styles.column} rd-content-root`}
          data-width={prefs.width}
          data-indent={prefs.indent ? 'true' : 'false'}
        >
          {loading && <ReaderSkeleton />}
          {!loading && error && (
            <div className="rd-state rd-state--error">
              <p>{error}</p>
              <button type="button" onClick={() => location.reload()}>
                重试
              </button>
              <button type="button" onClick={() => router.push('/read')}>
                回阅读首页
              </button>
            </div>
          )}
          {!loading && !data && !error && (
            <div
              style={{
                color: 'var(--rd-text-dim)',
                textAlign: 'center',
                padding: '80px 0',
              }}
            >
              <p style={{ fontSize: 16, marginBottom: 8 }}>请选择一篇文章</p>
              <p style={{ fontSize: 12 }}>
                按 <kbd>[</kbd> 打开目录
              </p>
            </div>
          )}
          {!loading && data && (
            <>
              <ReaderContent
                content={data.content}
                currentPath={data.path}
                onInternalLink={onInternalLink}
              />
              <ReaderEndCard articleId={data.id} onNavigate={onChapterJump} />
            </>
          )}
          <div ref={endRef} aria-hidden style={{ height: 1 }} />
        </main>
      </div>

      {!loading && data && (
        <>
          <HighlightOverlay
            contentRoot={contentRoot}
            source={data.content}
            marks={marks}
            onClickMark={(m, r) => setPop({ mark: m, rect: r })}
          />
          <InlineNoteCard
            contentRoot={contentRoot}
            notes={notes}
            thoughts={thoughts}
            visibility={prefs.noteVisibility}
            onEdit={onInlineEdit}
            onDelete={onInlineDelete}
          />
        </>
      )}

      <SelectionToolbar
        rect={selInfo?.rect ?? null}
        onMark={onMark}
        onNote={onNote}
        onThought={onThought}
        onCopy={onCopySelection}
        onShare={onShare}
      />
      {pop && (
        <MarkPopover
          mark={pop.mark}
          rect={pop.rect}
          note={popNote}
          onClose={() => setPop(null)}
          onChangeColor={(c) => {
            void changeMarkColor(pop.mark.id, c);
            setPop(null);
          }}
          onEditNote={() => {
            const existing = popNote;
            setComposer({
              kind: 'note',
              anchor: pop.mark.anchor,
              existingId: existing?.id,
              initial: existing?.text,
            });
            setPop(null);
          }}
          onDelete={() => {
            void removeMark(pop.mark.id);
            setPop(null);
          }}
        />
      )}
      <NoteComposer
        open={!!composer}
        initialText={composer?.initial}
        title={composer?.kind === 'note' ? '写一段笔记' : '写一段想法'}
        onSubmit={composerSubmit}
        onCancel={() => setComposer(null)}
      />
      <CommandPalette currentArticleId={data?.id} />
      <SettingsSheet />
    </div>
  );
}

export function ReaderShell({ ids }: { ids: string[] | undefined }) {
  return (
    <ReaderUIProvider>
      <Inner ids={ids} />
    </ReaderUIProvider>
  );
}
