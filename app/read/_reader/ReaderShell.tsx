'use client';

import { useReaderPrefs } from './hooks/useReaderPrefs';
import styles from './reader.module.css';

export function ReaderShell({ ids }: { ids: string[] | undefined }) {
  const { prefs, hydrated } = useReaderPrefs();

  if (!hydrated) {
    // 防止服务端/客户端首屏闪烁，先用默认 charcoal
  }

  return (
    <div
      className={`${styles.shell} ${styles[`theme-${prefs.theme}`]}`}
      data-font={prefs.font}
      style={{
        ['--rd-font-size' as never]: `${prefs.fontSize}px`,
        ['--rd-line-height' as never]: prefs.lineHeight,
      }}
    >
      <main
        className={styles.column}
        data-width={prefs.width}
        data-indent={prefs.indent ? 'true' : 'false'}
      >
        <h1>Reader Skeleton</h1>
        <p>
          这是一个占位空壳。后续 phase 会接入 Markdown 渲染、抽屉、附加层等功能。
          当前 ids = <code>{JSON.stringify(ids)}</code>。
        </p>
        <p>
          这是第二段，用来验证段落首行缩进 ({prefs.indent ? '开' : '关'})、
          字号 ({prefs.fontSize}px) 与行距 ({prefs.lineHeight}) 是否正确生效。
        </p>
        <blockquote>引用样式：左侧铜金细线 + 浅米色字。</blockquote>
        <hr />
        <p>
          上方分隔线应渲染为居中三个 <code>·</code> 而非横线。
        </p>
      </main>
    </div>
  );
}
