import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseTrackContent from './track-content';

type PulseTrackPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: PulseTrackPageProps): Promise<Metadata> {
  const { id } = await params;

  return createPageMetadata({
    canonical: `/pulse/track/${encodeURIComponent(id)}`,
    description: 'Слушайте трек в Ancial Pulse.',
    title: 'Трек Pulse',
  });
}

export default async function PulseTrackPage({ params }: PulseTrackPageProps) {
  const { id } = await params;

  return <PulseTrackContent trackId={id} />;
}
