'use client';

import { useReaderUI } from '../ReaderUIContext';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import type {
  ThemeName,
  FontFamily,
  WidthName,
  NoteVisibility,
} from '@/lib/reader/prefs';

const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 22;
const LINE_HEIGHT_MIN = 1.7;
const LINE_HEIGHT_MAX = 2.25;

export function SettingsSheet(): JSX.Element | null {
  const ui = useReaderUI();
  const { prefs, patch, reset } = useReaderPrefs();

  if (!ui.settingsOpen) return null;

  const fontSizeStep = (delta: number): void =>
    patch({
      fontSize: Math.max(
        FONT_SIZE_MIN,
        Math.min(FONT_SIZE_MAX, prefs.fontSize + delta),
      ),
    });
  const lineHeightStep = (delta: number): void =>
    patch({
      lineHeight: Math.max(
        LINE_HEIGHT_MIN,
        Math.min(
          LINE_HEIGHT_MAX,
          parseFloat((prefs.lineHeight + delta).toFixed(2)),
        ),
      ),
    });

  return (
    <div
      className="rd-settings__overlay"
      onClick={ui.closeSettings}
      data-rd-no-toggle="true"
    >
      <div className="rd-settings" onClick={(e) => e.stopPropagation()}>
        <div className="rd-settings__head">
          <span>阅读设置</span>
          <button type="button" onClick={ui.closeSettings} aria-label="close">
            ✕
          </button>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">字号</span>
          <div className="rd-settings__group">
            <button type="button" onClick={() => fontSizeStep(-1)}>
              A−
            </button>
            <span className="rd-settings__value">{prefs.fontSize}</span>
            <button type="button" onClick={() => fontSizeStep(+1)}>
              A+
            </button>
          </div>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">行距</span>
          <div className="rd-settings__group">
            <button type="button" onClick={() => lineHeightStep(-0.1)}>
              紧
            </button>
            <span className="rd-settings__value">
              {prefs.lineHeight.toFixed(2)}
            </span>
            <button type="button" onClick={() => lineHeightStep(+0.1)}>
              松
            </button>
          </div>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">宽度</span>
          <div className="rd-settings__seg">
            {(['narrow', 'medium', 'wide'] as WidthName[]).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={prefs.width === w}
                onClick={() => patch({ width: w })}
              >
                {w === 'narrow' ? '580' : w === 'medium' ? '720' : '900'}
              </button>
            ))}
          </div>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">字体</span>
          <div className="rd-settings__seg">
            {(['sans', 'serif'] as FontFamily[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={prefs.font === f}
                onClick={() => patch({ font: f })}
              >
                {f === 'sans' ? '无衬线' : '衬线'}
              </button>
            ))}
          </div>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">主题</span>
          <div className="rd-settings__themes">
            {(['oled', 'charcoal', 'ink'] as ThemeName[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={prefs.theme === t}
                onClick={() => patch({ theme: t })}
                className={`rd-settings__swatch rd-settings__swatch--${t}`}
                aria-label={t}
              />
            ))}
          </div>
        </div>

        <div className="rd-settings__divider" />

        <div className="rd-settings__row">
          <span className="rd-settings__label">缩进</span>
          <button
            type="button"
            className="rd-settings__toggle"
            aria-pressed={prefs.indent}
            onClick={() => patch({ indent: !prefs.indent })}
          >
            {prefs.indent ? '开' : '关'}
          </button>
        </div>

        <div className="rd-settings__row">
          <span className="rd-settings__label">笔记可见性</span>
          <div className="rd-settings__seg">
            {(['always', 'collapsed', 'hidden'] as NoteVisibility[]).map(
              (v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={prefs.noteVisibility === v}
                  onClick={() => patch({ noteVisibility: v })}
                >
                  {v === 'always' ? '显示' : v === 'collapsed' ? '折叠' : '隐藏'}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="rd-settings__foot">
          <button
            type="button"
            className="rd-settings__reset"
            onClick={reset}
          >
            恢复默认
          </button>
        </div>
      </div>
    </div>
  );
}
