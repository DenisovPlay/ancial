import type { Metadata } from 'next';

import { createPageMetadata, decodeHtmlEntities } from '../../../seo';
import PulseArtistContent from './artist-content';
import { httpsGetJson } from '../../../lib/https-get';
import { API_BASE } from '../../../config';

type PulseArtistPageProps = {
  params: Promise<{
    id: string;
  }>;
};


export async function generateMetadata({ params }: PulseArtistPageProps): Promise<Metadata> {
  const { id } = await params;

  let title = 'Исполнители в Pulse';
  let description = 'Слушайте музыку популярных исполнителей в Ancial Pulse бесплатно.';
  let ogImage: string | undefined = undefined;

  try {
    const data = await httpsGetJson<any>(`${API_BASE}/api/V2/pulse/GetArtist.php?id=${id}`);
    if (data?.success && data?.data?.artist) {
      const artist = data.data.artist;
      const artistName = decodeHtmlEntities(artist.name) || 'Артист Pulse';

      title = artistName;
      description = decodeHtmlEntities(artist.desk) || `Слушайте треки и плейлисты исполнителя ${artistName} в Ancial Pulse.`;

      const src = artist.img;
      if (src && typeof src === 'string') {
        ogImage = src.startsWith('http') ? src : `${API_BASE}${src}`;
      }
    }
  } catch (e) {
    console.error('Pulse SEO Artist generateMetadata fetch error:', e);
  }

  return createPageMetadata({
    canonical: `/pulse/artist/${encodeURIComponent(id)}`,
    description,
    title,
    ...(ogImage ? {
      openGraph: {
        images: [{ url: ogImage }],
      }
    } : {}),
  });
}

export default async function PulseArtistPage({ params }: PulseArtistPageProps) {
  const { id } = await params;

  return <PulseArtistContent artistId={id} />;
}
