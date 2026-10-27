'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { useAppearanceMotion } from './use-appearance';

/** Сколько нужно проехать вниз, чтобы панели уехали, и вверх — чтобы вернулись (px). */
const HIDE_AFTER = 28;
const SHOW_AFTER = 14;
/** Прокрутки короче этого и мелкие области (карусели, списки в модалках) жест не считают. */
const MIN_SCROLLABLE = 80;
const MIN_HEIGHT = 200;

/**
 * Опция «Прятать панели при прокрутке» (Интерфейс → Анимации, только телефон): по направлению прокрутки любой
 * достаточно большой области ставит/снимает `data-bars-hidden` на <html>. Саму анимацию рисует CSS
 * (панель навигации и мини-плеер уезжают вниз и возвращаются на место).
 */
export function useScrollHideBars() {
  const { scrollHide } = useAppearanceMotion();
  const pathname = usePathname();

  // Новая страница — панели на месте.
  useEffect(() => {
    document.documentElement.removeAttribute('data-bars-hidden');
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (!scrollHide) {
      root.removeAttribute('data-bars-hidden');
      return;
    }
    const phone = window.matchMedia('(max-width: 1023px)');
    const lastTop = new WeakMap<Element, number>();
    let travel = 0;

    const onScroll = (event: Event) => {
      if (!phone.matches) return;
      const target = event.target;
      const element = target === document ? document.scrollingElement : target;
      if (!(element instanceof Element)) return;
      if (element.clientHeight < MIN_HEIGHT || element.scrollHeight - element.clientHeight < MIN_SCROLLABLE) return;
      const top = element.scrollTop;
      const delta = top - (lastTop.get(element) ?? top);
      lastTop.set(element, top);
      if (delta === 0) return;
      // Резинка iOS за краем (отрицательный scrollTop) и самый верх страницы — всегда показываем панели.
      if (top <= 24) {
        travel = 0;
        root.removeAttribute('data-bars-hidden');
        return;
      }
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (travel > HIDE_AFTER) root.setAttribute('data-bars-hidden', '');
      else if (travel < -SHOW_AFTER) root.removeAttribute('data-bars-hidden');
    };

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      root.removeAttribute('data-bars-hidden');
    };
  }, [scrollHide]);
}
