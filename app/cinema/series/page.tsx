import type { Metadata } from 'next';
import SeriesContent from './series-content';
import { createPageMetadata } from '../../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Сериалы — Frame',
  description: 'Популярные сериалы и шоу на Frame.',
  canonical: '/cinema/series',
  robots: { index: false, follow: false },
});

export default function SeriesPage() {
  return <SeriesContent />;
}
