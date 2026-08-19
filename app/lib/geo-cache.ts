/**
 * Кэш кода страны пользователя (ISO 3166-1 alpha-2, uppercase).
 * TTL = до полуночи текущего дня — достаточно для геоблокировки треков.
 */
import { cache } from './cache.ts';
import { getMsUntilMidnight } from './home-info-cache';

const GEO_CACHE_KEY = 'user_country_code';
const GEO_CACHE_OPTS = { category: 'home', subcategory: 'geo' } as const;

export function readCachedCountry(): string | null {
  return cache.get<string>(GEO_CACHE_KEY, GEO_CACHE_OPTS);
}

export function writeCachedCountry(code: string) {
  cache.set(GEO_CACHE_KEY, code, {
    ...GEO_CACHE_OPTS,
    ttl: getMsUntilMidnight(),
  });
}
