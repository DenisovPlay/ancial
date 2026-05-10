import { Suspense } from 'react';
import type { Metadata } from 'next';

import { createPageMetadata } from '../../seo';
import PulseSearchContent from './search-content';
import PulseSearchLoading from './search-loading';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/search',
  description: 'Поиск артистов, плейлистов и треков в Ancial Pulse.',
  title: 'Поиск Pulse',
});

export default function PulseSearchPage() {
  return (
    <Suspense fallback={<PulseSearchLoading />}>
      <PulseSearchContent />
    </Suspense>
  );
}
