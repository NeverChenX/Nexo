'use client';

export interface FavoriteItem {
  path: string;
  title: string;
  addedAt: number;
  group?: string;
}

const STORAGE_KEY = 'nexo_favorites';

export function getFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteItem[];
  } catch {
    return [];
  }
}

export function isFavorite(path: string): boolean {
  return getFavorites().some((f) => f.path === path);
}

export function addFavorite(path: string, title: string): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  const items = getFavorites().filter((f) => f.path !== path);
  items.unshift({ path, title, addedAt: Date.now() });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

export function removeFavorite(path: string): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  const items = getFavorites().filter((f) => f.path !== path);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

export function toggleFavorite(path: string, title: string): { favorites: FavoriteItem[]; added: boolean } {
  if (isFavorite(path)) {
    return { favorites: removeFavorite(path), added: false };
  }
  return { favorites: addFavorite(path, title), added: true };
}

/** 获取所有分组名 */
export function getFavoriteGroups(): string[] {
  const items = getFavorites();
  const groups = new Set<string>();
  for (const item of items) {
    if (item.group) groups.add(item.group);
  }
  return Array.from(groups).sort();
}

/** 按分组获取收藏 */
export function getFavoritesByGroup(): Record<string, FavoriteItem[]> {
  const items = getFavorites();
  const grouped: Record<string, FavoriteItem[]> = {};
  const ungrouped: FavoriteItem[] = [];
  for (const item of items) {
    if (item.group) {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    } else {
      ungrouped.push(item);
    }
  }
  if (ungrouped.length > 0) grouped[''] = ungrouped;
  return grouped;
}

/** 设置收藏分组 */
export function setFavoriteGroup(path: string, group: string | undefined): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  const items = getFavorites();
  for (const item of items) {
    if (item.path === path) {
      item.group = group || undefined;
    }
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

/** 创建新分组（批量移动） */
export function createFavoriteGroup(name: string, paths: string[]): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  const items = getFavorites();
  const pathSet = new Set(paths);
  for (const item of items) {
    if (pathSet.has(item.path)) item.group = name;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

/** 按现存路径集合裁剪收藏（拿到服务端真实清单后调用，清理脏数据） */
export function pruneFavorites(existingPaths: Set<string>): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  const items = getFavorites().filter((f) => existingPaths.has(f.path));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}
