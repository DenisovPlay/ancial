import type { Metadata } from 'next';
import AnimeContent from './anime-content';
import { createPageMetadata } from '../../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Аниме — Frame',
  description: 'Коллекция аниме и анимационных фильмов на Frame.',
  canonical: '/cinema/anime',
  robots: { index: false, follow: false },
});

export default function AnimePage() {
  return <AnimeContent />;
}
