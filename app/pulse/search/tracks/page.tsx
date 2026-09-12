import { Suspense } from 'react';
import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseSearchTracksContent from './tracks-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/search/tracks',
  description: 'Все треки по результатам поиска в Zypo Pulse.',
  title: 'Треки — Поиск Pulse',
});

// PulseSearchTracksContent's render depends on useSearchParams (q); static generation
// causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function PulseSearchTracksPage() {
  return (
    <Suspense fallback={null}>
      <PulseSearchTracksContent />
    </Suspense>
  );
}
