import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import CacheContent from './cache-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Память',
  description: 'Управление кэшем и памятью приложения.',
  keywords: ['память', 'кэш', 'настройки'],
  canonical: '/settings/cache',
});

export default function CacheSettingsPage() {
  return <CacheContent />;
}
