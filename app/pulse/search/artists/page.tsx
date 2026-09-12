import { Suspense } from 'react';
import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseSearchArtistsContent from './artists-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/search/artists',
  description: 'Все артисты по результатам поиска в Zypo Pulse.',
  title: 'Артисты — Поиск Pulse',
});

// PulseSearchArtistsContent's render depends on useSearchParams (q); static generation
// causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function PulseSearchArtistsPage() {
  return (
    <Suspense fallback={null}>
      <PulseSearchArtistsContent />
    </Suspense>
  );
}
