import type { Metadata } from 'next';

import { createPageMetadata } from '../../seo';
import PulseMyContent from './my-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/my',
  description: 'Ваша библиотека и история прослушивания в Ancial Pulse.',
  title: 'Мой Pulse',
});

export default function PulseMyPage() {
  return <PulseMyContent />;
}
