import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://ancial.ru/api/:path*',
      },
    ];
  },
};

export default nextConfig;
