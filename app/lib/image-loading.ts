/**
 * Общая логика прелоадера картинок: AppImage (React) и картинки внутри HTML-строк
 * (посты, комментарии, стикеры в сообщениях). Стили — .img-* в globals.css.
 */

/** Прозрачный пиксель: подменяет битую картинку, чтобы не было «сломанной» иконки браузера. */
export const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** Маркер картинок в HTML-строках, которыми управляет прелоадер (ставит sanitizeUserHtml). */
export const HTML_IMAGE_ATTR = 'data-zimg';

const SLOW_LOAD_MS = 150;

/** SVG (файл или data:) рисуется мгновенно и векторно — прелоадер ему не нужен. */
export function isSvgSrc(src: string | null | undefined): boolean {
  const value = String(src ?? '').trim().toLowerCase();
  return value.startsWith('data:image/svg+xml') || /\.svg(?:[?#]|$)/.test(value);
}

if (typeof performance !== 'undefined' && typeof performance.setResourceTimingBufferSize === 'function') {
  // ponytail: буфер Resource Timing по умолчанию 250 записей — в длинной ленте он кончается,
  // и новые картинки просто показываются без проявления. 1500 хватает на сессию; дальше то же поведение.
  performance.setResourceTimingBufferSize(1500);
}

/**
 * true — картинка реально ехала по сети дольше SLOW_LOAD_MS, её стоит плавно проявить.
 * Кэш (память, SW, диск) → false: показываем сразу, без искусственной анимации.
 */
export function wasSlowNetworkLoad(url: string): boolean {
  if (typeof performance === 'undefined' || !url || url.startsWith('data:') || url.startsWith('blob:')) return false;
  const entries = performance.getEntriesByName(url, 'resource');
  const entry = entries[entries.length - 1] as PerformanceResourceTiming | undefined;
  // Картинка из памяти новой записи не создаёт.
  if (!entry) return false;
  // Запись от старой загрузки (сейчас картинка взята из памяти) — не считается.
  if (performance.now() - entry.responseEnd > 1000) return false;
  return entry.duration > SLOW_LOAD_MS;
}

function settleHtmlImage(img: HTMLImageElement, ok: boolean): void {
  if (img.src === TRANSPARENT_PIXEL) return; // уже показана ошибка
  img.classList.remove('img-skeleton', 'img-loading');
  if (!ok) {
    img.classList.add('img-error');
    img.src = TRANSPARENT_PIXEL;
    return;
  }
  if (wasSlowNetworkLoad(img.currentSrc)) img.classList.add('img-reveal');
}

let installed = false;

/**
 * Один capture-слушатель load/error на document — только для картинок с HTML_IMAGE_ATTR
 * (в HTML-строку React-компонент не вставить). По образцу carousel-delegation.ts.
 */
export function ensureHtmlImageLoading(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const onEvent = (event: Event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute(HTML_IMAGE_ATTR)) return;
    settleHtmlImage(img, event.type === 'load');
  };
  document.addEventListener('load', onEvent, true);
  document.addEventListener('error', onEvent, true);

  // Картинки, успевшие загрузиться до установки слушателя (кэш, SSR-разметка).
  document.querySelectorAll<HTMLImageElement>(`img[${HTML_IMAGE_ATTR}]`).forEach((img) => {
    if (!img.complete) return;
    img.decode().then(() => settleHtmlImage(img, true), () => settleHtmlImage(img, false));
  });
}
