import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchContent from './search-content';
import { createPageMetadata } from '../../seo';
import { CinemaGridSkeleton } from '../components/cinema-skeleton';

export const metadata: Metadata = createPageMetadata({
  title: 'Поиск — Frame',
  description: 'Поиск фильмов, сериалов и аниме на платформе Frame.',
  canonical: '/cinema/search',
  robots: { index: false, follow: false },
});

// SearchContent's initial query state depends on useSearchParams (q); static
// generation causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function CinemaSearchPage() {
  return (
    <Suspense fallback={<CinemaGridSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}
