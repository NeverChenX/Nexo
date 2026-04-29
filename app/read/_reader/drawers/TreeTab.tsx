'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ArticleNode } from '@/lib/reader/chapter-nav';

interface FolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: AnyNode[];
}
interface FileNode {
  type: 'file';
  article: ArticleNode;
}
type AnyNode = FolderNode | FileNode;

function buildTree(flat: ArticleNode[]): AnyNode[] {
  const root: FolderNode = { type: 'folder', name: '', path: '', children: [] };
  for (const a of flat) {
    const segs = a.path.split('/').filter(Boolean);
    const fileName = segs.pop() || a.title;
    let cursor = root;
    let curPath = '';
    for (const seg of segs) {
      curPath = curPath ? `${curPath}/${seg}` : seg;
      let next = cursor.children.find(
        (n) => n.type === 'folder' && n.name === seg,
      ) as FolderNode | undefined;
      if (!next) {
        next = { type: 'folder', name: seg, path: curPath, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
    cursor.children.push({ type: 'file', article: { ...a, title: fileName } });
  }
  return root.children;
}

interface Props {
  currentArticleId: string | undefined;
  onSelect: (idChain: string) => void;
}

const EXPAND_KEY = 'never-wiki.reader.tree.expanded';

export function TreeTab({ currentArticleId, onSelect }: Props) {
  const [flat, setFlat] = useState<ArticleNode[]>([]);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (typeof localStorage === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(EXPAND_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    fetch('/api/articles/list')
      .then((r) => r.json())
      .then((j) => setFlat(j?.data || []));
  }, []);

  // Auto-expand parents of current article
  useEffect(() => {
    if (!currentArticleId) return;
    const cur = flat.find((a) => a.id === currentArticleId);
    if (!cur) return;
    const segs = cur.path.split('/').filter(Boolean);
    segs.pop();
    const next = new Set(expanded);
    let acc = '';
    for (const s of segs) {
      acc = acc ? `${acc}/${s}` : s;
      next.add(acc);
    }
    setExpanded(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(EXPAND_KEY, JSON.stringify([...next]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentArticleId, flat]);

  const tree = useMemo(() => buildTree(flat), [flat]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(EXPAND_KEY, JSON.stringify([...next]));
      }
      return next;
    });
  };

  const filtered = filter.trim().toLowerCase();

  const Render = ({ nodes, depth }: { nodes: AnyNode[]; depth: number }) => (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {nodes.map((n) => {
        if (n.type === 'folder') {
          const open = expanded.has(n.path);
          if (filtered) {
            // crude filter: keep folder if any descendant matches
            const hasMatch = (sub: AnyNode[]): boolean =>
              sub.some((c) =>
                c.type === 'file'
                  ? c.article.title.toLowerCase().includes(filtered)
                  : hasMatch(c.children),
              );
            if (!hasMatch(n.children)) return null;
          }
          return (
            <li key={`f:${n.path}`}>
              <button
                type="button"
                className="rd-tree__row rd-tree__folder"
                style={{ paddingLeft: 8 + depth * 12 }}
                onClick={() => toggle(n.path)}
              >
                <ChevronRight
                  size={12}
                  style={{
                    transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 120ms',
                  }}
                />
                <span>{n.name}</span>
              </button>
              {(open || filtered) && <Render nodes={n.children} depth={depth + 1} />}
            </li>
          );
        }
        const a = n.article;
        if (filtered && !a.title.toLowerCase().includes(filtered)) return null;
        const active = a.id === currentArticleId;
        return (
          <li key={`a:${a.id}`}>
            <button
              type="button"
              className={`rd-tree__row rd-tree__file ${active ? 'rd-tree__file--active' : ''}`}
              style={{ paddingLeft: 8 + depth * 12 + 14 }}
              onClick={() => onSelect(a.idChain)}
            >
              {a.title}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="rd-tree">
      <div className="rd-tree__search">
        <input
          type="search"
          placeholder="搜索本树…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <Render nodes={tree} depth={0} />
    </div>
  );
}
