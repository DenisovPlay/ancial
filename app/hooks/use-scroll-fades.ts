'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Градиенты по краям горизонтальной ленты (как у табов ленты и уведомлений): левый виден, когда есть что прокручивать влево,
 * правый — вправо. Возвращает ref'ы для двух накладок; `watch` — значение, при смене которого края пересчитываются.
 */
export function useScrollFades(scrollRef: RefObject<HTMLDivElement | null>, watch?: unknown) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const update = () => {
      if (leftRef.current) leftRef.current.style.opacity = el.scrollLeft > 4 ? '1' : '0';
      if (rightRef.current) rightRef.current.style.opacity = el.scrollLeft + el.clientWidth < el.scrollWidth - 4 ? '1' : '0';
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [scrollRef, watch]);

  return { leftRef, rightRef };
}
