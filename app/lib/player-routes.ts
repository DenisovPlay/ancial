/** Разделы, где Pulse-плеер не монтируется вовсе: устройство, Media Session и аудио здесь не нужны. */
const PLAYER_DISABLED_PREFIXES = ['/cinema'];

export function isPlayerDisabledPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PLAYER_DISABLED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
