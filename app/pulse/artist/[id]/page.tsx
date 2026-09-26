import type { Metadata } from 'next';

import { createPageMetadata, decodeHtmlEntities } from '../../../seo';
import PulseArtistContent from './artist-content';
import { httpsGetJson } from '../../../lib/https-get';
import { API_BASE } from '../../../config';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ id: 'param' });

type PulseArtistPageProps = {
  params: Promise<{
    id: string;
  }>;
};


export async function generateMetadata({ params }: PulseArtistPageProps): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  const { id } = await params;

  let title = 'Исполнители в Pulse';
  let description = 'Слушайте музыку популярных исполнителей в Zypo Pulse бесплатно.';
  let ogImage: string | undefined = undefined;

  try {
    /** Ответ GetArtist.php для SEO-метаданных. */
    interface ArtistSeoResponse {
      success?: boolean;
      data?: {
        artist?: { name?: string; desk?: string; img?: string };
      };
    }
    const data = await httpsGetJson<ArtistSeoResponse>(`${API_BASE}/api/V2/pulse/GetArtist.php?id=${id}`);
    if (data?.success && data?.data?.artist) {
      const artist = data.data.artist;
      const artistName = decodeHtmlEntities(artist.name) || 'Артист Pulse';

      title = artistName;
      description = decodeHtmlEntities(artist.desk) || `Слушайте треки и плейлисты исполнителя ${artistName} в Zypo Pulse.`;

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

  return IS_NATIVE_APP ? (
    <AppRouteShell param="id" prop="artistId">
      <PulseArtistContent artistId={id} />
    </AppRouteShell>
  ) : <PulseArtistContent artistId={id} />;
}
