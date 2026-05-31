import { NextRequest, NextResponse } from 'next/server';
import { getAllDocs } from '@/lib/wiki-cache';
import { getPathById } from '@/lib/article-id';

export interface GraphNode {
  id: string;
  title: string;
  wordCount: number;
  tags: string[];
  isFolder: boolean;
  degree: number;
  cluster: string;
  mtime?: number;
  isOrphan?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'wikilink' | 'mdlink' | 'mention' | 'parent';
}

const ID_TOKEN_RE = /^[a-z0-9]{6,16}$/;

/** 从一个链接 href 中尝试解析出文档路径。 */
function resolveLinkToPath(href: string, pathSet: Set<string>): string | null {
  if (!href) return null;
  const raw = href.trim();
  if (!raw || raw.startsWith('http://') || raw.startsWith('https://')) return null;
  if (raw.startsWith('#') || raw.startsWith('mailto:')) return null;

  // 去 query / hash
  let h = raw.split('#')[0].split('?')[0];
  // /editor/<id>/<id>... 等内部路由前缀
  h = h.replace(/^\/(editor|view|write)\//, '');
  // 前导斜杠 + 尾部 .md
  h = h.replace(/^\//, '').replace(/\.md$/i, '');
  if (!h) return null;

  // 1) 全 ID 链：所有段都形如 [a-z0-9]{6,16}，取最后一段反查
  const segs = h.split('/').filter(Boolean);
  if (segs.length > 0 && segs.every((s) => ID_TOKEN_RE.test(s))) {
    const p = getPathById(segs[segs.length - 1]);
    if (p && pathSet.has(p)) return p;
  }
  // 2) 单段 ID
  if (segs.length === 1 && ID_TOKEN_RE.test(segs[0])) {
    const p = getPathById(segs[0]);
    if (p && pathSet.has(p)) return p;
  }
  // 3) 直接路径匹配
  if (pathSet.has(h)) return h;
  return null;
}

/** 从 markdown 内容里抽取 inline #tag（避开 heading / URL 锚点 / 代码块）。 */
function extractInlineTags(content: string): string[] {
  // 剥代码块
  let body = content.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
  // 剥 URL（防止 #anchor 误判）
  body = body.replace(/https?:\/\/\S+/g, ' ');
  // 剥 heading 行（# / ## / ### 开头）
  body = body
    .split('\n')
    .map((l) => (/^\s{0,3}#{1,6}\s/.test(l) ? '' : l))
    .join('\n');

  const tags = new Set<string>();
  const re = /(?:^|[\s(\[\{,，。；;])#([\u4e00-\u9fa5A-Za-z0-9_-]{2,32})(?=$|[\s)\]\},，。；;:：!?！？])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const tag = m[1].trim();
    // 排除纯数字
    if (/^\d+$/.test(tag)) continue;
    tags.add(tag);
  }
  return Array.from(tags);
}

/** 标准化标题以做"内文提及"匹配。 */
function normalizeForMatch(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/**
 * GET /api/graph?view=global|local|orphans&focus=<path>&depth=2&recent=7|30
 */
export async function GET(req: NextRequest) {
  try {
    const view = req.nextUrl.searchParams.get('view') || 'global';
    const focus = req.nextUrl.searchParams.get('focus') || '';
    const depth = Math.max(1, Math.min(4, Number(req.nextUrl.searchParams.get('depth') || '2')));
    const includeParent = req.nextUrl.searchParams.get('parent') !== '0';
    const recentDays = Number(req.nextUrl.searchParams.get('recent') || '0');

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

    /* 第一遍：解析显式链接 + inline tag */
    const inlineTagsByPath = new Map<string, string[]>();
    for (const doc of docs) {
      // wikilink [[xxx|text]] / [[xxx]]：xxx 可能是路径，也可能是 ID
      const wiki = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
      let m: RegExpExecArray | null;
      while ((m = wiki.exec(doc.content)) !== null) {
        const target = m[1].trim().replace(/\.md$/i, '');
        const resolved = resolveLinkToPath(target, pathSet);
        if (resolved) addEdge(doc.path, resolved, 'wikilink');
      }

      // markdown 链接 [text](href)
      const md = /\[[^\]]*\]\(([^)\s]+)\)/g;
      while ((m = md.exec(doc.content)) !== null) {
        const resolved = resolveLinkToPath(m[1], pathSet);
        if (resolved) addEdge(doc.path, resolved, 'mdlink');
      }

      // inline tag
      const tags = extractInlineTags(doc.content);
      if (tags.length > 0) inlineTagsByPath.set(doc.path, tags);

      // 父子（可选）
      if (includeParent && doc.path.includes('/')) {
        const parent = doc.path.split('/').slice(0, -1).join('/');
        if (parent) addEdge(parent, doc.path, 'parent');
      }
    }

    /* 第二遍：标题文本提及 (≥3 字符) */
    interface TitleIndex {
      path: string;
      key: string;
    }
    const titleIndex: TitleIndex[] = [];
    for (const doc of docs) {
      if (doc.isFolder) continue;
      const t = doc.title.trim();
      if (t.length < 3) continue;
      titleIndex.push({ path: doc.path, key: normalizeForMatch(t) });
    }
    // 长 title 优先匹配，避免短 title 把长的吃掉
    titleIndex.sort((a, b) => b.key.length - a.key.length);

    for (const doc of docs) {
      const haystack = normalizeForMatch(doc.content);
      for (const t of titleIndex) {
        if (t.path === doc.path) continue;
        if (haystack.includes(t.key)) {
          addEdge(doc.path, t.path, 'mention');
        }
      }
    }

    /* 度数 + 孤岛 */
    const degree = new Map<string, number>();
    for (const e of allEdges) {
      // mention 是弱边，不计入"重要度"判定，但参与孤岛判定
      degree.set(e.source, (degree.get(e.source) || 0) + 1);
      degree.set(e.target, (degree.get(e.target) || 0) + 1);
    }

    const clusterOf = (p: string): string => p.split('/')[0] || '__root__';

    const allNodes: GraphNode[] = docs.map((d) => {
      const deg = degree.get(d.path) || 0;
      const explicitTags = d.tags || [];
      const inlineTags = inlineTagsByPath.get(d.path) || [];
      const tagSet = new Set<string>([...explicitTags, ...inlineTags]);
      return {
        id: d.path,
        title: d.title,
        wordCount: d.wordCount,
        tags: Array.from(tagSet),
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

    /* 近期编辑过滤（仅给前端做高亮，不裁剪节点） */
    const recentCutoff =
      recentDays > 0 ? Date.now() - recentDays * 24 * 60 * 60 * 1000 : 0;

    const clusterSet = new Set(nodes.map((n) => n.cluster));
    const clusters = Array.from(clusterSet);

    /* 边类型分布（前端展示用） */
    const edgeKindCount: Record<string, number> = {};
    for (const e of allEdges) edgeKindCount[e.kind] = (edgeKindCount[e.kind] || 0) + 1;

    return NextResponse.json({
      ok: true,
      data: {
        nodes,
        edges,
        clusters,
        recentCutoff,
        stats: {
          totalNodes: allNodes.length,
          totalEdges: allEdges.length,
          orphanCount: allNodes.filter((n) => n.isOrphan).length,
          viewNodes: nodes.length,
          viewEdges: edges.length,
          edgeKindCount,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build graph';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}