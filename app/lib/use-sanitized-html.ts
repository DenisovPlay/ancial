import { useMemo } from 'react';

import { sanitizeUserHtml } from './sanitize-html';

/**
 * Готовый объект для dangerouslySetInnerHTML, стабильный между рендерами.
 *
 * React 19 сравнивает dangerouslySetInnerHTML по ссылке на объект, а не по строке: новый
 * `{ __html }` на каждый рендер — это заново записанный innerHTML. Картинки внутри пересоздаются
 * (скелетон, перезапуск GIF/AVIF-анимаций), сбиваются прокрутка каруселей и выделение текста.
 * Здесь объект (и прогон DOMPurify) меняются только вместе с самой разметкой.
 */
export function useSanitizedHtml(html: string, preloadImages = false): { __html: string } {
  return useMemo(() => ({ __html: sanitizeUserHtml(html, { preloadImages }) }), [html, preloadImages]);
}
