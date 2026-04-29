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
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
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
