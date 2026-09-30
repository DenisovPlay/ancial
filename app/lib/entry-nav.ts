import { createEntryStore } from './entry-store.ts';

/**
 * Запись истории браузера как носитель состояния страницы. Ключ записи — `navigation.currentEntry.key`
 * (Navigation API: не меняется при replace и переживает перезагрузку); без него — адрес страницы.
 * Отличаем «Назад/Вперёд» от обычного перехода: только при них состояние восстанавливается.
 */

export type NavType = 'traverse' | 'push' | 'replace' | 'reload';

export interface EntryChange {
  key: string;
  prevKey: string;
  type: NavType;
}

interface NavigationLike {
  addEventListener(type: string, listener: (event: Event & { navigationType?: string | null }) => void): void;
  currentEntry?: { key: string } | null;
}

const listeners = new Set<(change: EntryChange) => void>();
const leaveListeners = new Set<(key: string) => void>();
let store: ReturnType<typeof createEntryStore> | null = null;
let started = false;
let currentKey = '';
let lastType: NavType = 'push';
let lastUrl = '';

function getNavigation(): NavigationLike | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { navigation?: NavigationLike }).navigation;
  return candidate && typeof candidate.addEventListener === 'function' ? candidate : null;
}

function readUrl() {
  return `${location.pathname}${location.search}`;
}

function readKey() {
  return getNavigation()?.currentEntry?.key ?? readUrl();
}

function getStore() {
  if (!store) {
    let storage: Storage | null = null;
    try {
      storage = typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
      storage = null;
    }
    store = createEntryStore(storage);
  }
  return store;
}

function toNavType(value: string | null | undefined): NavType {
  return value === 'traverse' || value === 'replace' || value === 'reload' ? value : 'push';
}

function emitChange(prevKey: string) {
  const change: EntryChange = { key: currentKey, prevKey, type: lastType };
  listeners.forEach((listener) => {
    try {
      listener(change);
    } catch (error) {
      console.error('[entry-nav] listener failed', error);
    }
  });
}

/** Запускает слежение за историей (один раз на вкладку). */
export function initEntryNav() {
  if (started || typeof window === 'undefined') return;
  started = true;
  currentKey = readKey();
  lastUrl = readUrl();

  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navEntry?.type === 'reload') lastType = 'reload';
  else if (navEntry?.type === 'back_forward') lastType = 'traverse';

  try {
    // Своё восстановление точнее: страницы догружаются асинхронно, браузер к этому моменту уже промахивается.
    history.scrollRestoration = 'manual';
  } catch {
    // Не поддерживается — остаётся поведение по умолчанию.
  }

  const flush = () => getStore().flush();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  const navigation = getNavigation();
  if (navigation) {
    navigation.addEventListener('navigate', () => {
      leaveListeners.forEach((listener) => listener(currentKey));
      flush();
    });
    navigation.addEventListener('currententrychange', (event) => {
      const key = readKey();
      const url = readUrl();
      if (key === currentKey) {
        // replace на месте: помечаем, только если он реально сменил страницу (а не служебная правка state).
        if (toNavType(event.navigationType) === 'replace' && url !== lastUrl) lastType = 'replace';
        lastUrl = url;
        return;
      }
      const prevKey = currentKey;
      currentKey = key;
      lastUrl = url;
      lastType = toNavType(event.navigationType);
      emitChange(prevKey);
    });
    return;
  }

  // Без Navigation API: ключ — адрес, «Назад/Вперёд» — по popstate, переходы — по обёртке history.
  window.addEventListener('popstate', () => {
    leaveListeners.forEach((listener) => listener(currentKey));
    const prevKey = currentKey;
    currentKey = readKey();
    lastUrl = readUrl();
    lastType = 'traverse';
    emitChange(prevKey);
  });
  (['pushState', 'replaceState'] as const).forEach((method) => {
    const original = history[method].bind(history);
    history[method] = (data: unknown, unused: string, url?: string | URL | null) => {
      if (method === 'pushState') leaveListeners.forEach((listener) => listener(currentKey));
      original(data, unused, url);
      const prevKey = currentKey;
      currentKey = readKey();
      lastUrl = readUrl();
      lastType = method === 'pushState' ? 'push' : 'replace';
      if (method === 'pushState' || prevKey !== currentKey) emitChange(prevKey);
    };
  });
}

export function getEntryKey() {
  return started ? currentKey : typeof window === 'undefined' ? '' : readKey();
}

/** Запись стала текущей через «Назад/Вперёд» или перезагрузку: состояние нужно вернуть, а не сбросить. */
export function isRestoreNavigation() {
  return lastType === 'traverse' || lastType === 'reload';
}

export function subscribeEntryChange(listener: (change: EntryChange) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Вызывается перед уходом с записи (до смены страницы) — успеть снять позицию прокрутки. */
export function onLeaveEntry(listener: (key: string) => void) {
  leaveListeners.add(listener);
  return () => {
    leaveListeners.delete(listener);
  };
}

export function readEntryState<T>(ns: string, key = getEntryKey()): T | undefined {
  return getStore().read<T>(ns, key);
}

export function writeEntryState(ns: string, value: unknown, key = getEntryKey()) {
  getStore().write(ns, key, value);
}

export function clearEntryState(ns: string, key = getEntryKey()) {
  getStore().clear(ns, key);
}

export function flushEntryState() {
  getStore().flush();
}

/** Убирает пространство имён (например, черновики) из всех записей истории. */
export function clearEntryNamespace(ns: string) {
  getStore().clearNamespace(ns);
}

/** Очистка кэша в настройках: убирает всё сохранённое по записям истории. */
export function clearAllEntryState() {
  getStore().clearAll();
}
