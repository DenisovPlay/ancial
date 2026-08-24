'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { setCinemaCache } from './cinema-cache';
import { CacheManager } from '../lib/cache';
import { setCinemaReferrer } from '../lib/cache-helpers';
import { Movie } from './types';

/**
 * Helper to navigate to a movie/series info page while preserving
 * the exact referrer URL and pre-caching movie data for zero-delay instant render.
 */
export function goToMovieInfo(router: Pick<AppRouterInstance, 'push'>, movieId: string | number, movieData?: Movie) {
  const strId = String(movieId);
  if (typeof window !== 'undefined') {
    try {
      setCinemaReferrer(window.location.pathname + window.location.search);
      if (movieData) {
        setCinemaCache('info', strId, movieData);
        CacheManager.set(`cinema_video_by_id_${strId}`, movieData, {
          category: 'cinema',
          subcategory: 'video',
          ttl: 24 * 60 * 60 * 1000,
        });
      }
    } catch (e) {}
  }
  router.push(`/cinema/info/${strId}`);
}
