import { SITE_URL } from '../config';
import { toBackendUrl, isBackendPath } from './api-url';
import { canOptimizeImage } from './image-hosts';

/**
 * Загрузчик next/image для сборки приложения (images.loader: 'custom' в next.config.ts).
 * На сайте не используется — там стандартный оптимизатор Next.
 *
 *  - /img/…, /icons.svg и прочее из бандла — как есть (файл внутри APK);
 *  - пути бэкенда (/image.php, /includes/…) — на API_BASE напрямую;
 *  - внешние хосты, которые берёт оптимизатор сайта, — через https://zypo.cc/_next/image
 *    с шириной под раскладку: слабому телефону не нужны многомегапиксельные оригиналы;
 *  - остальное (ibb.co, GIF, стикеры CDN) — как есть.
 */
export default function appImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (isBackendPath(src)) return toBackendUrl(src);
  if (src.startsWith('/')) return src;
  if (canOptimizeImage(src)) {
    return `${SITE_URL}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
  }
  return src;
}
