export type ResultCategory =
  | 'article'
  | 'note'
  | 'thought'
  | 'favorite'
  | 'command';

export interface BaseResult {
  id: string;
  category: ResultCategory;
  label: string; // 主显示文本
  hint?: string; // 副文本（路径/原文片段）
  keywords?: string[]; // 用于扩展匹配
}

export interface ArticleResult extends BaseResult {
  category: 'article';
  idChain: string;
}

export interface NoteResult extends BaseResult {
  category: 'note';
  articleId: string;
  noteId: string;
  anchor: { startOffset: number; endOffset: number; quote: string };
}

export interface ThoughtResult extends BaseResult {
  category: 'thought';
  articleId: string;
  thoughtId: string;
  anchor: { startOffset: number; endOffset: number; quote: string };
}

export interface FavoriteResult extends BaseResult {
  category: 'favorite';
  idChain: string;
}

export interface CommandResult extends BaseResult {
  category: 'command';
  run: () => void | Promise<void>;
}

export type Result =
  | ArticleResult
  | NoteResult
  | ThoughtResult
  | FavoriteResult
  | CommandResult;
