import { SITE_DOMAIN } from '../config';
import { isPrivateMediaSrc, matchImageHost, type ImageHost } from './image-host-match';

/**
 * Хосты, с которых next/image может оптимизировать картинки. Единый список:
 * next.config.ts строит из него images.remotePatterns, AppImage — решает, оптимизировать ли src.
 * insecure: true — дополнительно разрешает http (легаси-контент старого бэкенда).
 */
export const IMAGE_HOSTS: ImageHost[] = [
  // С сервера фронта ibb.co не отвечает (curl/fetch — таймаут, 2026-09-23), браузеры пользователей — грузят.
  { hostname: 'ibb.co', insecure: true, optimize: false },
  { hostname: '*.ibb.co', insecure: true, optimize: false },
  { hostname: 'imgur.com' },
  { hostname: '*.imgur.com' },
  { hostname: '*.scdn.co' },
  { hostname: 'ancial.ru', insecure: true },
  { hostname: '*.ancial.ru', insecure: true },
  { hostname: SITE_DOMAIN, insecure: true },
  // Эмодзи и стикеры сторонних CDN (BetterTTV, 7TV) — анимированные GIF/WebP:
  // sharp в next/image тратит лишний CPU сервера и ломает кадры. Клиент грузит напрямую.
  { hostname: 'cdn.betterttv.net', optimize: false },
  { hostname: 'cdn.7tv.app', optimize: false },
  { hostname: '*.userapi.com' },
  { hostname: '*.vk.com' },
  { hostname: '*.vkusercontent.com' },
  { hostname: '*.vk-cdn.net' },
  { hostname: 'avatars.yandex.net' },
  { hostname: '*.avatars.yandex.net' },
  { hostname: 'tile.openstreetmap.org' },
  { hostname: 'cartodb-basemaps-a.global.ssl.fastly.net' },
  { hostname: 'tile.openweathermap.org' },
  { hostname: 'yastatic.net' },
  { hostname: '*.yastatic.net' },
];

/** Картинку можно пропустить через оптимизатор; иначе next/image рендерит её как есть (unoptimized). */
export function canOptimizeImage(src: string): boolean {
  return !isPrivateMediaSrc(src) && matchImageHost(src, IMAGE_HOSTS);
}
