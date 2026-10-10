'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import { subscribeEntryChange } from './entry-nav';
import { IS_NATIVE_APP } from './platform';

const EVENTS = ['popstate', 'pageshow', 'focus'] as const;

function subscribe(onChange: () => void) {
  EVENTS.forEach((name) => window.addEventListener(name, onChange));
  document.addEventListener('visibilitychange', onChange);
  const off = subscribeEntryChange(onChange);
  return () => {
    EVENTS.forEach((name) => window.removeEventListener(name, onChange));
    document.removeEventListener('visibilitychange', onChange);
    off();
  };
}

const readLocation = () => window.location.pathname;

/**
 * Путь для навигации. На сайте — `usePathname()`. В приложении после перезапуска/«пробуждения»
 * роутер Next может держать путь заготовки или прошлой страницы, поэтому берём настоящий адрес окна.
 */
export function useLivePathname(): string | null {
  const routerPath = usePathname();
  const live = useSyncExternalStore(IS_NATIVE_APP ? subscribe : subscribeNone, IS_NATIVE_APP ? readLocation : () => null, () => null);
  return live ?? routerPath;
}

const subscribeNone = () => () => {};
