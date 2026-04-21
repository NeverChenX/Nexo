'use client';

import { useState, useEffect } from 'react';
import { Link2, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Backlink {
  path: string;
  title: string;
}

interface BacklinksPanelProps {
  articlePath: string;
  onSelect: (path: string) => void;
}

export function BacklinksPanel({ articlePath, onSelect }: BacklinksPanelProps) {
  const { t } = useI18n();
  const [links, setLinks] = useState<Backlink[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!articlePath) { setLinks([]); setLoaded(false); return; }
    setLoaded(false);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/backlinks?path=${encodeURIComponent(articlePath)}`);
        const json = await res.json();
        if (json.ok) setLinks(json.data);
      } catch { /* ignore */ }
      setLoaded(true);
    }, 500); // 延迟加载避免频繁请求
    return () => clearTimeout(timer);
  }, [articlePath]);

  if (!loaded) return null;

  return (
    <div style={{ marginTop: '24px' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Link2 className="h-3 w-3" style={{ color: 'var(--c-texTer)' }} />
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--c-texTer)' }}>
          {t('backlinks.title')}{links.length > 0 ? ` (${links.length})` : ''}
        </span>
      </div>
      {links.length === 0 && (
        <p style={{ fontSize: '12px', color: 'var(--c-texDis)', paddingLeft: '4px' }}>{t('backlinks.none')}</p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {links.map((link) => (
          <li key={link.path}>
            <button
              onClick={() => onSelect(link.path)}
              className="nx-hoverable flex items-center gap-2 w-full text-left px-1 py-1 rounded text-xs"
              style={{ color: 'var(--c-texTer)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--c-texSec)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--c-texTer)'; }}
            >
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{link.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
