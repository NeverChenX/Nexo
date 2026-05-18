export type ThemeName = 'oled' | 'charcoal' | 'ink';
export type FontFamily = 'sans' | 'serif';
export type WidthName = 'narrow' | 'medium' | 'wide';
export type NoteVisibility = 'always' | 'collapsed' | 'hidden';
export type MarkColor = 'yellow' | 'red' | 'green' | 'blue';

export interface ReaderPrefs {
  theme: ThemeName;
  font: FontFamily;
  width: WidthName;
  fontSize: number;
  lineHeight: number;
  indent: boolean;
  noteVisibility: NoteVisibility;
  lastMarkColor: MarkColor;
  leftDrawerWidth: number;
  rightDrawerWidth: number;
}

export const STORAGE_KEY = 'never-wiki.reader.prefs';

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: 'charcoal',
  font: 'sans',
  width: 'medium',
  fontSize: 17,
  lineHeight: 1.95,
  indent: true,
  noteVisibility: 'always',
  lastMarkColor: 'yellow',
  leftDrawerWidth: 280,
  rightDrawerWidth: 240,
};

const FONT_SIZE_RANGE = [14, 22] as const;
const LINE_HEIGHT_RANGE = [1.7, 2.25] as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getPrehydrationPrefs(): Partial<ReaderPrefs> | null {
  if (typeof window === 'undefined') return null;
  try {
    const pre = (window as unknown as Record<string, unknown>).__RD_PREFS__;
    if (pre && typeof pre === 'object') return pre as Partial<ReaderPrefs>;
  } catch {
    // ignore
  }
  return null;
}

function sanitize(p: Partial<ReaderPrefs>): ReaderPrefs {
  const merged: ReaderPrefs = { ...DEFAULT_PREFS, ...p };
  merged.fontSize = clamp(merged.fontSize, FONT_SIZE_RANGE[0], FONT_SIZE_RANGE[1]);
  merged.lineHeight = clamp(merged.lineHeight, LINE_HEIGHT_RANGE[0], LINE_HEIGHT_RANGE[1]);
  return merged;
}

export function loadPrefs(): ReaderPrefs {
  if (!isBrowser()) return DEFAULT_PREFS;
  // 优先使用 pre-hydration script 注入的值，避免 hydration mismatch
  const pre = getPrehydrationPrefs();
  if (pre) return sanitize(pre);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return sanitize(JSON.parse(raw) as Partial<ReaderPrefs>);
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ReaderPrefs): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(prefs)));
}

export function patchPrefs(patch: Partial<ReaderPrefs>): ReaderPrefs {
  const next = sanitize({ ...loadPrefs(), ...patch });
  savePrefs(next);
  return next;
}

export function resetPrefs(): ReaderPrefs {
  if (isBrowser()) localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_PREFS;
}
