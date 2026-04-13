import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const WIKI_DATA_DIR = path.join(process.cwd(), 'wiki-data');
const COMMENTS_DIR = path.join(WIKI_DATA_DIR, '.comments');

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

async function ensureDir() {
  await fs.mkdir(COMMENTS_DIR, { recursive: true });
}

function getCommentsFile(articlePath: string): string {
  // 用 MD5 hash 避免路径中的特殊字符
  const hash = crypto.createHash('md5').update(articlePath).digest('hex');
  return path.join(COMMENTS_DIR, `${hash}.json`);
}

export async function getComments(articlePath: string): Promise<Comment[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(getCommentsFile(articlePath), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addComment(articlePath: string, text: string): Promise<Comment> {
  await ensureDir();
  const comments = await getComments(articlePath);
  const comment: Comment = {
    id: crypto.randomBytes(8).toString('hex'),
    text,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  await fs.writeFile(getCommentsFile(articlePath), JSON.stringify(comments, null, 2), 'utf-8');
  return comment;
}

export async function deleteComment(articlePath: string, commentId: string): Promise<boolean> {
  await ensureDir();
  const comments = await getComments(articlePath);
  const idx = comments.findIndex((c) => c.id === commentId);
  if (idx === -1) return false;
  comments.splice(idx, 1);
  await fs.writeFile(getCommentsFile(articlePath), JSON.stringify(comments, null, 2), 'utf-8');
  return true;
}
