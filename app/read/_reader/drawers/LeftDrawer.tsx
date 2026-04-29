'use client';

import { useReaderUI, type LeftTab } from '../ReaderUIContext';
import { useReaderPrefs } from '../hooks/useReaderPrefs';
import { Drawer } from './Drawer';
import { TreeTab } from './TreeTab';
import { RecentTab } from './RecentTab';
import { LibraryView } from '../library/LibraryView';

interface Props {
  currentArticleId: string | undefined;
  onSelect: (idChain: string) => void;
}

export function LeftDrawer({ currentArticleId, onSelect }: Props) {
  const ui = useReaderUI();
  const { prefs } = useReaderPrefs();

  return (
    <Drawer
      side="left"
      open={ui.leftOpen}
      width={prefs.leftDrawerWidth}
      onClose={ui.closeLeft}
      ariaLabel="导航抽屉"
    >
      <nav className="rd-drawer__tabs">
        {(['tree', 'library', 'recent'] as LeftTab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`rd-drawer__tab ${ui.leftTab === t ? 'rd-drawer__tab--active' : ''}`}
            onClick={() => ui.setLeftTab(t)}
          >
            {t === 'tree' ? '目录' : t === 'library' ? '书房' : '最近'}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {ui.leftTab === 'tree' && (
          <TreeTab currentArticleId={currentArticleId} onSelect={onSelect} />
        )}
        {ui.leftTab === 'library' && (
          <LibraryView
            onSelectArticle={(idChain) => {
              onSelect(idChain);
              ui.closeLeft();
            }}
          />
        )}
        {ui.leftTab === 'recent' && <RecentTab onSelect={onSelect} />}
      </div>
    </Drawer>
  );
}
