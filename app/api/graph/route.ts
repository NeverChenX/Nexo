import { NextRequest, NextResponse } from 'next/server';
import { getAllDocs } from '@/lib/wiki-cache';

export interface GraphNode {
  id: string;
  title: string;
  wordCount: number;
  tags: string[];
  isFolder: boolean;
  degree: number;       // 连接数（入 + 出）
  cluster: string;      // 顶层目录作为社区
  mtime?: number;
  isOrphan?: boolean;   // 孤岛标记
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'wikilink' | 'mdlink' | 'pagelink' | 'parent';
}

/**
 * GET /api/graph?view=global|local|orphans&focus=<path>&depth=2
 *
 * - global（默认）：全局图
 * - local：以 focus 为中心，展开 depth 跳内的邻居子图
 * - orphans：仅返回 degree=0 的节点（孤岛）
 *
 * 返回 { nodes, edges, clusters, stats }
 */
export async function GET(req: NextRequest) {
  try {
    const view = req.nextUrl.searchParams.get('view') || 'global';
    const focus = req.nextUrl.searchParams.get('focus') || '';
    const depth = Math.max(1, Math.min(4, Number(req.nextUrl.searchParams.get('depth') || '2')));
    const includeParent = req.nextUrl.searchParams.get('parent') !== '0';

    const docs = await getAllDocs();
    const pathSet = new Set(docs.map((d) => d.path));

    const allEdges: GraphEdge[] = [];
    const edgeSet = new Set<string>();
    const addEdge = (source: string, target: string, kind: GraphEdge['kind']) => {
      if (source === target) return;
      if (!pathSet.has(source) || !pathSet.has(target)) return;
      const key = `${source}->${target}|${kind}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      allEdges.push({ source, target, kind });
    };

    for (const doc of docs) {
      // Wikilink [[path|text]] 或 [[path]]
      const wiki = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
      let m;
      while ((m = wiki.exec(doc.content)) !== null) {
        const target = m[1].trim().replace(/\.md$/, '');
        addEdge(doc.path, target, 'wikilink');
      }

      // PageLink (BlockNote JSON)
      const pl = /"pagePath"\s*:\s*"([^"]+)"/g;
      while ((m = pl.exec(doc.content)) !== null) {
        addEdge(doc.path, m[1], 'pagelink');
      }

      // Markdown 链接 [text](path)
      const md = /\]\(([^)]+)\)/g;
      while ((m = md.exec(doc.content)) !== null) {
        let target = m[1];
        if (target.startsWith('http') || target.startsWith('#') || target.startsWith('mailto:')) continue;
        target = target.replace(/^\//, '').replace(/\.md$/, '');
        addEdge(doc.path, target, 'mdlink');
      }

      // 父子（可选）
      if (includeParent && doc.path.includes('/')) {
        const parent = doc.path.split('/').slice(0, -1).join('/');
        if (parent) addEdge(parent, doc.path, 'parent');
      }
    }

    // 度数 + 孤岛
    const degree = new Map<string, number>();
    for (const e of allEdges) {
      degree.set(e.source, (degree.get(e.source) || 0) + 1);
      degree.set(e.target, (degree.get(e.target) || 0) + 1);
    }

    const clusterOf = (p: string): string => {
      const first = p.split('/')[0];
      return first || '__root__';
    };

    const allNodes: GraphNode[] = docs.map((d) => {
      const deg = degree.get(d.path) || 0;
      return {
        id: d.path,
        title: d.title,
        wordCount: d.wordCount,
        tags: d.tags,
        isFolder: d.isFolder,
        degree: deg,
        cluster: clusterOf(d.path),
        mtime: d.mtime,
        isOrphan: deg === 0,
      };
    });

    let nodes = allNodes;
    let edges = allEdges;

    if (view === 'orphans') {
      nodes = allNodes.filter((n) => n.isOrphan);
      edges = [];
    } else if (view === 'local' && focus) {
      // BFS 展开 depth 跳
      const adj = new Map<string, Set<string>>();
      for (const e of allEdges) {
        if (!adj.has(e.source)) adj.set(e.source, new Set());
        if (!adj.has(e.target)) adj.set(e.target, new Set());
        adj.get(e.source)!.add(e.target);
        adj.get(e.target)!.add(e.source);
      }
      const visited = new Set<string>([focus]);
      let frontier = new Set<string>([focus]);
      for (let d = 0; d < depth; d++) {
        const next = new Set<string>();
        for (const p of frontier) {
          for (const nb of adj.get(p) || []) {
            if (!visited.has(nb)) { visited.add(nb); next.add(nb); }
          }
        }
        frontier = next;
      }
      nodes = allNodes.filter((n) => visited.has(n.id));
      edges = allEdges.filter((e) => visited.has(e.source) && visited.has(e.target));
    }

    // 聚类颜色映射
    const clusterSet = new Set(nodes.map((n) => n.cluster));
    const clusters = Array.from(clusterSet);

    return NextResponse.json({
      ok: true,
      data: {
        nodes,
        edges,
        clusters,
        stats: {
          totalNodes: allNodes.length,
          totalEdges: allEdges.length,
          orphanCount: allNodes.filter((n) => n.isOrphan).length,
          viewNodes: nodes.length,
          viewEdges: edges.length,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build graph';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
