'use client';

import { cloneElement, isValidElement, useEffect, useSyncExternalStore, type ReactElement, type ReactNode } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';

import { APP_ROUTE_PLACEHOLDER, matchAppRoute, resolveAppAlias } from '../lib/app-routes';
import { IS_NATIVE_APP } from '../lib/platform';

const subscribeNever = () => () => {};
const getClientReady = () => true;
const getServerReady = () => false;

/** Параметры маршрута из настоящего адреса (в приложении страница — общая заготовка «_»). */
function readParams(pathname: string) {
  const resolved = resolveAppAlias(pathname) ?? pathname;
  return matchAppRoute(resolved)?.params ?? null;
}

/**
 * Параметр динамического маршрута. Сайт: значение из params (serverValue) как есть.
 * Приложение: из адреса; до гидрации — null (разметка заготовки собрана с «_»).
 */
export function useAppRouteParam(name: string, serverValue: string | string[] | undefined): string | string[] | null {
  const pathname = usePathname();
  const ready = useSyncExternalStore(subscribeNever, getClientReady, getServerReady);
  if (!IS_NATIVE_APP) return serverValue ?? null;
  if (!ready) return null;
  const value = readParams(pathname ?? '')?.[name];
  if (value === undefined || value === APP_ROUTE_PLACEHOLDER) return null;
  return value;
}

/**
 * Обёртка контента динамической страницы в сборке приложения: подставляет в проп `prop`
 * настоящее значение параметра `param` из адреса и пересоздаёт контент при его смене (как сайт,
 * где другой id — это другая страница). Пока адрес не прочитан (гидрация заготовки) — ничего.
 */
export function AppRouteShell({
  children,
  param,
  prop,
  transform,
}: {
  children: ReactNode;
  param: string;
  prop: string;
  transform?: 'decode' | 'int';
}) {
  const value = useAppRouteParam(param, undefined);
  if (value === null || !isValidElement(children)) return null;
  const raw = Array.isArray(value) ? value.join('/') : value;
  let next: string | number = raw;
  if (transform === 'int') next = Number.parseInt(raw, 10);
  if (transform === 'decode') {
    try {
      next = decodeURIComponent(raw);
    } catch {
      next = raw;
    }
  }
  return cloneElement(children as ReactElement<Record<string, unknown>>, { key: raw, [prop]: next });
}

/**
 * Замена useParams() для клиентских страниц: в приложении — параметры из настоящего адреса
 * (Next видит заготовку «_»). Используется под AppRouteGate, который ждёт гидрации.
 */
export function useAppParams<T extends Record<string, string | string[] | undefined>>(): Partial<T> {
  const nextParams = useParams<T>();
  const pathname = usePathname();
  const ready = useSyncExternalStore(subscribeNever, getClientReady, getServerReady);
  if (!IS_NATIVE_APP) return nextParams ?? {};
  if (!ready) return {};
  const params = readParams(pathname ?? '') ?? {};
  const result: Record<string, string | string[] | undefined> = {};
  // Как useParams() у Next на клиенте: значения из дерева маршрута закодированы (encodeURIComponent),
  // в отличие от декодированных params страницы на сервере.
  for (const [key, value] of Object.entries(params)) {
    if (value === APP_ROUTE_PLACEHOLDER) continue;
    result[key] = Array.isArray(value) ? value.map((item) => encodeURIComponent(item)) : encodeURIComponent(value);
  }
  return result as Partial<T>;
}

/** Приложение: не рендерить клиентскую страницу, пока не прочитан настоящий адрес (иначе эффекты увидят «_»). */
export function AppRouteGate({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribeNever, getClientReady, getServerReady);
  if (!IS_NATIVE_APP) return children;
  return ready ? children : null;
}

/**
 * Приложение: страница-редирект сайта (`/apps/category/x`, `/invite/x`) — на сайте её делает сервер,
 * здесь переводим на настоящий адрес на клиенте (resolveAppAlias).
 */
export function AppAliasRedirect() {
  const router = useRouter();
  useEffect(() => {
    const target = resolveAppAlias(window.location.pathname, window.location.search);
    router.replace(target ?? '/');
  }, [router]);
  return null;
}
