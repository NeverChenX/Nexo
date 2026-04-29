'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderUI } from '../ReaderUIContext';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import type { CommandResult } from './types';

export function useCmdkCommands(currentArticleId?: string): CommandResult[] {
  const ui = useReaderUI();
  const router = useRouter();
  const { prefs, patch } = useReaderPrefs();

  return useMemo<CommandResult[]>(() => {
    const cycleTheme = (): void => {
      const next =
        prefs.theme === 'charcoal'
          ? 'oled'
          : prefs.theme === 'oled'
            ? 'ink'
            : 'charcoal';
      patch({ theme: next });
    };
    const toggleFont = (): void =>
      patch({ font: prefs.font === 'sans' ? 'serif' : 'sans' });
    const toggleIndent = (): void => patch({ indent: !prefs.indent });
    const cycleNoteVis = (): void => {
      const next =
        prefs.noteVisibility === 'always'
          ? 'collapsed'
          : prefs.noteVisibility === 'collapsed'
            ? 'hidden'
            : 'always';
      patch({ noteVisibility: next });
    };
    const fullscreen = (): void => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    };
    const exportZip = (): void => {
      window.open('/api/reader/export', '_blank');
    };
    const goLibrary = (): void => {
      ui.openLeft('library');
    };
    const fav = (): void => {
      document.dispatchEvent(new CustomEvent('reader:toggle-favorite'));
    };

    const make = (
      id: string,
      label: string,
      run: () => void,
      keywords?: string[],
    ): CommandResult => ({
      id: `cmd:${id}`,
      category: 'command',
      label,
      run,
      keywords,
    });

    const list: CommandResult[] = [
      make(
        'cycle-theme',
        `切换主题（当前: ${prefs.theme}）`,
        cycleTheme,
        ['theme', 'dark', 'zhuti'],
      ),
      make(
        'toggle-font',
        `切换字体（当前: ${prefs.font === 'sans' ? '无衬线' : '衬线'}）`,
        toggleFont,
        ['font', 'ziti'],
      ),
      make(
        'toggle-indent',
        `切换段落首行缩进（当前: ${prefs.indent ? '开' : '关'}）`,
        toggleIndent,
        ['indent', 'suojin'],
      ),
      make(
        'cycle-note-vis',
        `切换笔记可见性（当前: ${prefs.noteVisibility}）`,
        cycleNoteVis,
        ['note', 'visibility', 'biji'],
      ),
      make(
        'open-settings',
        '打开设置面板',
        () => ui.openSettings(),
        ['settings', 'shezhi'],
      ),
      make('open-library', '打开我的书房', goLibrary, [
        'library',
        'shufang',
      ]),
      make('toggle-fav', '收藏 / 取消收藏当前文章', fav, [
        'favorite',
        'star',
        'shoucang',
      ]),
      make(
        'go-top',
        '回到顶部',
        () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        ['top', 'dingbu'],
      ),
      make(
        'go-end',
        '跳到结尾',
        () => {
          const root = document.querySelector('.rd-content-root');
          if (root) (root as HTMLElement).scrollIntoView({ block: 'end' });
        },
        ['end', 'jiewei'],
      ),
      make('fullscreen', '全屏切换', fullscreen, ['fullscreen', 'quanping']),
      make('export-zip', '导出全部读书痕迹（zip）', exportZip, [
        'export',
        'backup',
        'daochu',
      ]),
      make(
        'go-editor',
        '在编辑器中打开当前文章',
        () => {
          if (currentArticleId) router.push(`/editor/${currentArticleId}`);
        },
        ['editor', 'bianji'],
      ),
    ];
    return list;
  }, [ui, router, prefs, patch, currentArticleId]);
}
