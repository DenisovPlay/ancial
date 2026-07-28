import type { Metadata } from 'next';
import CinemaContent from './cinema-content';
import { createPageMetadata } from '../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Frame — Онлайн-кинотеатр',
  description: 'Смотрите новые фильмы, сериалы и аниме в высоком качестве 4K HDR на платформе Frame.',
  keywords: ['frame', 'кинотеатр', 'фильмы', 'сериалы', 'аниме', 'стриминг', 'ancial frame', 'zypo cinema'],
  canonical: '/cinema',
  robots: { index: false, follow: false },
});

export default function CinemaPage() {
  return <CinemaContent />;
}
