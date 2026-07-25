import type { NextConfig } from "next";

// Disable TLS validation errors in local development for the misconfigured ancial-backend.ru.zeniflow.ru SSL certificate
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { API_BASE } from './app/config';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['gradualblur'],
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.ibb.co',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'i.ibb.co',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '*.ibb.co',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'imgur.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.imgur.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.scdn.co',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'ancial.ru',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.ancial.ru',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'ancial.ru',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '*.ancial.ru',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'zypo.cc',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.zypo.cc',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'zypo.cc',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '*.zypo.cc',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.betterttv.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.userapi.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.vk.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.vkusercontent.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.vk-cdn.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.avatars.yandex.net',
        pathname: '**',
      },
    ],
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
        { // Proxy for legacy redirect handler
          source: '/redirect',
          destination: `${API_BASE}/redirect`,
        },
        { // Proxy for weather app and other included legacy apps
          source: '/apps/included/:path*',
          destination: `${API_BASE}/apps/included/:path*`,
        },
        { // Proxy for payments
          source: '/pay/:path*',
          destination: `${API_BASE}/pay/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
