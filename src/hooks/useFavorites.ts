import { useCallback, useEffect, useMemo, useState } from 'react';
import conversationsJson from '../data/conversations.json';
import { HANGUL_ITEMS } from '../data/hangulChart';
import { PRACTICE_SENTENCES } from '../data/practiceSentences';
import type { ConversationsDataset } from '../types/korean';

const STORAGE_KEY = 'korean-learning-favorites-v1';

const conversationsData = conversationsJson as ConversationsDataset;

const VALID_FAVORITE_IDS = new Set<string>([
  ...HANGUL_ITEMS.map((item) => item.id),
  ...PRACTICE_SENTENCES.map((sentence) => sentence.id),
  ...conversationsData.topics.flatMap((topic) =>
    topic.phrases.map((phrase) => phrase.id)
  ),
]);

function parseStoredIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of parsed) {
      if (
        typeof item === 'string' &&
        VALID_FAVORITE_IDS.has(item) &&
        !seen.has(item)
      ) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  } catch {
    return [];
  }
}

function loadInitialFavorites(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    return parseStoredIds(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export interface FavoritesController {
  favoriteIds: string[];
  favoriteSet: Set<string>;
  count: number;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  clearFavorites: () => void;
}

export function useFavorites(): FavoritesController {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    loadInitialFavorites()
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      // Ignore storage quota or private-mode restriction errors
    }
  }, [favoriteIds]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setFavoriteIds(parseStoredIds(event.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback(
    (id: string) => favoriteSet.has(id),
    [favoriteSet]
  );

  const toggleFavorite = useCallback((id: string) => {
    if (!VALID_FAVORITE_IDS.has(id)) {
      return;
    }
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const clearFavorites = useCallback(() => {
    setFavoriteIds([]);
  }, []);

  return {
    favoriteIds,
    favoriteSet,
    count: favoriteIds.length,
    isFavorite,
    toggleFavorite,
    clearFavorites,
  };
}
