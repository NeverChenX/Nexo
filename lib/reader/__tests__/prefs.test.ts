import { describe, it, expect, beforeEach } from 'vitest';
import { loadPrefs, savePrefs, patchPrefs, resetPrefs, DEFAULT_PREFS, STORAGE_KEY } from '../prefs';

describe('reader prefs', () => {
  beforeEach(() => localStorage.clear());

  it('loadPrefs returns defaults when nothing stored', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('savePrefs writes JSON to localStorage', () => {
    savePrefs({ ...DEFAULT_PREFS, fontSize: 19 });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).fontSize).toBe(19);
  });

  it('loadPrefs round-trips with savePrefs', () => {
    savePrefs({ ...DEFAULT_PREFS, theme: 'oled', indent: false });
    expect(loadPrefs().theme).toBe('oled');
    expect(loadPrefs().indent).toBe(false);
  });

  it('patchPrefs merges and persists', () => {
    patchPrefs({ width: 'wide' });
    expect(loadPrefs().width).toBe('wide');
    patchPrefs({ fontSize: 20 });
    expect(loadPrefs().width).toBe('wide');     // unchanged
    expect(loadPrefs().fontSize).toBe(20);
  });

  it('loadPrefs ignores corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('loadPrefs fills missing keys with defaults (forward compat)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'ink' }));
    const p = loadPrefs();
    expect(p.theme).toBe('ink');
    expect(p.fontSize).toBe(DEFAULT_PREFS.fontSize);
  });

  it('resetPrefs clears storage and returns defaults', () => {
    savePrefs({ ...DEFAULT_PREFS, fontSize: 22 });
    expect(resetPrefs()).toEqual(DEFAULT_PREFS);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('savePrefs clamps fontSize to [14, 22]', () => {
    savePrefs({ ...DEFAULT_PREFS, fontSize: 99 });
    expect(loadPrefs().fontSize).toBe(22);
    savePrefs({ ...DEFAULT_PREFS, fontSize: 5 });
    expect(loadPrefs().fontSize).toBe(14);
  });
});
