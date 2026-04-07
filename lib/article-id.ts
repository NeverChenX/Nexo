import { createHash } from 'crypto';
import { getRecursiveTree } from '@/lib/storage';

interface TreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeItem[];
}

export function articlePathToId(articlePath: string): string {
  return createHash('md5').update(articlePath).digest('hex');
}

function collectArticlePaths(items: TreeItem[]): string[] {
  const paths: string[] = [];
  for (const item of items) {
    if (item.isFolder) {
      if (item.children?.length) {
        paths.push(...collectArticlePaths(item.children));
      }
      continue;
    }
    paths.push(item.path);
  }
  return paths;
}

export async function findArticlePathById(id: string): Promise<string | null> {
  if (!/^[a-f0-9]{32}$/i.test(id)) return null;
  const tree = (await getRecursiveTree()) as TreeItem[];
  const articlePaths = collectArticlePaths(tree);
  const target = id.toLowerCase();
  for (const articlePath of articlePaths) {
    if (articlePathToId(articlePath) === target) {
      return articlePath;
    }
  }
  return null;
}
