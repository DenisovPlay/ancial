import type { Metadata } from 'next';

import { getRequestUrl } from '../../../server-origin';
import { SITE_CONFIG } from '../../../seo';
import {
  getPulsePlaylistMetaEndpoint,
  normalizePulsePlaylistId,
  type PulsePlaylistMeta,
} from '../playlist-model';
import PulsePlaylistContent from './playlist-content';

type PulsePlaylistPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PlaylistPageResponse = {
  playlist?: PulsePlaylistMeta | null;
};

const FALLBACK_TITLE = 'Неизвестный плейлист';
const FALLBACK_DESCRIPTION = 'Слушайте музыку и плейлисты в Ancial Pulse! Бесплатно. Без рекламы.';

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

export async function generateMetadata({ params }: PulsePlaylistPageProps): Promise<Metadata> {
  const { id } = await params;
  const playlistId = normalizePulsePlaylistId(id);

  try {
    const response = await fetch(
      await getRequestUrl(getPulsePlaylistMetaEndpoint(playlistId)),
      { cache: 'no-store' },
    );

    if (!response.ok) {
      throw new Error(`Metadata request failed with status ${response.status}`);
    }

    const result = (await response.json()) as PlaylistPageResponse;
    const playlist = result.playlist ?? null;
    const playlistName = normalizeText(playlist?.name);
    const playlistArtist = normalizeText(playlist?.artist);
    const title = `${playlistName || FALLBACK_TITLE}${playlistArtist ? ` - ${playlistArtist}` : ''}`;
    const description = `Слушайте ${playlistName || 'неизвестный плейлист'} и другую музыку в Ancial Pulse! Бесплатно. Без рекламы.`;
    const image = normalizeText(playlist?.img) || undefined;
    const canonicalUrl = `${SITE_CONFIG.url}/pulse/playlist/${encodeURIComponent(playlistId)}`;

    return {
      alternates: {
        canonical: canonicalUrl,
      },
      description,
      openGraph: {
        description,
        images: image ? [image] : undefined,
        siteName: SITE_CONFIG.title,
        title,
        url: canonicalUrl,
      },
      title,
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        creator: SITE_CONFIG.twitter,
        description,
        images: image ? [image] : undefined,
        title,
      },
    };
  } catch {
    return {
      description: FALLBACK_DESCRIPTION,
      title: FALLBACK_TITLE,
    };
  }
}

export default async function PulsePlaylistPage({ params }: PulsePlaylistPageProps) {
  const { id } = await params;

  return <PulsePlaylistContent playlistId={id} />;
}
