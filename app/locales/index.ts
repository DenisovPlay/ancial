import { getLangFromCache, saveLangToCache, SupportedLang } from '../lib/cache-helpers';
import { ru } from './ru';
import { en } from './en';

export const locales: Record<string, Record<string, string>> = {
  ru,
  en,
};

export type { SupportedLang };

export function getStoredLangCode(): SupportedLang {
  return getLangFromCache();
}

export function saveStoredLangCode(langCode: SupportedLang) {
  saveLangToCache(langCode);
}
