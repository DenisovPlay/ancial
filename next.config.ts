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

const isCapacitor = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  output: isCapacitor ? 'export' : 'standalone',
  transpilePackages: ['gradualblur'],
  images: {
    unoptimized: isCapacitor,
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
  ...(isCapacitor
    ? {}
    : {
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
              permanent: true,
            },
            {
              source: '/security',
              destination: '/settings/security',
              permanent: true,
            },
            {
              source: '/security/:path*',
              destination: '/settings/security/:path*',
              permanent: true,
            },
          ];
        },
        async rewrites() {
          return {
            afterFiles: [
              {
                source: '/$:link',
                destination: '/group/:link',
              },
              {
                source: '/@:login',
                destination: '/profile/:login',
              },
            ],
            fallback: [
              {
                source: '/api/V2/cinema/:path*',
                destination: `${CINEMA_API_BASE.replace(/\/$/, '')}/:path*`,
              },
              {
                source: '/api/:path*',
                destination: `${API_BASE}/api/:path*`,
              },
              {
                source: '/engine/:path*',
                destination: `${API_BASE}/engine/:path*`,
              },
              {
                source: '/includes/:path*',
                destination: `${API_BASE}/includes/:path*`,
              },
              {
                source: '/anui/:path*',
                destination: `${API_BASE}/anui/:path*`,
              },
              {
                source: '/apps/included/:path*',
                destination: `${API_BASE}/apps/included/:path*`,
              },
              {
                source: '/sitemap',
                destination: `${API_BASE}/sitemap.php`,
              },
              {
                source: '/sitemap.xml',
                destination: `${API_BASE}/sitemap.php`,
              },
            ],
          };
        },
      }),
};

export default nextConfig;
