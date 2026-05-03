'use client';

export function readPulseJsonCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

export function writePulseJsonCache(key: string, value: unknown) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota failures
  }
}

export function removePulseCache(...keys: string[]) {
  if (typeof window === 'undefined') return;

  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  });
}
