import type { NextConfig } from "next";

import { API_BASE, CINEMA_API_BASE, SITE_DOMAIN } from './app/config';

// Хосты, с которых next/image может оптимизировать картинки.
// insecure: true — дополнительно разрешает http (легаси-контент старого бэкенда).
const IMAGE_HOSTS: { hostname: string; insecure?: boolean }[] = [
  { hostname: 'ibb.co', insecure: true },
  { hostname: '*.ibb.co', insecure: true },
  { hostname: 'imgur.com' },
  { hostname: '*.imgur.com' },
  { hostname: '*.scdn.co' },
  { hostname: 'ancial.ru', insecure: true },
  { hostname: '*.ancial.ru', insecure: true },
  { hostname: SITE_DOMAIN, insecure: true },
  { hostname: `*.${SITE_DOMAIN}`, insecure: true },
  { hostname: 'cdn.betterttv.net' },
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

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['gradualblur'],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: IMAGE_HOSTS.flatMap(({ hostname, insecure }) =>
      (insecure ? (['https', 'http'] as const) : (['https'] as const)).map((protocol) => ({
        protocol,
        hostname,
        pathname: '**',
      })),
    ),
  },
  async headers() {
    return [
      {
        // HTML нельзя кэшировать промежуточным прокси (nginx/aapanel):
        // иначе после деплоя отдаётся старая разметка со ссылками на уже
        // несуществующие чанки /_next/static (404 на /settings и др.).
        // Хэшированные ассеты Next при этом остаются immutable — их это правило не трогает.
        source: '/:path*',
        has: [{ type: 'header', key: 'accept', value: '.*text/html.*' }],
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        // То же для RSC-payload'ов клиентской навигации (заголовок RSC: 1) —
        // иначе прокси закэширует их и SPA-переходы будут тянуть старый билд
        source: '/:path*',
        has: [{ type: 'header', key: 'rsc' }],
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/legal',
        destination: '/about/legal',
        permanent: true, // or false if it's temporary
      },
    ];
  },
  async rewrites() {
    return {
      afterFiles: [
        { // Proxy for group links
          source: '/$:link',
          destination: '/group/:link',
        },
        { // Proxy for profile links
          source: '/@:login',
          destination: '/profile/:login',
        },
      ],
      fallback: [
        { // Proxy for Cinema API requests
          source: '/api/V2/cinema/:path*',
          destination: `${CINEMA_API_BASE.replace(/\/$/, '')}/:path*`,
        },
        { // Proxy for API requests only when there is no local route handler
          source: '/api/:path*',
          destination: `${API_BASE}/api/:path*`,
        },
        { // Proxy for legacy engine endpoints still used by settings flows
          source: '/engine/:path*',
          destination: `${API_BASE}/engine/:path*`,
        },
        { // Proxy for static assets like images, CSS, etc. that are served from the API server
          source: '/includes/:path*',
          destination: `${API_BASE}/includes/:path*`,
        },

        { // Proxy for legacy in-site apps (Pixel Battle, bingo и т.д.)
          source: '/anui/:path*',
          destination: `${API_BASE}/anui/:path*`,
        },
        { // Proxy for weather app and other included legacy apps
          source: '/apps/included/:path*',
          destination: `${API_BASE}/apps/included/:path*`,
        },
        { // Proxy for sitemap
          source: '/sitemap',
          destination: `${API_BASE}/sitemap.php`,
        },
        { // Proxy for sitemap.xml
          source: '/sitemap.xml',
          destination: `${API_BASE}/sitemap.php`,
        },
      ],
    };
  },
};

export default nextConfig;
