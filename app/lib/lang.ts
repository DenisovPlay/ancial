import { cache } from './cache.ts';

const CACHE_KEY = 'lang_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export function getLangFromCache(): Record<string, string> | null {
  return cache.get<Record<string, string>>(CACHE_KEY);
}

export function saveLangToCache(lang: Record<string, string>) {
  cache.set(CACHE_KEY, lang, {
    category: 'profile',
    ttl: CACHE_DURATION,
  });
}
