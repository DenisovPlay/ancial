import { ru } from './ru.ts';
import { en } from './en.ts';
import { be } from './be.ts';

/**
 * Master registry of supported application locales.
 * To add a new language to the entire application:
 * 1. Create a new `.ts` file in `app/locales/` (e.g. `be.ts`) with `langname` and `langtitle`.
 * 2. Import it here and add it to `locales`.
 * It will automatically appear in all UI dropdowns and settings.
 */
export const locales = {
  ru,
  en,
  be,
} as const;

export type SupportedLang = keyof typeof locales;

export interface LocaleMeta {
  code: string;
  title: string;
}

/**
 * Automatically builds the list of available languages from registered locale dictionaries.
 */
export const availableLocales: LocaleMeta[] = Object.entries(locales).map(([key, dict]) => ({
  code: dict.langname || key,
  title: dict.langtitle || dict.langname || key,
}));

export function isSupportedLang(code: unknown): code is SupportedLang {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(locales, code);
}

export function resolveLocaleDict(code?: unknown): Record<string, string> {
  if (typeof code === 'string' && isSupportedLang(code)) {
    return locales[code];
  }
  return locales.ru;
}

export function getStoredLangCode(): SupportedLang {
  if (typeof window === 'undefined') return 'ru';
  try {
    const stored = localStorage.getItem('lang');
    if (isSupportedLang(stored)) {
      return stored;
    }
    const cookieMatch = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
    if (cookieMatch && isSupportedLang(cookieMatch[1])) {
      return cookieMatch[1];
    }
    const navLang = (navigator.language || '').toLowerCase().slice(0, 2);
    if (isSupportedLang(navLang)) {
      return navLang;
    }
  } catch {
    // Local storage / cookie access failed
  }
  return 'ru';
}

export function saveStoredLangCode(langCode: SupportedLang | string): void {
  if (typeof window === 'undefined') return;
  const targetCode = isSupportedLang(langCode) ? langCode : 'ru';
  try {
    localStorage.setItem('lang', targetCode);
    document.cookie = `lang=${targetCode}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Local storage / cookie access failed
  }
}
