import { APP_ROUTE_PLACEHOLDER } from './app-routes';
import { IS_NATIVE_APP } from './platform';

type ShellParams = Record<string, string | string[]>;

/**
 * generateStaticParams для сборки приложения: одна страница-заготовка на динамический маршрут
 * (`[id]` → «_», необязательный catch-all → пустой, т.е. базовая страница).
 * На сайте — undefined: маршруты остаются динамическими, как были.
 *
 * Использование в page.tsx:
 *   export const generateStaticParams = appShellStaticParams({ id: 'param' });
 */
export function appShellStaticParams(shape: Record<string, 'param' | 'optionalCatchAll'>): (() => ShellParams[]) | undefined {
  if (!IS_NATIVE_APP) return undefined;
  const params: ShellParams = {};
  for (const [name, kind] of Object.entries(shape)) {
    params[name] = kind === 'param' ? APP_ROUTE_PLACEHOLDER : [];
  }
  return () => [params];
}
