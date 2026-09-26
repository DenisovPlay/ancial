/**
 * Динамические маршруты в сборке приложения (статический экспорт, план А — docs/capacitor-app.md).
 *
 * Для каждого динамического маршрута экспорт собирает одну страницу-заготовку с параметром «_»
 * (`/pulse/track/_/`). Любой реальный адрес (`/pulse/track/489/`) обслуживает эта заготовка:
 *  - клиентские переходы: запросы Next за данными маршрута переписываются на заготовку
 *    (installAppRouteFetchShim), URL в адресной строке остаётся настоящим;
 *  - холодная загрузка/перезагрузка глубокой страницы: ранний скрипт в <head> переводит старт
 *    на заготовку и возвращает настоящий адрес до запуска Next (APP_ROUTE_BOOT_SCRIPT);
 *  - контент берёт параметры из адреса (useAppRouteParam / AppRouteShell), а не из params.
 *
 * Без импортов — модуль используется и в node-тестах, и в инлайн-скрипте.
 */

export const APP_ROUTE_PLACEHOLDER = '_';

export type AppRouteDefinition = {
  /** Шаблон маршрута Next: `/pulse/track/[id]`, `/messages/[[...hash]]`. */
  pattern: string;
};

/** Все динамические сегменты приложения. Необязательные catch-all обслуживает их базовая страница. */
export const APP_DYNAMIC_ROUTES: readonly AppRouteDefinition[] = [
  { pattern: '/apps/overlay/[game]' },
  { pattern: '/call/[hash]' },
  { pattern: '/call/group/[hash]' },
  { pattern: '/call/invite/[code]' },
  { pattern: '/cinema/info/[id]' },
  { pattern: '/cinema/person/[id]' },
  { pattern: '/cinema/watch/[id]' },
  { pattern: '/feed/post/[id]' },
  { pattern: '/group/[link]' },
  { pattern: '/messages/invite/[code]' },
  { pattern: '/messages/[[...hash]]' },
  { pattern: '/pay/[[...order]]' },
  { pattern: '/profile/[login]' },
  { pattern: '/pulse/artist/[id]' },
  { pattern: '/pulse/playlist/[id]' },
  { pattern: '/pulse/shelf/[key]' },
  { pattern: '/pulse/track/[id]' },
  { pattern: '/wallet/account/[id]' },
];

type Segment =
  | { kind: 'static'; value: string }
  | { kind: 'param'; name: string }
  | { kind: 'optionalCatchAll'; name: string };

function parsePattern(pattern: string): Segment[] {
  return pattern.split('/').filter(Boolean).map((part) => {
    const optional = /^\[\[\.\.\.(.+)\]\]$/.exec(part);
    if (optional) return { kind: 'optionalCatchAll', name: optional[1] };
    const param = /^\[(.+)\]$/.exec(part);
    if (param) return { kind: 'param', name: param[1] };
    return { kind: 'static', value: part };
  });
}

function splitPath(pathname: string): string[] {
  return pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export type AppRouteMatch = {
  pattern: string;
  params: Record<string, string | string[]>;
  /** Путь заготовки в экспорте (со слэшем на конце, как у trailingSlash). */
  shellPath: string;
  /** Адрес — уже сама заготовка (все параметры равны «_» или catch-all пуст). */
  isShell: boolean;
};

/** Путь заготовки для шаблона: `[id]` → «_», необязательный catch-all → базовая страница. */
export function getShellPath(pattern: string): string {
  const parts = parsePattern(pattern)
    .map((segment) => (segment.kind === 'static' ? segment.value : segment.kind === 'param' ? APP_ROUTE_PLACEHOLDER : ''))
    .filter(Boolean);
  return `/${parts.join('/')}${parts.length ? '/' : ''}`;
}

export function matchAppRoute(pathname: string, routes: readonly AppRouteDefinition[] = APP_DYNAMIC_ROUTES): AppRouteMatch | null {
  const parts = splitPath(pathname);
  for (const { pattern } of routes) {
    const segments = parsePattern(pattern);
    const params: Record<string, string | string[]> = {};
    let matched = true;
    let isShell = true;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.kind === 'optionalCatchAll') {
        // Как params у Next на сайте: сопоставитель маршрутов Next декодирует каждый сегмент.
        const rest = parts.slice(i).map(safeDecode);
        params[segment.name] = rest;
        if (rest.length > 0) isShell = false;
        break;
      }
      const part = parts[i];
      if (part === undefined) {
        matched = false;
        break;
      }
      if (segment.kind === 'static') {
        if (part !== segment.value) {
          matched = false;
          break;
        }
      } else {
        params[segment.name] = safeDecode(part);
        if (part !== APP_ROUTE_PLACEHOLDER) isShell = false;
      }
    }
    const last = segments[segments.length - 1];
    if (matched && last?.kind !== 'optionalCatchAll' && parts.length !== segments.length) matched = false;
    if (matched) return { isShell, params, pattern, shellPath: getShellPath(pattern) };
  }
  return null;
}

/**
 * Красивые и устаревшие адреса сайта, которые на сайте обслуживают rewrites/redirect-страницы.
 * В приложении они переводятся на настоящие маршруты на клиенте. null — адрес не алиас.
 */
export function resolveAppAlias(pathname: string, search = ''): string | null {
  const parts = splitPath(pathname);
  if (parts.length === 1 && parts[0].startsWith('@') && parts[0].length > 1) {
    return `/profile/${parts[0].slice(1)}/`;
  }
  // `$link` приходит и как есть, и закодированным (%24link).
  const first = parts.length === 1 ? safeDecode(parts[0]) : '';
  if (first.startsWith('$') && first.length > 1) {
    return `/group/${encodeURIComponent(first.slice(1))}/`;
  }
  if (parts.length === 3 && parts[0] === 'apps' && parts[1] === 'category') {
    return `/apps/?category=${parts[2]}`;
  }
  if (parts.length === 2 && parts[0] === 'invite') {
    return `/messages/invite/${parts[1]}/`;
  }
  if (parts.length === 1 && parts[0] === 'legal') return `/about/legal/${search}`;
  if (parts[0] === 'security') return `/settings/${parts.join('/')}/${search}`;
  return null;
}
