import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'cc.zypo',
    name: 'Zypo',
    short_name: 'Zypo',
    description: 'Больше, чем просто социальная сеть',
    start_url: '/',
    scope: '/',
    lang: 'ru-RU',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    dir: 'ltr',
    orientation: 'portrait',
    categories: ['social', 'social networking'],
    screenshots: [
      {
        src: '/img/screenshots/1.png',
        sizes: '385x843',
        type: 'image/png',
      },
      {
        src: '/img/screenshots/2.png',
        sizes: '389x843',
        type: 'image/png',
      },
      {
        src: '/img/screenshots/3.png',
        sizes: '1915x944',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Application',
      },
    ],
    icons: [
      {
        purpose: 'any',
        sizes: '401x401',
        src: '/img/zypo/logo-rounded.webp',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '401x401',
        src: '/img/zypo/logo-rounded.webp',
        type: 'image/png',
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
