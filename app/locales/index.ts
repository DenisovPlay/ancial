import { ru } from './ru';
import { en } from './en';

export const locales: Record<string, Record<string, string>> = {
  ru,
  en,
};

export type SupportedLang = 'ru' | 'en';

export function getStoredLangCode(): SupportedLang {
  if (typeof window === 'undefined') return 'ru';
  try {
    const local = localStorage.getItem('lang');
    if (local === 'ru' || local === 'en') return local;

    const cookieMatch = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
    if (cookieMatch && (cookieMatch[1] === 'ru' || cookieMatch[1] === 'en')) {
      return cookieMatch[1] as SupportedLang;
    }

    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('ru')) return 'ru';
    if (navLang.startsWith('en')) return 'en';
  } catch (e) {
    console.error('[Locales] Error reading stored language:', e);
  }
  return 'ru';
}

export function saveStoredLangCode(langCode: SupportedLang) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('lang', langCode);
    document.cookie = `lang=${langCode}; path=/; max-age=31536000`;
  } catch (e) {
    console.error('[Locales] Error saving stored language:', e);
  }
}
