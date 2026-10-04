import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseDislikesContent from './dislikes-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/library/dislikes',
  description: 'Треки и исполнители, которые вы отметили как неинтересные, в Zypo Pulse.',
  title: 'Не интересно — Pulse',
});

export default function PulseDislikesPage() {
  return <PulseDislikesContent />;
}
