import type { Metadata } from 'next';

import { createPageMetadata, decodeHtmlEntities } from '../../../seo';
import PulseTrackContent from './track-content';
import { httpsGetJson } from '../../../lib/https-get';
import { API_BASE } from '../../../config';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ id: 'param' });

type PulseTrackPageProps = {
  params: Promise<{
    id: string;
  }>;
};


export async function generateMetadata({ params }: PulseTrackPageProps): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  const { id } = await params;

  let title = 'Музыка в Pulse';
  let description = 'Слушайте любимые треки в Zypo Pulse без ограничений и рекламы.';
  let ogImage: string | undefined = undefined;

  try {
    /** Ответ GetTrack.php для SEO-метаданных. */
    interface TrackSeoResponse {
      success?: boolean;
      data?: {
        track?: {
          name?: string;
          artist?: string;
          img?: string;
          artwork?: Array<{ src?: string }>;
        };
      };
    }
    const data = await httpsGetJson<TrackSeoResponse>(`${API_BASE}/api/V2/pulse/GetTrack.php?id=${id}`);
    if (data?.success && data?.data?.track) {
      const track = data.data.track;
      const trackTitle = decodeHtmlEntities(track.name) || 'Неизвестный трек';
      const trackArtist = decodeHtmlEntities(track.artist) || 'Неизвестный исполнитель';

      title = `${trackArtist} — ${trackTitle}`;
      description = `Слушайте трек «${trackTitle}» от ${trackArtist} в Zypo Pulse. Бесплатно и без рекламы.`;

      const artworkArray = Array.isArray(track.artwork) ? track.artwork : [];
      const cover = artworkArray.find((item) => item?.src);
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

  return IS_NATIVE_APP ? (
    <AppRouteShell param="id" prop="trackId">
      <PulseTrackContent trackId={id} />
    </AppRouteShell>
  ) : <PulseTrackContent trackId={id} />;
}
