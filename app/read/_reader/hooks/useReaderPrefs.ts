'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  loadPrefs,
  patchPrefs as patchPrefsLib,
  resetPrefs as resetPrefsLib,
  type ReaderPrefs,
  DEFAULT_PREFS,
} from '@/lib/reader/prefs';

export function useReaderPrefs(): {
  prefs: ReaderPrefs;
  patch: (p: Partial<ReaderPrefs>) => void;
  reset: () => void;
  hydrated: boolean;
} {
  // Lazy initialiser reads `window.__RD_PREFS__` (set by the inline
  // prehydration script in app/layout.tsx) so the very first client render
  // already has the user's theme/font/size — no flash.
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    return loadPrefs();
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Re-read in case localStorage changed between init and mount.
    setPrefs(loadPrefs());
    setHydrated(true);
  }, []);

  const patch = useCallback((p: Partial<ReaderPrefs>) => {
    setPrefs(patchPrefsLib(p));
  }, []);

  const reset = useCallback(() => {
    setPrefs(resetPrefsLib());
  }, []);

  return { prefs, patch, reset, hydrated };
}
