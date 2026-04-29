'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from '@/lib/reader/storage-client';

export function useFavorite(articleId: string | null): {
  isFavorite: boolean;
  toggle: () => Promise<void>;
} {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!articleId) {
      setIsFavorite(false);
      return;
    }
    listFavorites().then((favs) => {
      setIsFavorite(favs.some((f) => f.articleId === articleId));
    });
  }, [articleId]);

  const toggle = useCallback(async () => {
    if (!articleId) return;
    if (isFavorite) {
      await removeFavorite(articleId);
      setIsFavorite(false);
    } else {
      await addFavorite(articleId);
      setIsFavorite(true);
    }
  }, [articleId, isFavorite]);

  // Listen for cmd+B custom event from useReaderHotkeys
  useEffect(() => {
    const onToggle = () => void toggle();
    document.addEventListener('reader:toggle-favorite', onToggle);
    return () =>
      document.removeEventListener('reader:toggle-favorite', onToggle);
  }, [toggle]);

  return { isFavorite, toggle };
}
