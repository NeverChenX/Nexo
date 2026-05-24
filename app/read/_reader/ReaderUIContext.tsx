'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DrawerSide = 'left' | 'right';
export type LeftTab = 'tree' | 'library' | 'recent';

interface UIState {
  chromeVisible: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  leftTab: LeftTab;
  cmdkOpen: boolean;
  settingsOpen: boolean;
}

interface UIActions {
  toggleChrome: () => void;
  setChromeVisible: (v: boolean) => void;
  openLeft: (tab?: LeftTab) => void;
  closeLeft: () => void;
  toggleLeft: () => void;
  setLeftTab: (tab: LeftTab) => void;
  openRight: () => void;
  closeRight: () => void;
  toggleRight: () => void;
  closeAll: () => void;
  openCmdk: () => void;
  closeCmdk: () => void;
  toggleCmdk: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

const Ctx = createContext<(UIState & UIActions) | null>(null);

export function ReaderUIProvider({ children }: { children: ReactNode }) {
  const [chromeVisible, setChromeVisible] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftTab, setLeftTabState] = useState<LeftTab>('tree');
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // mobile-only mutex (handled via responsive util)
  const isPhone = () => typeof window !== 'undefined' && window.innerWidth < 768;

  const openLeft = useCallback((tab?: LeftTab) => {
    if (tab) setLeftTabState(tab);
    if (isPhone() && rightOpen) setRightOpen(false);
    setLeftOpen(true);
  }, [rightOpen]);
  const openRight = useCallback(() => {
    if (isPhone() && leftOpen) setLeftOpen(false);
    setRightOpen(true);
  }, [leftOpen]);

  const value: UIState & UIActions = {
    chromeVisible,
    leftOpen,
    rightOpen,
    leftTab,
    cmdkOpen,
    settingsOpen,
    toggleChrome: () => setChromeVisible((v) => !v),
    setChromeVisible,
    openLeft,
    closeLeft: () => setLeftOpen(false),
    toggleLeft: () => (leftOpen ? setLeftOpen(false) : openLeft()),
    setLeftTab: (tab) => setLeftTabState(tab),
    openRight,
    closeRight: () => setRightOpen(false),
    toggleRight: () => (rightOpen ? setRightOpen(false) : openRight()),
    // H5: priority pop instead of "wipe everything". ESC should peel one
    // layer at a time so the user keeps their place. Order matches the
    // visual stacking (cmdk on top, then settings, then drawers, then the
    // top chrome). If nothing is open, fall through to hiding chrome.
    closeAll: () => {
      if (cmdkOpen) { setCmdkOpen(false); return; }
      if (settingsOpen) { setSettingsOpen(false); return; }
      if (leftOpen) { setLeftOpen(false); return; }
      if (rightOpen) { setRightOpen(false); return; }
      if (chromeVisible) { setChromeVisible(false); return; }
      // Already at minimum-noise — nothing else to dismiss.
    },
    openCmdk: () => setCmdkOpen(true),
    closeCmdk: () => setCmdkOpen(false),
    toggleCmdk: () => setCmdkOpen((v) => !v),
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    toggleSettings: () => setSettingsOpen((v) => !v),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReaderUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useReaderUI must be inside ReaderUIProvider');
  return v;
}
