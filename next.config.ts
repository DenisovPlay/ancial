import type { NextConfig } from "next";

import { API_BASE, CINEMA_API_BASE } from './app/config';
import { IMAGE_HOSTS } from './app/lib/image-hosts';


const nextConfig: NextConfig = {
  output: 'standalone',
  // Дев-сервер по умолчанию отдаёт свои ресурсы (HMR и прочее) только своему хосту.
  // Разрешаем локальную сеть, чтобы открывать сборку с телефона и второго компьютера.
  allowedDevOrigins: ['192.168.1.18', '192.168.1.*', '*.local'],
  transpilePackages: ['gradualblur'],
  images: {
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    dangerouslyAllowLocalIP: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: IMAGE_HOSTS.filter(({ optimize }) => optimize !== false).flatMap(({ hostname, insecure }) =>
      (insecure ? (['https', 'http'] as const) : (['https'] as const)).map((protocol) => ({
        protocol,
        hostname,
        pathname: '/**',
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
        { // Proxy for image.php
          source: '/image.php',
          destination: `${API_BASE}/image.php`,
        },
        { // Proxy for track.php
          source: '/track.php',
          destination: `${API_BASE}/track.php`,
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
