'use client';

import { cache } from '../lib/cache.ts';

export function readPulseJsonCache<T>(key: string): T | null {
  return cache.get<T>(key, { category: 'pulse' });
}

export function writePulseJsonCache(key: string, value: unknown) {
  cache.set(key, value, { category: 'pulse' });
}

export function removePulseCache(...keys: string[]) {
  keys.forEach((key) => {
    cache.remove(key, { category: 'pulse' });
  });
}
