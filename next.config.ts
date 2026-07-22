import type { NextConfig } from "next";

// Disable TLS validation errors in local development for the misconfigured api.ancial.ru SSL certificate
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.ancial.ru';

const nextConfig: NextConfig = {
  transpilePackages: ['gradualblur'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'ancial.ru',
      },
      {
        protocol: 'https',
        hostname: '*.ancial.ru',
      },
      {
        protocol: 'https',
        hostname: 'cdn.betterttv.net',
      },
      {
        protocol: 'https',
        hostname: '*.userapi.com',
      },
      {
        protocol: 'https',
        hostname: '*.vk.com',
      },
      {
        protocol: 'https',
        hostname: '*.vkusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.vk-cdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.avatars.yandex.net',
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
