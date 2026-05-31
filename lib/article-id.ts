import fs from 'fs';
import path from 'path';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');
const REGISTRY_PATH = path.join(WIKI_DATA_DIR, '.id-registry.json');

interface Registry {
  idToPath: Record<string, string>;
  pathToId: Record<string, string>;
}

let _registry: Registry | null = null;

function loadRegistry(): Registry {
  if (_registry) return _registry;
  try {
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    _registry = JSON.parse(raw) as Registry;
  } catch {
    _registry = { idToPath: {}, pathToId: {} };
  }
  return _registry;
}

function saveRegistry(): void {
  const reg = loadRegistry();
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2), 'utf-8');
}

/** 生成 8 位 base36 ID (a-z0-9) */
function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const reg = loadRegistry();
  for (let attempt = 0; attempt < 100; attempt++) {
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!reg.idToPath[id]) return id;
  }
  // 极端情况：加长到 12 位
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)];
  }
  return id;
}

/** 获取或创建文章的持久化 ID */
export function getOrCreateId(articlePath: string): string {
  const reg = loadRegistry();
  const existing = reg.pathToId[articlePath];
  if (existing) return existing;

  const id = generateId();
  reg.idToPath[id] = articlePath;
  reg.pathToId[articlePath] = id;
  saveRegistry();
  return id;
}

/** 通过 ID 查找文章路径 */
export function getPathById(id: string): string | null {
  if (!id || !/^[a-z0-9]{6,16}$/.test(id)) return null;
  const reg = loadRegistry();
  return reg.idToPath[id] ?? null;
}

/** 文章/文件夹移动或重命名时更新映射，保持 ID 不变；支持纯目录（自身无 ID）的子路径批量更新 */
export function updatePath(oldPath: string, newPath: string): void {
  const reg = loadRegistry();
  let changed = false;

  // 1) 若自身有 ID 映射则更新（叶子文章、父页面）
  const selfId = reg.pathToId[oldPath];
  if (selfId) {
    delete reg.pathToId[oldPath];
    reg.pathToId[newPath] = selfId;
    reg.idToPath[selfId] = newPath;
    changed = true;
  }

  // 2) 遍历更新所有后代路径（纯目录文件夹也会命中）
  const prefix = oldPath + '/';
  for (const [p, pid] of Object.entries(reg.pathToId)) {
    if (p.startsWith(prefix)) {
      const newChildPath = newPath + '/' + p.slice(prefix.length);
      delete reg.pathToId[p];
      reg.pathToId[newChildPath] = pid;
      reg.idToPath[pid] = newChildPath;
      changed = true;
    }
  }

  if (changed) saveRegistry();
}

/** 删除文章时清理 ID 映射 */
export function removePath(articlePath: string): void {
  const reg = loadRegistry();
  const id = reg.pathToId[articlePath];
  if (id) {
    delete reg.idToPath[id];
    delete reg.pathToId[articlePath];
  }

  // 同时清理子文章
  const prefix = articlePath + '/';
  const entries = Object.entries(reg.pathToId);
  for (const [p, pid] of entries) {
    if (p.startsWith(prefix)) {
      delete reg.idToPath[pid];
      delete reg.pathToId[p];
    }
  }
  saveRegistry();
}

/** 批量为所有文章分配 ID（启动时调用） */
export function ensureAllArticlesHaveIds(articlePaths: string[]): void {
  const reg = loadRegistry();
  let changed = false;
  for (const p of articlePaths) {
    if (!reg.pathToId[p]) {
      const id = generateId();
      reg.idToPath[id] = p;
      reg.pathToId[p] = id;
      changed = true;
    }
  }
  if (changed) saveRegistry();
}

/**
 * 获取文章的 ID 链：按路径层级，从根到叶每个节点的 ID 用 / 拼接。
 * 例如 "技术/Python/基础" → "abc12345/def67890/ghi12345"
 */
export function getIdChain(articlePath: string): string {
  const parts = articlePath.split('/');
  const ids: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const subPath = parts.slice(0, i + 1).join('/');
    ids.push(getOrCreateId(subPath));
  }
  return ids.join('/');
}

