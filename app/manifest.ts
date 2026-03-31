import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'ru.ancial',
    name: 'Ancial',
    short_name: 'Ancial',
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
        src: '/includes/img/screenshots/1.png',
        sizes: '385x843',
        type: 'image/png',
      },
      {
        src: '/includes/img/screenshots/2.png',
        sizes: '389x843',
        type: 'image/png',
      },
      {
        src: '/includes/img/screenshots/3.png',
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
        src: '/includes/img/401anlogo.png',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '401x401',
        src: '/includes/img/401anlogo.png',
        type: 'image/png',
      },
      {
        purpose: 'any',
        sizes: '192x192',
        src: '/includes/img/icon-192.png',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '192x192',
        src: '/includes/img/icon-192.png',
        type: 'image/png',
      },
      {
        purpose: 'any',
        sizes: '512x512',
        src: '/includes/img/icon-512.png',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/includes/img/icon-512.png',
        type: 'image/png',
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
