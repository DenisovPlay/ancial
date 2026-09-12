import { Suspense } from 'react';
import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseSearchPlaylistsContent from './playlists-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/search/playlists',
  description: 'Все плейлисты по результатам поиска в Zypo Pulse.',
  title: 'Плейлисты — Поиск Pulse',
});

// PulseSearchPlaylistsContent's render depends on useSearchParams (q); static generation
// causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function PulseSearchPlaylistsPage() {
  return (
    <Suspense fallback={null}>
      <PulseSearchPlaylistsContent />
    </Suspense>
  );
}
