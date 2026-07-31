'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cache } from '../../lib/cache';
import { normalizeSongIds } from './player-utils';

const FAVORITES_CACHE_KEY = 'pulse_fav_ids';
type PulseFavoriteWindow = Window & { _pulseLikedSongs?: number[] | null };

function readFavoriteIds() {
  try {
    const cached = cache.get<unknown>(FAVORITES_CACHE_KEY, { category: 'pulse', subcategory: 'favorites' });
    if (Array.isArray(cached)) return normalizeSongIds(cached);
    if (typeof window !== 'undefined') {
      const pulseWindow = window as PulseFavoriteWindow;
      if (Array.isArray(pulseWindow._pulseLikedSongs)) return normalizeSongIds(pulseWindow._pulseLikedSongs);
    }
  } catch {
    // The UI can continue with an empty local list.
  }
  return [];
}

export function usePulseFavoriteIds() {
  const [favoriteIds, setFavoriteIds] = useState<number[]>(readFavoriteIds);
  const favoriteIdsRef = useRef(favoriteIds);
  const revisionRef = useRef(0);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);

  const replaceFavoriteIds = useCallback((ids: number[]) => {
    const nextIds = normalizeSongIds(ids);
    revisionRef.current += 1;
    favoriteIdsRef.current = nextIds;
    setFavoriteIds(nextIds);
    try {
      cache.set(FAVORITES_CACHE_KEY, nextIds, { category: 'pulse', subcategory: 'favorites' });
    } catch {
      // Cache failure must not prevent UI updates.
    }
    if (typeof window !== 'undefined') {
      (window as PulseFavoriteWindow)._pulseLikedSongs = nextIds;
      window.dispatchEvent(new CustomEvent('pulse-likes-updated', { detail: nextIds }));
    }
  }, []);

  const getFavoriteIds = useCallback(() => favoriteIdsRef.current, []);
  const getFavoriteIdsSnapshot = useCallback(() => ({
    ids: favoriteIdsRef.current,
    revision: revisionRef.current,
  }), []);

  const updateFavoriteIds = useCallback((updater: (ids: number[]) => number[]) => {
    replaceFavoriteIds(updater(getFavoriteIds()));
  }, [getFavoriteIds, replaceFavoriteIds]);

  useEffect(() => {
    const handleLikesUpdated = (event: Event) => {
      const nextIds = normalizeSongIds((event as CustomEvent<unknown>).detail);
      revisionRef.current += 1;
      favoriteIdsRef.current = nextIds;
      setFavoriteIds(nextIds);
    };
    window.addEventListener('pulse-likes-updated', handleLikesUpdated);
    return () => window.removeEventListener('pulse-likes-updated', handleLikesUpdated);
  }, []);

  return {
    favoriteIds,
    getFavoriteIds,
    getFavoriteIdsSnapshot,
    replaceFavoriteIds,
    updateFavoriteIds,
  };
}
