/**
 * Можно ли отдать картинку через оптимизатор next/image (белый список хостов).
 * Правила как у images.remotePatterns: `*.host` — ровно один уровень поддомена, https всегда,
 * http — только для хостов с insecure. Без импортов — чтобы тестироваться в node.
 */

/**
 * optimize: false — хост есть в контенте, но сервер Next до него не достаёт (блокировка/таймаут):
 * оптимизатор отдал бы 504, поэтому такие картинки браузер грузит напрямую.
 */
export type ImageHost = { hostname: string; insecure?: boolean; optimize?: false };

export function matchImageHost(src: string, hosts: readonly ImageHost[]): boolean {
  const value = src.trim();
  if (!value || value.startsWith('data:') || value.startsWith('blob:')) return false;

  let url: URL;
  try {
    // Локальные пути (/image.php?…, /img/…) проверяем тем же разбором, что и внешние.
    url = new URL(value.startsWith('//') ? `https:${value}` : value, 'https://local.invalid');
  } catch {
    return false;
  }
  const path = url.pathname.toLowerCase();
  // SVG и GIF оптимизатору не нужны: вектор отдаётся как есть, GIF в sharp ресурсоёмок и ломает кадры анимации.
  if (path.endsWith('.svg') || path.endsWith('.gif')) return false;
  // Нативные стикеры — уже готовые легковесные ассеты (анимированный AVIF/WebP), sharp не поддерживает animated AVIF.
  if (path.startsWith('/img/stickers/')) return false;
  if (url.hostname === 'local.invalid') return value.startsWith('/') && !value.startsWith('//');

  return hosts.some(({ hostname, insecure, optimize }) => {
    if (optimize === false) return false;
    if (url.protocol !== 'https:' && !(insecure && url.protocol === 'http:')) return false;
    if (!hostname.startsWith('*.')) return url.hostname === hostname;
    const base = hostname.slice(2);
    if (!url.hostname.endsWith(`.${base}`)) return false;
    return !url.hostname.slice(0, -(base.length + 1)).includes('.');
  });
}

/**
 * Приватные медиа (вложения чатов) отдаются только с сессией пользователя: /api/V2/media/Image.php?id=…
 * и легаси /image.php?id=…. Оптимизатор next/image ходит на бэкенд с сервера, без куки, — получит 403.
 * Такие картинки браузер грузит сам (unoptimized) — заодно они не оседают в общем кэше оптимизатора.
 */
export function isPrivateMediaSrc(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src.trim(), 'https://local.invalid');
  } catch {
    return false;
  }
  const path = url.pathname.toLowerCase();
  return path.startsWith('/api/') || (path.endsWith('/image.php') && url.searchParams.has('id'));
}
