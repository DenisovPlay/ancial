'use client';

import { cache } from './cache';

/**
 * Unified cache helpers for specific domains.
 * All direct localStorage/sessionStorage access should go through these helpers.
 */

// ==========================
// Types
// ==========================

export type SupportedLang = 'ru' | 'en';

// ==========================
// Authentication Token
// ==========================

/**
 * Get authentication token from cache.
 */
export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  
  try {
    return (cache.get<string>('token') || '').trim();
  } catch {
    return '';
  }
}

/**
 * Save authentication token to cache.
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    cache.set('token', token, {
      category: 'profile',
      isPersistent: true,
    });
  } catch (e) {
    console.error('[Cache] Error saving auth token:', e);
  }
}

// ==========================
// 7TV Stickers (sessionStorage)
// ==========================

const STICKERS_KEY = 'ancial_7tv_stickers';

export function get7TVStickers(): unknown[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = sessionStorage.getItem(STICKERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function set7TVStickers(stickers: unknown[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(STICKERS_KEY, JSON.stringify(stickers));
  } catch (e) {
    console.error('[Cache] Error saving 7TV stickers:', e);
  }
}

// ==========================
// Language Settings
// ==========================

/**
 * Get stored language code with fallback chain:
 * localStorage -> cookie -> navigator.language -> 'ru'
 */
export function getStoredLang(): SupportedLang {
  if (typeof window === 'undefined') return 'ru';
  
  try {
    // Try cache first (unified with localStorage under the hood)
    const cached = cache.get<string>('lang', { category: 'profile' });
    if (cached === 'ru' || cached === 'en') return cached;

    // Fallback to cookie
    const cookieMatch = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
    if (cookieMatch && (cookieMatch[1] === 'ru' || cookieMatch[1] === 'en')) {
      return cookieMatch[1] as SupportedLang;
    }

    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('ru')) return 'ru';
    if (navLang.startsWith('en')) return 'en';
  } catch (e) {
    console.error('[Cache] Error reading stored language:', e);
  }
  
  return 'ru';
}

/**
 * Save language code to both localStorage and cookie.
 */
export function saveStoredLang(langCode: SupportedLang): void {
  if (typeof window === 'undefined') return;
  
  try {
    cache.set('lang', langCode, {
      category: 'profile',
      isPersistent: true,
    });
    document.cookie = `lang=${langCode}; path=/; max-age=31536000`;
  } catch (e) {
    console.error('[Cache] Error saving stored language:', e);
  }
}

// ==========================
// Cinema Progress
// ==========================

export interface CinemaProgress {
  currentTime: number;
  duration: number;
  season?: number;
  episode?: number;
  translationId?: number | null;
  playerId?: string;
  updatedAt?: number;
}

/**
 * Get progress for a specific movie/series.
 */
export function getCinemaProgress(movieId: string | number): CinemaProgress | null {
  const id = String(movieId);
  
  try {
    const data = cache.get<CinemaProgress>(`cinema_progress_${id}`, {
      category: 'cinema',
      subcategory: 'progress',
    });
    return data || null;
  } catch {
    return null;
  }
}

/**
 * Save progress for a specific movie/series.
 */
export function setCinemaProgress(movieId: string | number, progress: CinemaProgress): void {
  const id = String(movieId);
  
  cache.set(`cinema_progress_${id}`, {
    ...progress,
    updatedAt: Date.now(),
  }, {
    category: 'cinema',
    subcategory: 'progress',
    isPersistent: true,
  });
}

/**
 * Remove progress for a specific movie/series.
 */
export function removeCinemaProgress(movieId: string | number): void {
  const id = String(movieId);
  cache.remove(`cinema_progress_${id}`, {
    category: 'cinema',
    subcategory: 'progress',
  });
}

// ==========================
// Cinema My List
// ==========================

const CINEMA_MY_LIST_KEY = 'frame_my_list';

/**
 * Get user's "My List" movie IDs from cache.
 */
export function getCinemaMyList(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CINEMA_MY_LIST_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[Cache] Error reading cinema my list:', e);
  }
  
  return [];
}

/**
 * Save user's "My List" movie IDs to cache.
 */
export function setCinemaMyList(ids: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CINEMA_MY_LIST_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('[Cache] Error saving cinema my list:', e);
  }
}

// ==========================
// Cinema Referrer (sessionStorage)
// ==========================

const CINEMA_REFERRER_KEY = 'ancial_cinema_info_referrer';

/**
 * Get saved cinema info page referrer URL.
 */
export function getCinemaReferrer(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return sessionStorage.getItem(CINEMA_REFERRER_KEY);
  } catch {
    return null;
  }
}

/**
 * Save cinema info page referrer URL.
 */
export function setCinemaReferrer(url: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(CINEMA_REFERRER_KEY, url);
  } catch (e) {
    console.error('[Cache] Error saving cinema referrer:', e);
  }
}

/**
 * Remove saved cinema info page referrer URL.
 */
export function removeCinemaReferrer(): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(CINEMA_REFERRER_KEY);
  } catch (e) {
    console.error('[Cache] Error removing cinema referrer:', e);
  }
}

// ==========================
// Language Settings
// ==========================

/**
 * Get stored language code with fallback chain:
 * localStorage -> cookie -> navigator.language -> 'ru'
 */
export function getLangFromCache(): SupportedLang {
  if (typeof window === 'undefined') return 'ru';
  
  try {
    const stored = localStorage.getItem('lang');
    if (stored === 'ru' || stored === 'en') {
      return stored;
    }

    const cookieMatch = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
    if (cookieMatch && (cookieMatch[1] === 'ru' || cookieMatch[1] === 'en')) {
      return cookieMatch[1] as SupportedLang;
    }

    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('ru')) return 'ru';
    if (navLang.startsWith('en')) return 'en';
  } catch (e) {
    console.error('[Cache] Error reading stored language:', e);
  }
  
  return 'ru';
}

/**
 * Save language code to both localStorage and cookie.
 */
export function saveLangToCache(langCode: SupportedLang): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('lang', langCode);
    document.cookie = `lang=${langCode}; path=/; max-age=31536000`;
  } catch (e) {
    console.error('[Cache] Error saving stored language:', e);
  }
}
