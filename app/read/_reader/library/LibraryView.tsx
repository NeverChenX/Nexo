'use client';

import { useState } from 'react';
import {
  Star,
  NotebookText,
  MessageCircle,
  BookOpenText,
  BarChart3,
  Download,
} from 'lucide-react';
import { FavoritesTab } from './FavoritesTab';
import { NotesTab } from './NotesTab';
import { ThoughtsTab } from './ThoughtsTab';
import { HistoryTab } from './HistoryTab';
import { StatsTab } from './StatsTab';

type LibTab = 'favorites' | 'notes' | 'thoughts' | 'history' | 'stats';

interface Props {
  onSelectArticle: (idChain: string) => void;
}

const TABS: ReadonlyArray<{
  id: LibTab;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}> = [
  { id: 'favorites', label: '收藏', Icon: Star },
  { id: 'notes', label: '笔记', Icon: NotebookText },
  { id: 'thoughts', label: '想法', Icon: MessageCircle },
  { id: 'history', label: '历史', Icon: BookOpenText },
  { id: 'stats', label: '统计', Icon: BarChart3 },
];

export function LibraryView({ onSelectArticle }: Props) {
  const [tab, setTab] = useState<LibTab>('favorites');

  const onExport = () => {
    window.open('/api/reader/export', '_blank');
  };

  return (
    <div className="rd-lib">
      <div className="rd-lib__tabs" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`rd-lib__tab ${tab === id ? 'rd-lib__tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={12} />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className="rd-lib__export"
          onClick={onExport}
          aria-label="导出 zip"
          title="导出全部数据 (zip)"
        >
          <Download size={12} />
        </button>
      </div>
      <div className="rd-lib__body">
        {tab === 'favorites' && <FavoritesTab onSelect={onSelectArticle} />}
        {tab === 'notes' && <NotesTab onSelect={onSelectArticle} />}
        {tab === 'thoughts' && <ThoughtsTab onSelect={onSelectArticle} />}
        {tab === 'history' && <HistoryTab onSelect={onSelectArticle} />}
        {tab === 'stats' && <StatsTab />}
      </div>
    </div>
  );
}
