import type { NextConfig } from "next";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://ancial.ru';

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
        hostname: 'cdn.betterttv.net',
      },
    ],
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
      ],
    };
  },
};

export default nextConfig;
