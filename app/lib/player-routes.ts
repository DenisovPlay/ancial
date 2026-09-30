/** Разделы, где Pulse-плеер не монтируется вовсе: устройство, Media Session и аудио здесь не нужны (кино, переходы по внешним ссылкам, оплата). */
const PLAYER_DISABLED_PREFIXES = ['/cinema', '/redirect', '/pay'];

export function isPlayerDisabledPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PLAYER_DISABLED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Разделы, где плеер только «приостановлен»: не показывается и молчит, но остаётся смонтированным,
 * чтобы после выхода (из звонка) вернуться с тем же треком и очередью — на паузе.
 */
const PLAYER_SUSPENDED_PREFIXES = ['/call'];

export function isPlayerSuspendedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PLAYER_SUSPENDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
