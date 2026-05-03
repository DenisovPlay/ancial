import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseArtistContent from './artist-content';

type PulseArtistPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: PulseArtistPageProps): Promise<Metadata> {
  const { id } = await params;

  return createPageMetadata({
    canonical: `/pulse/artist/${encodeURIComponent(id)}`,
    description: 'Артист, плейлисты и треки в Ancial Pulse.',
    title: 'Артист Pulse',
  });
}

export default async function PulseArtistPage({ params }: PulseArtistPageProps) {
  const { id } = await params;

  return <PulseArtistContent artistId={id} />;
}
