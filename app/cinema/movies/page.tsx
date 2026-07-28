import type { Metadata } from 'next';
import MoviesContent from './movies-content';
import { createPageMetadata } from '../../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Фильмы — Frame',
  description: 'Каталог лучших фильмов в 4K HDR на Frame.',
  canonical: '/cinema/movies',
  robots: { index: false, follow: false },
});

export default function MoviesPage() {
  return <MoviesContent />;
}
