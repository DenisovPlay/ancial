import { API_BASE, SITE_URL } from '../config.ts';
import { IS_NATIVE_APP } from './platform.ts';

/**
 * Пути, которые на сайте проксирует Next (rewrites в next.config.ts) на PHP-бэкенд.
 * В приложении прокси нет — такие пути идут на API_BASE напрямую (CORS + Bearer).
 */
const BACKEND_PATH_PREFIXES = ['/api/', '/image.php', '/track.php', '/includes/', '/engine/'];
/** Легаси-приложения бэкенда: только файлы — страницы вроде /apps/included/weather есть в самом приложении. */
const BACKEND_FILE_PREFIXES = ['/anui/', '/apps/included/'];

const API_ORIGIN = API_BASE.replace(/\/+$/, '');

/** Относительный путь бэкенда (/api/…, /image.php, /includes/…) — не файл из бандла приложения. */
export function isBackendPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (BACKEND_PATH_PREFIXES.some((prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix))) return true;
  const pathname = path.split(/[?#]/)[0];
  return BACKEND_FILE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && /\.[a-z0-9]+$/i.test(pathname);
}

/**
 * Адрес запроса к бэкенду. Сайт: путь как есть (его проксирует Next). Приложение: абсолютный URL
 * бэкенда. Абсолютные адреса и прочие пути не трогаются.
 */
export function apiUrl(path: string): string {
  if (!IS_NATIVE_APP || !isBackendPath(path)) return path;
  return `${API_ORIGIN}${path}`;
}

/** То же для чистой функции без флага сборки (тесты, загрузчик картинок). */
export function toBackendUrl(path: string): string {
  return isBackendPath(path) ? `${API_ORIGIN}${path}` : path;
}

/**
 * Публичная ссылка на страницу (поделиться, инвайт). Сайт — от текущего origin, как было.
 * Приложение — на сайт (SITE_URL): origin приложения https://localhost снаружи не открыть.
 */
export function publicUrl(path: string): string {
  if (IS_NATIVE_APP || typeof window === 'undefined') return `${SITE_URL}${path}`;
  return `${window.location.origin}${path}`;
}
