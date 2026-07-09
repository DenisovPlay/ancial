import { Suspense } from 'react';
import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseSearchArtistsContent from './artists-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/search/artists',
  description: 'Все артисты по результатам поиска в Ancial Pulse.',
  title: 'Артисты — Поиск Pulse',
});

export default function PulseSearchArtistsPage() {
  return (
    <Suspense fallback={null}>
      <PulseSearchArtistsContent />
    </Suspense>
  );
}
