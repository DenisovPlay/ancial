'use client';

import { cache } from '../lib/cache';

export function getCinemaCacheKey(subcategory: string, idOrQuery?: string | number): string {
  return idOrQuery !== undefined && idOrQuery !== '' ? `${subcategory}:${idOrQuery}` : subcategory;
}

export function getCinemaCache<T>(subcategory: string, idOrQuery?: string | number): T | null {
  const key = getCinemaCacheKey(subcategory, idOrQuery);
  return cache.get<T>(key, { category: 'cinema', subcategory: subcategory as any });
}

export function setCinemaCache<T>(subcategory: string, idOrQuery: string | number | undefined, data: T, ttlMs?: number): void {
  const key = getCinemaCacheKey(subcategory, idOrQuery);
  cache.set<T>(key, data, { category: 'cinema', subcategory: subcategory as any, ttl: ttlMs || 24 * 60 * 60 * 1000 });
}
