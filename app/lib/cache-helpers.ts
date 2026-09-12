import { cache } from './cache';

/**
 * Unified cache helpers for specific domains.
 * All direct localStorage/sessionStorage access should go through these helpers.
 */

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
