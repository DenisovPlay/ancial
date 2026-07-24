import type { Metadata } from 'next';

import { createPageMetadata, decodeHtmlEntities } from '../../../seo';
import {
  getPulseBuiltinPlaylistDescription,
  getPulseBuiltinPlaylistTitle,
  normalizePulsePlaylistId,
} from '../playlist-model';
import PulsePlaylistContent from './playlist-content';
import { httpsGetJson } from '../../../lib/https-get';
import { API_BASE } from '../../../config';

type PulsePlaylistPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const FALLBACK_TITLE = 'Плейлисты в Pulse';
const FALLBACK_DESCRIPTION = 'Слушайте подборки и плейлисты в Ancial Pulse! Бесплатно. Без рекламы.';

export async function generateMetadata({ params }: PulsePlaylistPageProps): Promise<Metadata> {
  const { id } = await params;
  const playlistId = normalizePulsePlaylistId(id);

  let title = getPulseBuiltinPlaylistTitle(playlistId);
  let description = getPulseBuiltinPlaylistDescription(playlistId);
  let ogImage: string | undefined = undefined;

  // If not a built-in playlist, fetch its meta from the DB
  if (!title) {
    try {
      const data = await httpsGetJson<any>(`${API_BASE}/api/V2/pulse/GetPlaylist.php?pid=${playlistId}`);
      if (data?.success && data?.data?.playlist) {
        const playlist = data.data.playlist;
        const pTitle = decodeHtmlEntities(playlist.name) || FALLBACK_TITLE;

        title = pTitle;
        description = decodeHtmlEntities(playlist.desk) || `Слушайте плейлист «${pTitle}» в Ancial Pulse. Бесплатно и без рекламы.`;

        const src = playlist.img;
        if (src && typeof src === 'string') {
          ogImage = src.startsWith('http') ? src : `${API_BASE}${src}`;
        }
      }
    } catch (e) {
      console.error('Pulse SEO Playlist generateMetadata fetch error:', e);
    }
  }

  return createPageMetadata({
    canonical: `/pulse/playlist/${encodeURIComponent(playlistId)}`,
    description: description || FALLBACK_DESCRIPTION,
    title: title || FALLBACK_TITLE,
    ...(ogImage ? {
      openGraph: {
        images: [{ url: ogImage }],
      }
    } : {}),
  });
}

export default async function PulsePlaylistPage({ params }: PulsePlaylistPageProps) {
  const { id } = await params;

  return <PulsePlaylistContent playlistId={id} />;
}
