/**
 * Общая логика прелоадера картинок: AppImage (React) и картинки внутри HTML-строк
 * (посты, комментарии, стикеры в сообщениях). Стили — .img-* в globals.css.
 */

import { getOriginalImageSrc } from './optimized-image-src';

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

/**
 * Перелив скелетона — анимация фона на главном потоке, и браузер крутит её даже у картинок за экраном
 * (ленивые картинки длинного списка вне экрана не грузятся и «переливаются» бесконечно: сотни анимаций
 * = постоянная нагрузка на CPU). Один общий IntersectionObserver ставит невидимым скелетонам
 * data-img-offscreen → animation-play-state: paused (globals.css). На экране — перелив как был.
 */
const OFFSCREEN_ATTR = 'data-img-offscreen';
/** Одновременно переливаются не больше стольких скелетонов на экране, остальные стоят (на экране их много только при медленной сети). */
const MAX_ANIMATED_SKELETONS = 24;
const visibleSkeletons = new Set<Element>();
let skeletonObserver: IntersectionObserver | null = null;

function getSkeletonObserver(): IntersectionObserver | null {
  if (skeletonObserver || typeof IntersectionObserver === 'undefined') return skeletonObserver;
  skeletonObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleSkeletons.add(entry.target);
      else {
        visibleSkeletons.delete(entry.target);
        entry.target.toggleAttribute(OFFSCREEN_ATTR, true);
      }
    }
    let animated = 0;
    for (const img of visibleSkeletons) img.toggleAttribute(OFFSCREEN_ATTR, ++animated > MAX_ANIMATED_SKELETONS);
  });
  return skeletonObserver;
}

/** Начать следить за скелетоном картинки (пока она грузится). */
export function watchImageSkeleton(img: Element): void {
  getSkeletonObserver()?.observe(img);
}

/** Перестать следить: картинка загрузилась или ушла из DOM (иначе наблюдатель держит узел в памяти). */
export function unwatchImageSkeleton(img: Element): void {
  skeletonObserver?.unobserve(img);
  visibleSkeletons.delete(img);
  img.removeAttribute(OFFSCREEN_ATTR);
}

/**
 * Сбросить запрос недогруженной картинки: без этого браузер дотягивает её, даже если страница уже закрыта
 * (ушли из чата в друзья, а запросы картинок сообщений ещё занимают соединения). srcset снимаем первым —
 * иначе он перебивает подмену src.
 */
export function abortImageLoad(img: HTMLImageElement): void {
  if (img.complete) return;
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  img.src = TRANSPARENT_PIXEL;
}

/**
 * Для React-картинки при размонтировании: проверяем позже, что узел действительно ушёл из документа
 * (в StrictMode/смене ref cleanup вызывается и у живой картинки — её трогать нельзя).
 */
export function abortImageLoadIfDetached(img: HTMLImageElement): void {
  setTimeout(() => {
    if (!img.isConnected) abortImageLoad(img);
  }, 0);
}

function settleHtmlImage(img: HTMLImageElement, ok: boolean): void {
  if (img.src === TRANSPARENT_PIXEL) return; // уже показана ошибка
  // Оптимизатор не ответил (хост недоступен серверу и т.п.) — пробуем оригинал, скелетон остаётся.
  if (!ok) {
    const original = getOriginalImageSrc(img.src);
    if (original !== img.src) {
      img.src = original;
      return;
    }
  }
  img.classList.remove('img-skeleton', 'img-loading');
  unwatchImageSkeleton(img);
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

  // Картинки HTML-строк появляются через innerHTML — подхватываем их скелетоны по мутациям DOM.
  const htmlSkeletonSelector = `img[${HTML_IMAGE_ATTR}].img-skeleton`;
  const eachHtmlSkeleton = (node: Node, callback: (img: Element) => void) => {
    if (!(node instanceof Element)) return;
    if (node.matches(htmlSkeletonSelector)) callback(node);
    else if (node.firstElementChild) node.querySelectorAll(htmlSkeletonSelector).forEach(callback);
  };
  if (typeof MutationObserver !== 'undefined' && typeof IntersectionObserver !== 'undefined') {
    new MutationObserver((records) => {
      for (const record of records) {
        record.removedNodes.forEach((node) => eachHtmlSkeleton(node, (img) => {
          unwatchImageSkeleton(img);
          // Ушла из документа (а не переехала в другое место) и ещё грузится — сбрасываем запрос.
          if (!img.isConnected && img instanceof HTMLImageElement) abortImageLoad(img);
        }));
        record.addedNodes.forEach((node) => eachHtmlSkeleton(node, watchImageSkeleton));
      }
    }).observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll(htmlSkeletonSelector).forEach(watchImageSkeleton);
  }

  // Картинки, успевшие загрузиться до установки слушателя (кэш, SSR-разметка).
  document.querySelectorAll<HTMLImageElement>(`img[${HTML_IMAGE_ATTR}]`).forEach((img) => {
    if (!img.complete) return;
    img.decode().then(() => settleHtmlImage(img, true), () => settleHtmlImage(img, false));
  });
}
