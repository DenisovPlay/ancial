import { cache } from './cache.ts';
import { locales, getStoredLangCode, saveStoredLangCode, SupportedLang } from '../locales';

const CACHE_KEY = 'lang_cache';

export function getLangFromCache(): Record<string, string> {
  const cached = cache.get<Record<string, string>>(CACHE_KEY);
  if (cached) return cached;
  
  const code = getStoredLangCode();
  const activeDict = locales[code] || locales['ru'];
  saveLangToCache(activeDict);
  return activeDict;
}

export function saveLangToCache(lang: Record<string, string>) {
  cache.set(CACHE_KEY, lang, {
    category: 'profile',
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year offline storage
  });
}

export type { SupportedLang };
export { locales, getStoredLangCode, saveStoredLangCode };
