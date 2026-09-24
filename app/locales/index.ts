import { ru } from './ru.ts';

/**
 * Реестр языков приложения.
 *
 * В бандле только русский — язык по умолчанию и язык SSR. Остальные словари (~100–140 КБ каждый)
 * подгружаются отдельным чанком только при выборе: раньше все три ехали на каждую страницу.
 *
 * Добавить язык:
 * 1. Файл `app/locales/<код>.ts` с `langname` и `langtitle`.
 * 2. Строка в LOCALE_LOADERS и в availableLocales ниже.
 */
const LOCALE_LOADERS = {
  ru: () => Promise.resolve(ru),
  en: () => import('./en.ts').then((module) => module.en),
  be: () => import('./be.ts').then((module) => module.be),
} as const;

export type SupportedLang = keyof typeof LOCALE_LOADERS;

export interface LocaleMeta {
  code: string;
  title: string;
}

/** Названия языков для селекта — без загрузки самих словарей. */
export const availableLocales: LocaleMeta[] = [
  { code: 'ru', title: 'Русский (Россия)' },
  { code: 'en', title: 'English (US)' },
  { code: 'be', title: 'Беларуская (Беларусь)' },
];

/** Словарь по умолчанию: доступен сразу, без загрузки. */
export const defaultLocaleDict: Record<string, string> = ru;

export function isSupportedLang(code: unknown): code is SupportedLang {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(LOCALE_LOADERS, code);
}

/** Словарь языка; неизвестный код — русский. */
export function loadLocaleDict(code?: unknown): Promise<Record<string, string>> {
  return isSupportedLang(code) ? LOCALE_LOADERS[code]() : Promise.resolve(ru);
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
