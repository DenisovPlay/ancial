import type { Metadata } from 'next';

import { createPageMetadata } from '../../seo';
import PulseLibraryContent from './library-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/library',
  description: 'Ваши плейлисты в Ancial Pulse.',
  title: 'Библиотека Pulse',
});

export default function PulseLibraryPage() {
  return <PulseLibraryContent />;
}
