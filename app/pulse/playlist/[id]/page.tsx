import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import {
  getPulseBuiltinPlaylistDescription,
  getPulseBuiltinPlaylistTitle,
  normalizePulsePlaylistId,
} from '../playlist-model';
import PulsePlaylistContent from './playlist-content';

type PulsePlaylistPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const FALLBACK_TITLE = 'Плейлист Pulse';
const FALLBACK_DESCRIPTION = 'Слушайте музыку и плейлисты в Ancial Pulse! Бесплатно. Без рекламы.';

export async function generateMetadata({ params }: PulsePlaylistPageProps): Promise<Metadata> {
  const { id } = await params;
  const playlistId = normalizePulsePlaylistId(id);
  const title = getPulseBuiltinPlaylistTitle(playlistId) || FALLBACK_TITLE;
  const description = getPulseBuiltinPlaylistDescription(playlistId) || FALLBACK_DESCRIPTION;

  return createPageMetadata({
    canonical: `/pulse/playlist/${encodeURIComponent(playlistId)}`,
    description,
    title,
  });
}

export default async function PulsePlaylistPage({ params }: PulsePlaylistPageProps) {
  const { id } = await params;

  return <PulsePlaylistContent playlistId={id} />;
}
