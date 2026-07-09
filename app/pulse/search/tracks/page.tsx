import { Suspense } from 'react';
import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseSearchTracksContent from './tracks-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/search/tracks',
  description: 'Все треки по результатам поиска в Ancial Pulse.',
  title: 'Треки — Поиск Pulse',
});

export default function PulseSearchTracksPage() {
  return (
    <Suspense fallback={null}>
      <PulseSearchTracksContent />
    </Suspense>
  );
}
