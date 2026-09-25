/**
 * Картинки внутри HTML-строк (карусели и коллажи постов) не проходят через next/image, и браузер
 * держал в памяти многомегапиксельные оригиналы. Здесь — URL того же оптимизатора с шириной под
 * раскладку. Без импортов — чтобы тестироваться в node.
 */

const OPTIMIZER_PATH = '/_next/image';
/** Качество по умолчанию next/image (images.qualities в Next 16 — только 75). */
const OPTIMIZER_QUALITY = 75;

/** Сервер экранирует контент постов (htmlspecialchars) — URL из разметки приходят с &amp; и т.п. */
export function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Значение для атрибута src (уже экранированное для HTML). width — одна из ширин next/image
 * (deviceSizes: 640, 750, 828, 1080, 1200, 1920, 2048, 3840).
 */
export function buildOptimizedImageSrc(url: string, width: number): string {
  return `${OPTIMIZER_PATH}?url=${encodeURIComponent(url)}&amp;w=${width}&amp;q=${OPTIMIZER_QUALITY}`;
}

/** Оригинал картинки: для просмотрщика в полном размере и как запасной вариант, если оптимизатор не ответил. */
export function getOriginalImageSrc(src: string): string {
  if (!src || !src.includes(OPTIMIZER_PATH)) return src;
  try {
    const url = new URL(src, 'https://local.invalid');
    if (url.pathname !== OPTIMIZER_PATH) return src;
    return url.searchParams.get('url') || src;
  } catch {
    return src;
  }
}
