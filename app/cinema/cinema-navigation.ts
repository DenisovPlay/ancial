'use client';

import { setCinemaCache } from './cinema-cache';
import { CacheManager } from '../lib/cache';
import { Movie } from './types';

/**
 * Helper to navigate to a movie/series info page while preserving
 * the exact referrer URL and pre-caching movie data for zero-delay instant render.
 */
export function goToMovieInfo(router: any, movieId: string | number, movieData?: Movie) {
  const strId = String(movieId);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('ancial_cinema_info_referrer', window.location.pathname + window.location.search);
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
