import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseTrackContent from './track-content';
import { decodeHtmlEntities } from '../../pulse-components';

type PulseTrackPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.ancial.ru';

export async function generateMetadata({ params }: PulseTrackPageProps): Promise<Metadata> {
  const { id } = await params;
  
  let title = 'Музыка в Pulse';
  let description = 'Слушайте любимые треки в Ancial Pulse без ограничений и рекламы.';
  let ogImage: string | undefined = undefined;

  try {
    const res = await fetch(`${API_BASE}/api/V2/pulse/GetTrack.php?id=${id}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
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
    }
  } catch (e) {
    // ignore
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
