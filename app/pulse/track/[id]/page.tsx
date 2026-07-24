import type { Metadata } from 'next';

import { createPageMetadata, decodeHtmlEntities } from '../../../seo';
import PulseTrackContent from './track-content';
import { httpsGetJson } from '../../../lib/https-get';
import { API_BASE } from '../../../config';

type PulseTrackPageProps = {
  params: Promise<{
    id: string;
  }>;
};


export async function generateMetadata({ params }: PulseTrackPageProps): Promise<Metadata> {
  const { id } = await params;

  let title = 'Музыка в Pulse';
  let description = 'Слушайте любимые треки в Ancial Pulse без ограничений и рекламы.';
  let ogImage: string | undefined = undefined;

  try {
    const data = await httpsGetJson<any>(`${API_BASE}/api/V2/pulse/GetTrack.php?id=${id}`);
    if (data?.success && data?.data?.track) {
      const track = data.data.track;
      const trackTitle = decodeHtmlEntities(track.name) || 'Неизвестный трек';
      const trackArtist = decodeHtmlEntities(track.artist) || 'Неизвестный исполнитель';

      title = `${trackArtist} — ${trackTitle}`;
      description = `Слушайте трек «${trackTitle}» от ${trackArtist} в Ancial Pulse. Бесплатно и без рекламы.`;

      const artworkArray = Array.isArray(track.artwork) ? track.artwork : [];
      const cover = artworkArray.find((item: any) => item?.src);
      const src = cover?.src || track.img;

      if (src && typeof src === 'string') {
        ogImage = src.startsWith('http') ? src : `${API_BASE}${src}`;
      }
    }
  } catch (e) {
    console.error('Pulse SEO Track generateMetadata fetch error:', e);
  }

  return createPageMetadata({
    canonical: `/pulse/track/${encodeURIComponent(id)}`,
    description,
    title,
    ...(ogImage ? {
      openGraph: {
        images: [{ url: ogImage }],
      }
    } : {}),
  });
}

export default async function PulseTrackPage({ params }: PulseTrackPageProps) {
  const { id } = await params;

  return <PulseTrackContent trackId={id} />;
}
