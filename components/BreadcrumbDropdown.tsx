'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, FileText, FolderClosed } from 'lucide-react';

interface SiblingItem {
  name: string;
  path: string;
  isFolder: boolean;
}

interface BreadcrumbDropdownProps {
  segment: string;
  segmentPath: string;
  parentPath: string;
  isLast: boolean;
  onSelect: (path: string, isFolder: boolean) => void;
}

export function BreadcrumbDropdown({ segment, segmentPath, parentPath, isLast, onSelect }: BreadcrumbDropdownProps) {
  const [open, setOpen] = useState(false);
  const [siblings, setSiblings] = useState<SiblingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const loadSiblings = async () => {
    if (siblings.length > 0) { setOpen(true); return; }
    setLoading(true);
    setOpen(true);
    try {
      const query = parentPath ? `path=${encodeURIComponent(parentPath)}` : 'tree=true';
      const res = await fetch(`/api/folders?${query}`);
      const json = await res.json();
      if (json.ok) {
        const items: SiblingItem[] = Array.isArray(json.data)
          ? json.data.map((d: any) => ({ name: d.name, path: d.path, isFolder: d.isFolder }))
          : [];
        setSiblings(items);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const displayName = segment.replace(/\.md$/, '');

  return (
    <div className="relative inline-flex items-center" ref={dropRef}>
      <button
        onClick={() => {
          if (isLast) loadSiblings();
          else onSelect(segmentPath, true);
        }}
        className="nx-hoverable rounded px-1 flex items-center gap-0.5"
        style={{
          fontSize: '14px',
          color: isLast ? 'var(--c-texPri)' : 'var(--c-texTer)',
        }}
      >
        {displayName}
        {isLast && <ChevronDown className="h-3 w-3" style={{ color: 'var(--c-texDis)' }} />}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 py-1 min-w-[180px] max-h-[280px] overflow-y-auto"
          style={{
            background: 'var(--c-bacPri)',
            borderRadius: '6px',
            boxShadow: 'var(--c-shaOutMd)',
            border: '1px solid var(--c-borPri)',
          }}
        >
          {loading && (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--c-texTer)' }}>...</div>
          )}
          {!loading && siblings.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--c-texTer)' }}>—</div>
          )}
          {siblings.map((s) => (
            <button
              key={s.path}
              className="nx-hoverable w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
              style={{
                color: s.path === segmentPath ? 'var(--nx-blue)' : 'var(--c-texSec)',
                fontWeight: s.path === segmentPath ? 500 : 400,
              }}
              onClick={() => { onSelect(s.path, s.isFolder); setOpen(false); }}
            >
              {s.isFolder ? (
                <FolderClosed className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--c-icoSec)' }} />
              ) : (
                <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--c-icoSec)' }} />
              )}
              <span className="truncate">{s.name.replace(/\.md$/, '')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
