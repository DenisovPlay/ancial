import type { Metadata } from 'next';

import PulseContent from './pulse-content';
import { createPageMetadata } from '../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Pulse',
  description: 'Музыка. Без рекламы. Бесплатно.',
  keywords: ['pulse', 'музыка', 'плейлисты', 'артисты', 'треки', 'ancial pulse', 'ancial music'],
  canonical: '/pulse',
});

export default function PulsePage() {
  return <PulseContent />;
}
