'use client';

import { useEffect, type DependencyList, type RefObject } from 'react';

/**
 * IntersectionObserver-триггер подгрузки следующей страницы ленты — сама
 * настройка observer'а (rootMargin, observe/disconnect) была дословно
 * продублирована в feed/group/profile. Логика "можно ли грузить дальше" и
 * сам вызов загрузки остаются на стороне вызывающего кода — эти три ленты
 * загружают данные по-разному (топики, группа, профиль) и намеренно не
 * унифицированы. deps передаются явно, чтобы сохранить прежний момент
 * пересоздания observer'а на каждой странице.
 */
export function useLoadMoreObserver(
  sentinelRef: RefObject<HTMLElement | null>,
  onIntersect: () => void,
  deps: DependencyList,
) {
  useEffect(() => {
    const indicator = sentinelRef.current;
    if (!indicator) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) onIntersect();
      },
      { rootMargin: '0px 0px 20% 0px' },
    );

    observer.observe(indicator);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps передаются вызывающим кодом явно, он же формирует onIntersect
  }, deps);
}
