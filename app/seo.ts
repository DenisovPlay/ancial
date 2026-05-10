import type { Metadata } from 'next';

export const SITE_CONFIG = {
  title: 'Ancial',
  tagline: 'Больше, чем социальная сеть',
  description: 'Социальная сеть с лентой новостей, сообщениями, звонками, музыкой, играми и кошельком. Современная платформа для общения и развлечений.',
  url: 'https://ancial.ru',
  locale: 'ru_RU',
  twitter: '@ancialru',
};

export const DEFAULT_SEO: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SITE_CONFIG.title,
    template: `%s | ${SITE_CONFIG.title}`,
  },
  description: SITE_CONFIG.description,
  keywords: [
    'социальная сеть',
    'общение',
    'мессенджер',
    'лента новостей',
    'сообщества',
    'музыка',
    'игры',
    'Ancial',
  ],
  authors: [{ name: 'ZeniFlow', url: 'https://ancial.ru' }],
  creator: 'ZeniFlow',
  openGraph: {
    type: 'website',
    locale: SITE_CONFIG.locale,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.title,
    title: {
      default: SITE_CONFIG.title,
      template: `%s | ${SITE_CONFIG.title}`,
    },
    description: SITE_CONFIG.description,
    images: [
      {
        url: '/img/og/og-image.jpg',
        width: 1200,
        height: 630,
        alt: SITE_CONFIG.title,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: SITE_CONFIG.title,
      template: `%s | ${SITE_CONFIG.title}`,
    },
    description: SITE_CONFIG.description,
    creator: SITE_CONFIG.twitter,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Добавить при необходимости
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

// Хелпер для создания метаданных страницы
export function createPageMetadata(options: {
  title: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  openGraph?: Metadata['openGraph'];
  twitter?: Metadata['twitter'];
}): Metadata {
  const { title, description, keywords, canonical, openGraph, twitter } = options;

  return {
    title,
    description: description || SITE_CONFIG.description,
    keywords: keywords || DEFAULT_SEO.keywords,
    openGraph: {
      ...DEFAULT_SEO.openGraph,
      ...openGraph,
      title,
      description: description || SITE_CONFIG.description,
    },
    twitter: {
      ...DEFAULT_SEO.twitter,
      ...twitter,
      title,
      description: description || SITE_CONFIG.description,
    },
    alternates: {
      canonical: canonical || `${SITE_CONFIG.url}${canonical || ''}`,
    },
  };
}
