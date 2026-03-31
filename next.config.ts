import type { NextConfig } from "next";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://ancial.ru';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { // Proxy for group links
        source: '/$:link',
        destination: '/group/:link',
      },
      { // Proxy for profile links
        source: '/@:login',
        destination: '/profile/:login',
      },
      { // Proxy for API requests
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
      { // Proxy for static assets like images, CSS, etc. that are served from the API server
        source: '/includes/:path*',
        destination: `${API_BASE}/includes/:path*`,
      },
    ];
  },
};

export default nextConfig;
