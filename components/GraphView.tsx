'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Search, Globe, Target, Ghost } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/* ── 类型 ── */

interface GraphNode {
  id: string;
  title: string;
  wordCount: number;
  tags: string[];
  isFolder: boolean;
  degree: number;
  cluster: string;
  mtime?: number;
  isOrphan?: boolean;
  // 仿真坐标
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string;
  target: string;
  kind?: 'wikilink' | 'mdlink' | 'pagelink' | 'parent';
}

interface GraphViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (path: string) => void;
  highlightPath?: string;
}

type ViewMode = 'global' | 'local' | 'orphans';

/* ── 稳定的聚类颜色（根据 cluster 名 hash） ── */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function clusterColor(cluster: string, isDark = false): string {
  const palette = isDark
    ? ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f43f5e']
    : ['#4f46e5', '#059669', '#d97706', '#db2777', '#0d9488', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#e11d48'];
  return palette[hashStr(cluster) % palette.length];
}

function getColors() {
  const isDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    edge: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    edgeHighlight: isDark ? 'rgba(100,180,255,0.6)' : 'rgba(0,117,222,0.5)',
    orphan: isDark ? 'rgba(150,150,150,0.5)' : 'rgba(140,140,140,0.7)',
    highlight: '#2383e2',
    hovered: '#ff8c32',
    searchMatch: '#ffd849',
    labelPri: isDark ? 'rgba(240,240,240,0.95)' : 'rgba(30,30,30,0.95)',
    labelSec: isDark ? 'rgba(200,200,200,0.7)' : 'rgba(80,80,80,0.7)',
    labelBg: isDark ? 'rgba(30,30,30,0.82)' : 'rgba(255,255,255,0.85)',
    isDark,
  };
}

export function GraphView({ isOpen, onClose, onSelectDoc, highlightPath }: GraphViewProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const [stats, setStats] = useState({ totalNodes: 0, totalEdges: 0, orphanCount: 0, viewNodes: 0, viewEdges: 0 });
  const [allTags, setAllTags] = useState<string[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [localFocus, setLocalFocus] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const searchResultsRef = useRef<GraphNode[]>([]);

  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [, forceRender] = useState(0);

  const draggingNodeRef = useRef<GraphNode | null>(null);
  const draggingCanvasRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const simRunningRef = useRef(false);
  const alphaRef = useRef(1);

  // 加载图数据（根据 viewMode 切换）
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('view', viewMode);
      if (viewMode === 'local') {
        const focus = localFocus || highlightPath || '';
        if (focus) qs.set('focus', focus);
        qs.set('depth', '2');
      }
      const res = await fetch(`/api/graph?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) { setLoading(false); return; }

      const { nodes: rawNodes, edges: rawEdges, clusters: cl, stats: st } = json.data;
      const w = containerRef.current?.clientWidth || 900;
      const h = containerRef.current?.clientHeight || 600;

      type RawNode = Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy'>;
      const simNodes: GraphNode[] = (rawNodes as RawNode[]).map((n, i) => {
        const depth = n.id.split('/').length;
        const angle = (i / Math.max(1, rawNodes.length)) * Math.PI * 2 + depth * 0.5;
        const r = 80 + depth * 60 + Math.random() * 40;
        return {
          ...n,
          x: w / 2 + Math.cos(angle) * r,
          y: h / 2 + Math.sin(angle) * r,
          vx: 0, vy: 0,
        };
      });

      nodesRef.current = simNodes;
      edgesRef.current = rawEdges;
      setStats(st);
      setClusters(cl || []);

      const tagSet = new Set<string>();
      for (const n of simNodes) for (const tag of n.tags) tagSet.add(tag);
      setAllTags(Array.from(tagSet).sort());

      zoomRef.current = 1;
      offsetRef.current = { x: 0, y: 0 };
      alphaRef.current = 1;
      simRunningRef.current = true;
    } catch { /* ignore */ }
    setLoading(false);
  }, [viewMode, localFocus, highlightPath]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setSearchResults([]);
    setHoveredNode(null);
    void fetchData();
  }, [isOpen, fetchData]);

  // 仿真步进
  const tick = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0) return;

    const w = containerRef.current?.clientWidth || 900;
    const h = containerRef.current?.clientHeight || 600;
    const alpha = alphaRef.current;

    if (alpha < 0.001 && !draggingNodeRef.current) {
      simRunningRef.current = false;
      draw();
      return;
    }

    const nodeMap = new Map<string, GraphNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    const repulsion = 600 * alpha;
    const attraction = 0.015;
    const centerForce = 0.008 * alpha;
    const damping = 0.88;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]; const b = nodes[j];
        let dx = b.x - a.x; let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist = 1; }
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force; const fy = (dy / dist) * force;
        if (a.fx == null) { a.vx -= fx; a.vy -= fy; }
        if (b.fx == null) { b.vx += fx; b.vy += fy; }
      }
    }

    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const isParent = edge.kind === 'parent';
      const k = isParent ? attraction * 2 : attraction;
      const idealLen = isParent ? 80 : 120;
      const force = (dist - idealLen) * k;
      const fx = (dx / dist) * force; const fy = (dy / dist) * force;
      if (a.fx == null) { a.vx += fx; a.vy += fy; }
      if (b.fx == null) { b.vx -= fx; b.vy -= fy; }
    }

    for (const n of nodes) {
      if (n.fx != null) continue;
      n.vx += (w / 2 - n.x) * centerForce;
      n.vy += (h / 2 - n.y) * centerForce;
    }

    for (const n of nodes) {
      if (n.fx != null) { n.x = n.fx; n.y = n.fy!; n.vx = 0; n.vy = 0; continue; }
      n.vx *= damping; n.vy *= damping;
      n.x += n.vx; n.y += n.vy;
    }

    alphaRef.current *= 0.995;
    if (draggingNodeRef.current) alphaRef.current = Math.max(alphaRef.current, 0.05);

    draw();
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!isOpen || loading) return;
    simRunningRef.current = true;
    alphaRef.current = 1;
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isOpen, loading, tick]);

  // 绘制 —— 用 screen coord 绘制，zoom 只换算节点位置，节点/文字/边宽度始终固定
  // 这样放大后只是节点散开距离变大，节点本身、字体、线条粗细保持清晰
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const zoom = zoomRef.current;
    const offset = offsetRef.current;
    const toScreen = (wx: number, wy: number): [number, number] => [wx * zoom + offset.x, wy * zoom + offset.y];

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const colors = getColors();
    const nodeMap = new Map<string, GraphNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    const searchMatchIds = new Set(searchResultsRef.current.map((n) => n.id));
    const hasSearch = searchQuery.length > 0;
    const tagMatch = (n: GraphNode): boolean => !filterTag || n.tags.includes(filterTag);

    const activeNodeId = hoveredNode?.id || highlightPath ||
      (searchResultsRef.current.length === 1 ? searchResultsRef.current[0].id : null);
    const neighborIds = new Set<string>();
    if (activeNodeId) {
      for (const e of edges) {
        if (e.source === activeNodeId) neighborIds.add(e.target);
        if (e.target === activeNodeId) neighborIds.add(e.source);
      }
    }

    // 画边（screen coord，线宽固定）
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;
      if (!tagMatch(a) || !tagMatch(b)) continue;
      const isActive = activeNodeId && (edge.source === activeNodeId || edge.target === activeNodeId);
      ctx.strokeStyle = isActive ? colors.edgeHighlight : colors.edge;
      ctx.lineWidth = isActive ? 2 : (edge.kind === 'wikilink' ? 1.2 : 0.8);
      const [sx1, sy1] = toScreen(a.x, a.y);
      const [sx2, sy2] = toScreen(b.x, b.y);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    }

    // 用于标签去重的已占用矩形（避免重叠）
    const occupiedLabels: Array<{ x: number; y: number; w: number; h: number }> = [];
    const overlaps = (x: number, y: number, tw: number, th: number): boolean => {
      for (const r of occupiedLabels) {
        if (!(x + tw < r.x || x > r.x + r.w || y + th < r.y || y > r.y + r.h)) return true;
      }
      return false;
    };

    // 画节点（screen coord，半径固定/微调，字体固定）
    for (const node of nodes) {
      if (!tagMatch(node)) continue;
      const isHighlight = highlightPath === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const isSearchMatch = hasSearch && searchMatchIds.has(node.id);
      const isNeighbor = neighborIds.has(node.id);
      const [sx, sy] = toScreen(node.x, node.y);

      // 节点基础半径（screen 固定，与 zoom 无关）
      const baseR = Math.max(4, Math.min(14, 3 + Math.log(1 + node.degree) * 2 + Math.log(1 + node.wordCount / 80)));
      // 当极度放大（>2x）时稍微放大节点以便点击，但不过度
      const displayR = baseR * Math.min(1.6, Math.max(0.8, Math.pow(zoom, 0.25)));

      let fillColor = node.isOrphan ? colors.orphan : clusterColor(node.cluster, colors.isDark);
      if (isSearchMatch) fillColor = colors.searchMatch;
      if (isHighlight) fillColor = colors.highlight;
      if (isHovered) fillColor = colors.hovered;

      const dimmed = (hasSearch && !isSearchMatch && !isHovered) ||
                     (filterTag !== null && !node.tags.includes(filterTag));
      if (dimmed) ctx.globalAlpha = 0.15;

      ctx.beginPath();
      ctx.arc(sx, sy, displayR, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();

      if (isHighlight || isHovered || isSearchMatch) {
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, displayR + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 标签：字体固定大小；放大时更多节点显示，但仍然做重叠裁剪
      const showLabel =
        isHighlight || isHovered || isSearchMatch || isNeighbor ||
        node.isFolder ||
        (zoom >= 0.8 && node.degree >= 3) ||
        (zoom >= 1.5 && node.degree >= 1) ||
        (zoom >= 2.5);
      if (showLabel) {
        const isPri = isHovered || isHighlight || isSearchMatch;
        const fontSize = isPri ? 12 : 11;
        ctx.font = `${isPri ? '600' : '400'} ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = node.title.length > 20 ? node.title.slice(0, 20) + '…' : node.title;
        const tw = ctx.measureText(label).width;
        const pad = 3;
        const labelX = sx - tw / 2 - pad;
        const labelY = sy - displayR - 8 - fontSize;
        // 非重要节点：重叠则跳过
        if (!isPri && overlaps(labelX, labelY, tw + pad * 2, fontSize + pad * 2)) {
          // skip
        } else {
          occupiedLabels.push({ x: labelX, y: labelY, w: tw + pad * 2, h: fontSize + pad * 2 });
          if (isPri) {
            ctx.fillStyle = colors.labelBg;
            ctx.beginPath();
            ctx.roundRect(labelX, labelY, tw + pad * 2, fontSize + pad * 2, 3);
            ctx.fill();
          }
          ctx.fillStyle = isPri ? colors.labelPri : colors.labelSec;
          ctx.fillText(label, sx, labelY + (fontSize + pad * 2) / 2);
        }
      }
      if (dimmed) ctx.globalAlpha = 1;
    }
  }, [hoveredNode, highlightPath, searchQuery, filterTag]);

  // 搜索
  useEffect(() => {
    if (!searchQuery.trim()) { searchResultsRef.current = []; setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const matches = nodesRef.current.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        n.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
    searchResultsRef.current = matches;
    setSearchResults(matches);
    if (matches.length === 1) {
      const node = matches[0];
      const w = containerRef.current?.clientWidth || 900;
      const h = containerRef.current?.clientHeight || 600;
      const zoom = zoomRef.current;
      offsetRef.current = { x: w / 2 - node.x * zoom, y: (h - 48) / 2 - node.y * zoom };
    }
    requestAnimationFrame(draw);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // 每次 filterTag 改变立刻重绘
  useEffect(() => {
    if (!simRunningRef.current) requestAnimationFrame(draw);
  }, [filterTag, draw]);

  // 鼠标工具 —— 所有 hit-test 都在 screen 空间做（因为节点半径是 screen 固定）
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - offsetRef.current.y) / zoomRef.current,
    };
  }, []);

  const findNodeAtScreen = useCallback((clientX: number, clientY: number): GraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const zoom = zoomRef.current;
    const offset = offsetRef.current;
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const nsx = n.x * zoom + offset.x;
      const nsy = n.y * zoom + offset.y;
      const dx = sx - nsx; const dy = sy - nsy;
      const baseR = Math.max(4, Math.min(14, 3 + Math.log(1 + n.degree) * 2 + Math.log(1 + n.wordCount / 80)));
      const displayR = baseR * Math.min(1.6, Math.max(0.8, Math.pow(zoom, 0.25)));
      const hit = displayR + 4;
      if (dx * dx + dy * dy < hit * hit) return n;
    }
    return null;
  }, []);

  // 兼容旧签名（world 坐标找节点）—— 不再使用，保留为空以防调用方遗漏
  const findNodeAt = useCallback((_wx: number, _wy: number): GraphNode | null => null, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = findNodeAtScreen(e.clientX, e.clientY);
    if (node) {
      draggingNodeRef.current = node;
      node.fx = node.x; node.fy = node.y;
      alphaRef.current = Math.max(alphaRef.current, 0.1);
      if (!simRunningRef.current) { simRunningRef.current = true; animFrameRef.current = requestAnimationFrame(tick); }
    } else {
      draggingCanvasRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
    e.currentTarget.style.cursor = 'grabbing';
  }, [findNodeAtScreen, tick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingNodeRef.current) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      draggingNodeRef.current.fx = x; draggingNodeRef.current.fy = y;
      return;
    }
    if (draggingCanvasRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      offsetRef.current = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
      requestAnimationFrame(draw);
      return;
    }
    const node = findNodeAtScreen(e.clientX, e.clientY);
    setHoveredNode(node);
    e.currentTarget.style.cursor = node ? 'pointer' : 'grab';
    if (!simRunningRef.current) requestAnimationFrame(draw);
  }, [screenToWorld, findNodeAtScreen, draw]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingNodeRef.current) {
      draggingNodeRef.current.fx = null;
      draggingNodeRef.current.fy = null;
      draggingNodeRef.current = null;
    }
    draggingCanvasRef.current = false;
    const node = findNodeAtScreen(e.clientX, e.clientY);
    e.currentTarget.style.cursor = node ? 'pointer' : 'grab';
  }, [findNodeAtScreen]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingCanvasRef.current) return;
    const node = findNodeAtScreen(e.clientX, e.clientY);
    if (node && !node.isFolder) {
      onSelectDoc(node.id);
      onClose();
    }
  }, [findNodeAtScreen, onSelectDoc, onClose]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = findNodeAtScreen(e.clientX, e.clientY);
    if (node) {
      setLocalFocus(node.id);
      setViewMode('local');
    }
  }, [findNodeAtScreen]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZoom = zoomRef.current;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.max(0.1, Math.min(8, oldZoom * factor));
    offsetRef.current = {
      x: mx - (mx - offsetRef.current.x) * (newZoom / oldZoom),
      y: my - (my - offsetRef.current.y) * (newZoom / oldZoom),
    };
    zoomRef.current = newZoom;
    forceRender((v) => v + 1);
    if (!simRunningRef.current) requestAnimationFrame(draw);
  }, [draw]);

  // 缩放以画布中心为锚点（使画面不"飞走"）
  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const oldZoom = zoomRef.current;
    const newZoom = Math.max(0.1, Math.min(8, oldZoom * factor));
    offsetRef.current = {
      x: cx - (cx - offsetRef.current.x) * (newZoom / oldZoom),
      y: cy - (cy - offsetRef.current.y) * (newZoom / oldZoom),
    };
    zoomRef.current = newZoom;
    forceRender((v) => v + 1);
    if (!simRunningRef.current) requestAnimationFrame(draw);
  };
  const zoomIn = () => zoomBy(1.3);
  const zoomOut = () => zoomBy(1 / 1.3);
  const resetView = () => {
    zoomRef.current = 1; offsetRef.current = { x: 0, y: 0 };
    alphaRef.current = 0.3;
    forceRender((v) => v + 1);
    if (!simRunningRef.current) { simRunningRef.current = true; animFrameRef.current = requestAnimationFrame(tick); }
  };

  const focusNode = (node: GraphNode) => {
    const w = containerRef.current?.clientWidth || 900;
    const h = containerRef.current?.clientHeight || 600;
    const zoom = zoomRef.current;
    offsetRef.current = { x: w / 2 - node.x * zoom, y: (h - 48) / 2 - node.y * zoom };
    setHoveredNode(node);
    setSearchQuery('');
    if (!simRunningRef.current) requestAnimationFrame(draw);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        className="relative"
        style={{
          width: '92vw',
          height: '85vh',
          maxWidth: '1400px',
          background: 'var(--c-bacPri)',
          borderRadius: '12px',
          boxShadow: 'var(--c-shaOutLg)',
          border: '1px solid var(--c-borPri)',
          overflow: 'hidden',
        }}
      >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-between px-4 py-2.5 gap-3"
          style={{ borderBottom: '1px solid var(--c-borSec)' }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-texPri)' }}>{t('graph.title')}</h2>

          {/* 视图切换 */}
          <div style={{ display: 'flex', gap: '2px', padding: '2px', background: 'var(--c-bacTer)', borderRadius: '6px' }}>
            {[
              { v: 'global' as const, icon: Globe, label: '全局' },
              { v: 'local' as const, icon: Target, label: '局部' },
              { v: 'orphans' as const, icon: Ghost, label: `孤岛 (${stats.orphanCount})` },
            ].map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => {
                  if (v === 'local' && !localFocus && !highlightPath) {
                    alert('局部视图需要先选一个中心节点：双击图中任意节点进入局部图');
                    return;
                  }
                  setViewMode(v);
                }}
                className="nx-hoverable"
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: '4px',
                  background: viewMode === v ? 'var(--c-bacPri)' : 'transparent',
                  color: viewMode === v ? 'var(--nx-blue)' : 'var(--c-texSec)',
                  fontWeight: viewMode === v ? 500 : 400,
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  boxShadow: viewMode === v ? 'var(--c-shaOutMd)' : 'none',
                }}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          {/* 搜索 */}
          <div className="relative" style={{ flex: '0 1 220px' }}>
            <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: 'var(--c-icoTer)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索节点"
              style={{
                width: '100%', padding: '5px 10px 5px 26px', borderRadius: '6px', fontSize: '12px',
                color: 'var(--c-texPri)', background: 'var(--c-bacTer)',
                border: '1px solid var(--c-borSec)', outline: 'none',
              }}
            />
            {searchQuery && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--c-bacSec)', border: '1px solid var(--c-borSec)', borderRadius: '8px', maxHeight: '240px', overflowY: 'auto', zIndex: 10, boxShadow: 'var(--c-shaOutMd)' }}>
                {searchResults.slice(0, 10).map((node) => (
                  <button key={node.id} onClick={() => focusNode(node)} className="nx-hoverable" style={{ display: 'block', width: '100%', padding: '6px 12px', textAlign: 'left', fontSize: '12px', color: 'var(--c-texPri)', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--c-borSec)' }}>
                    <div style={{ fontWeight: 500 }}>{node.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--c-texDis)', marginTop: '1px' }}>{node.id} · {node.degree} 连接</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span style={{ fontSize: '11px', color: 'var(--c-texDis)', whiteSpace: 'nowrap' }}>
            {stats.viewNodes}/{stats.totalNodes} 节点 · {stats.viewEdges} 连接
          </span>

          <div className="flex items-center gap-0.5">
            <button onClick={zoomIn} className="nx-hoverable rounded p-1" style={{ color: 'var(--c-icoSec)' }} title="放大"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={zoomOut} className="nx-hoverable rounded p-1" style={{ color: 'var(--c-icoSec)' }} title="缩小"><ZoomOut className="h-4 w-4" /></button>
            <button onClick={resetView} className="nx-hoverable rounded p-1" style={{ color: 'var(--c-icoSec)' }} title="重置"><Maximize2 className="h-4 w-4" /></button>
            <button onClick={onClose} className="nx-hoverable rounded p-1" style={{ color: 'var(--c-icoSec)' }}><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* 局部视图 focus 提示 */}
        {viewMode === 'local' && (localFocus || highlightPath) && (
          <div style={{ padding: '4px 16px', fontSize: '11px', color: 'var(--c-texTer)', borderBottom: '1px solid var(--c-borSec)', background: 'var(--c-bacSec)' }}>
            🎯 局部中心: <code>{localFocus || highlightPath}</code> · 双击其他节点可切换中心
          </div>
        )}

        {/* 聚类 / 标签过滤 */}
        {(clusters.length > 0 || allTags.length > 0) && (
          <div className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto" style={{ borderBottom: '1px solid var(--c-borSec)', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: 'var(--c-texDis)', marginRight: '4px', flexShrink: 0 }}>聚类:</span>
            {clusters.slice(0, 8).map((c) => (
              <span key={c} className="flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--c-texTer)', padding: '2px 6px', borderRadius: '4px', background: 'var(--c-bacSec)', flexShrink: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: clusterColor(c), display: 'inline-block' }} />
                {c === '__root__' ? '(根)' : c}
              </span>
            ))}
            {allTags.length > 0 && (
              <>
                <span style={{ fontSize: '11px', color: 'var(--c-texDis)', marginLeft: '12px', marginRight: '4px', flexShrink: 0 }}>标签:</span>
                <button
                  onClick={() => setFilterTag(null)}
                  className="nx-hoverable rounded-full px-2 py-0.5"
                  style={{ fontSize: '11px', color: filterTag === null ? 'var(--nx-blue)' : 'var(--c-texTer)', background: filterTag === null ? 'var(--nx-badge-bg)' : 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                >
                  {t('graph.allTags')}
                </button>
                {allTags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    className="nx-hoverable rounded-full px-2 py-0.5"
                    style={{ fontSize: '11px', color: filterTag === tag ? 'var(--nx-blue)' : 'var(--c-texTer)', background: filterTag === tag ? 'var(--nx-badge-bg)' : 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    {tag}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* 画布 */}
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 'calc(100% - 90px)' }}>
            <span style={{ color: 'var(--c-texDis)', fontSize: '14px' }}>{t('common.loading')}</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'calc(100% - 90px)', cursor: 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onMouseLeave={() => {
              if (draggingNodeRef.current) { draggingNodeRef.current.fx = null; draggingNodeRef.current.fy = null; draggingNodeRef.current = null; }
              draggingCanvasRef.current = false;
              setHoveredNode(null);
            }}
          />
        )}

        {/* hover 卡片 */}
        {hoveredNode && (
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', padding: '10px 14px', borderRadius: '10px', background: 'var(--c-bacSec)', border: '1px solid var(--c-borSec)', fontSize: '12px', color: 'var(--c-texSec)', maxWidth: '360px', boxShadow: 'var(--c-shaOutMd)' }}>
            <div style={{ fontWeight: 600, color: 'var(--c-texPri)', marginBottom: '4px', fontSize: '13px' }}>
              {hoveredNode.title}
              {hoveredNode.isOrphan && <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', background: 'rgba(140,140,140,0.2)', color: 'var(--c-texTer)', borderRadius: '3px' }}>孤岛</span>}
            </div>
            <div style={{ color: 'var(--c-texDis)' }}>
              {hoveredNode.id}
              {hoveredNode.wordCount > 0 && ` · ${hoveredNode.wordCount} 字`}
              {` · ${hoveredNode.degree} 连接`}
            </div>
            {hoveredNode.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {hoveredNode.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: 'var(--c-bacTer)', color: 'var(--c-texTer)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: '11px', color: 'var(--c-texDis)', marginTop: '6px' }}>
              单击打开 · 双击以此为中心 · 拖拽移动
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '16px', right: '16px', padding: '4px 10px', borderRadius: '6px', background: 'var(--c-bacSec)', border: '1px solid var(--c-borSec)', fontSize: '11px', color: 'var(--c-texDis)' }}>
          {Math.round(zoomRef.current * 100)}%
        </div>
      </div>
    </div>
  );
}
