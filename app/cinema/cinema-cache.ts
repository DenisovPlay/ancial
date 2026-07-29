'use client';

import { cache } from '../lib/cache';

export function getCinemaCacheKey(category: string, idOrQuery?: string | number): string {
  return `ancial:cinema:${category}${idOrQuery !== undefined && idOrQuery !== '' ? `:${idOrQuery}` : ''}`;
}

export function getCinemaCache<T>(category: string, idOrQuery?: string | number): T | null {
  const key = getCinemaCacheKey(category, idOrQuery);
  return cache.get<T>(key, { category: 'cinema' });
}

export function setCinemaCache<T>(category: string, idOrQuery: string | number | undefined, data: T, ttlMs?: number): void {
  const key = getCinemaCacheKey(category, idOrQuery);
  cache.set<T>(key, data, { category: 'cinema', ttl: ttlMs || 24 * 60 * 60 * 1000 });
}
