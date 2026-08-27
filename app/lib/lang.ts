import { cache } from './cache.ts';
import {
  locales,
  getStoredLangCode,
  saveStoredLangCode,
  availableLocales,
  isSupportedLang,
  resolveLocaleDict,
  type SupportedLang,
  type LocaleMeta,
} from '../locales';

const CACHE_KEY = 'lang_cache';

export function getLangFromCache(): Record<string, string> {
  const cached = cache.get<Record<string, string>>(CACHE_KEY);
  if (cached && cached.langname && isSupportedLang(cached.langname)) {
    return cached;
  }

  const code = getStoredLangCode();
  const activeDict = resolveLocaleDict(code);
  saveLangToCache(activeDict);
  return activeDict;
}

export function saveLangToCache(lang: Record<string, string>) {
  cache.set(CACHE_KEY, lang, {
    category: 'profile',
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year offline storage
  });
}

export type { SupportedLang, LocaleMeta };
export {
  locales,
  getStoredLangCode,
  saveStoredLangCode,
  availableLocales,
  isSupportedLang,
  resolveLocaleDict,
};
