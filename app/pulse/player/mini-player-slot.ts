'use client';

import { useSyncExternalStore } from 'react';

// Место, куда страница может «забрать» мини-плеер (шапка чата). Внешний стор, а не контекст:
// регистрация слота не перерисовывает всех потребителей PulsePlayerContext.
let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

/** Callback-ref для контейнера слота: React передаёт элемент при монтировании и null при размонтировании. */
export function setMiniPlayerSlot(element: HTMLElement | null) {
  if (slot === element) return;
  slot = element;
  listeners.forEach((listener) => listener());
}

export function useMiniPlayerSlot() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => slot,
    () => null,
  );
}
