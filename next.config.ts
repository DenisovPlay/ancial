import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/$:link',
        destination: '/group/:link',
      },
      {
        source: '/@:login',
        destination: '/profile/:login',
      },
      {
        source: '/api/:path*',
        destination: 'https://ancial.ru/api/:path*',
      },
      {
        source: '/includes/:path*',
        destination: 'https://ancial.ru/includes/:path*',
      },
    ];
  },
};

export default nextConfig;
