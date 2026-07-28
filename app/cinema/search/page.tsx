import type { Metadata } from 'next';
import SearchContent from './search-content';
import { createPageMetadata } from '../../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Поиск — Frame',
  description: 'Поиск фильмов, сериалов и аниме на платформе Frame.',
  canonical: '/cinema/search',
  robots: { index: false, follow: false },
});

export default function CinemaSearchPage() {
  return <SearchContent />;
}
