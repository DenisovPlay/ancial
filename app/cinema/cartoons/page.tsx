import type { Metadata } from 'next';
import CartoonsContent from './cartoons-content';
import { createPageMetadata } from '../../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Мультфильмы — Frame',
  description: 'Коллекция мультфильмов и анимационных сериалов для всей семьи на Frame.',
  canonical: '/cinema/cartoons',
  robots: { index: false, follow: false },
});

export default function CartoonsPage() {
  return <CartoonsContent />;
}
