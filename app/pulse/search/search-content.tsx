'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import ShareModal from '../../components/share-modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { authFetch } from '../../lib/auth-fetch';
import { SITE_CONFIG } from '../../seo';
import { fetchPulseJson } from '../pulse-api';
import { writePulseJsonCache } from '../pulse-cache';
import {
  PulseArtistTile,
  PulseEmptyState,
  PulseLegalFooter,
  PulsePageHeader,
  PulsePlaylistTile,
  PulsePlaylistTileSkeleton,
  PulseSectionTitle,
  PulseTrackRow,
  TracksPanelSkeleton,
  normalizeText,
  toNumber,
  type PulseArtistCardData,
  type PulsePlaylistCardData,
  type PulseTrack,
} from '../pulse-components';

type PulseSearchResponse = {
  artists?: PulseArtistCardData[] | null;
  playlists?: PulsePlaylistCardData[] | null;
  tracks?: PulseTrack[] | null;
};

const FAVORITES_CACHE_KEY = 'pulse_fav_ids';

function isGenlistPlaylist(card: PulsePlaylistCardData) {
  return String(card.type ?? '') === '4';
}

function getCardPlayableId(card: PulsePlaylistCardData) {
  return isGenlistPlaylist(card)
    ? normalizeText(card.genlist)
    : normalizeText(String(card.id ?? ''));
}

function getExternalPulseUrl(path: string) {
  return `${SITE_CONFIG.url}${path}`;
}

export default function PulseSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = normalizeText(searchParams.get('q'));
  const { isAuthenticated, lang, user } = useAuth();
  const { showNote } = useNotification();
  const {
    currentCollectionId,
    currentSongId,
    isPlaying,
    openAddToPlaylist,
    playGenlist,
    playNextTrack,
    playPlaylist,
    playTrack,
  } = usePulsePlayer();

  const [artists, setArtists] = useState<PulseArtistCardData[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<PulsePlaylistCardData[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [tracks, setTracks] = useState<PulseTrack[]>([]);

  const userCountry = useMemo(() => {
    const nextCountry = normalizeText(
      typeof window !== 'undefined'
        ? String((window as Window & { userCountry?: string }).userCountry ?? user?.country ?? '')
        : String(user?.country ?? ''),
    );

    return nextCountry || 'RU';
  }, [user?.country]);

  const showPulseNote = useCallback((content: string, type: 'error' | 'info' | 'success' = 'info') => {
    showNote({ content, time: 4, type });
  }, [showNote]);

  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      setLoading(true);

      if (!query) {
        setArtists([]);
        setPlaylists([]);
        setTracks([]);
        setLoading(false);
        return;
      }

      const [favoritesResult, searchResult] = await Promise.allSettled([
        fetchPulseJson<{ ids?: Array<number | string> }>('/api/pulse/getFavorites.php'),
        fetchPulseJson<PulseSearchResponse>(`/api/pulse/search.php?q=${encodeURIComponent(query)}`),
      ]);

      if (cancelled) return;

      if (favoritesResult.status === 'fulfilled') {
        const nextIds = Array.isArray(favoritesResult.value.ids)
          ? favoritesResult.value.ids.map((id) => toNumber(id)).filter(Boolean)
          : [];
        writePulseJsonCache(FAVORITES_CACHE_KEY, nextIds);
        setFavoriteIds(nextIds);
      }

      if (searchResult.status === 'fulfilled') {
        setArtists(Array.isArray(searchResult.value.artists) ? searchResult.value.artists : []);
        setPlaylists(Array.isArray(searchResult.value.playlists) ? searchResult.value.playlists : []);
        setTracks(Array.isArray(searchResult.value.tracks) ? searchResult.value.tracks : []);
      } else {
        setArtists([]);
        setPlaylists([]);
        setTracks([]);
      }

      setLoading(false);
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const playPlaylistCard = useCallback((card: PulsePlaylistCardData) => {
    const playableId = getCardPlayableId(card);
    if (!playableId) return;

    if (isGenlistPlaylist(card)) {
      void playGenlist(playableId);
      return;
    }

    void playPlaylist(playableId);
  }, [playGenlist, playPlaylist]);

  const likeTrack = useCallback(async (track: PulseTrack) => {
    if (!isAuthenticated) {
      showPulseNote('Войдите, чтобы добавлять треки в избранное', 'info');
      return;
    }

    const trackId = toNumber(track.sid);
    if (!trackId) return;

    try {
      const response = await authFetch(`/api/pulse/add_favorite_song.php?id=${trackId}`);
      const result = normalizeText(await response.text());

      if (result === 'ADDED' || result === 'CREATED_ADDED') {
        setFavoriteIds((ids) => {
          const nextIds = ids.includes(trackId) ? ids : [...ids, trackId];
          writePulseJsonCache(FAVORITES_CACHE_KEY, nextIds);
          return nextIds;
        });
        showPulseNote(result === 'CREATED_ADDED' ? 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!' : 'Трек добавлен в ваш плейлист!', 'success');
        return;
      }

      if (result === 'REMOVED') {
        setFavoriteIds((ids) => {
          const nextIds = ids.filter((id) => id !== trackId);
          writePulseJsonCache(FAVORITES_CACHE_KEY, nextIds);
          return nextIds;
        });
        showPulseNote('Трек удалён из вашего плейлиста!', 'success');
        return;
      }

      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    } catch {
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    }
  }, [isAuthenticated, lang, showPulseNote]);

  const copyTrackLink = useCallback(async (trackId: number | string) => {
    const resolvedTrackId = toNumber(trackId);
    if (!resolvedTrackId) return;

    setShareUrl(getExternalPulseUrl(`/pulse/track/${resolvedTrackId}`));
    setIsShareModalOpen(true);
  }, []);

  const openAddTrackToPlaylist = useCallback((trackId: number | string) => {
    if (!isAuthenticated) {
      showPulseNote('Войдите, чтобы добавлять треки в плейлисты', 'info');
      return;
    }

    openAddToPlaylist(trackId);
  }, [isAuthenticated, openAddToPlaylist, showPulseNote]);

  const empty = !loading && !artists.length && !playlists.length && !tracks.length;

  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-pink-500/25 via-black to-black pb-40 duration-300 lg:from-black lg:pb-64">
      <PulsePageHeader onBack={() => router.push('/pulse')} />

      {query ? (
        <PulseSectionTitle>{query}</PulseSectionTitle>
      ) : null}

      {loading ? (
        <>
          <PulseSectionTitle>{lang?.playlists || 'Плейлисты'}</PulseSectionTitle>
          <div className="flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 lg:px-0">
            {Array.from({ length: 6 }).map((_, index) => <PulsePlaylistTileSkeleton key={index} />)}
          </div>
          <div className="w-full max-w-screen-2xl rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
            <TracksPanelSkeleton rows={5} />
          </div>
        </>
      ) : null}

      {!loading && artists.length ? (
        <>
          <PulseSectionTitle>{lang?.artists || 'Артисты'}</PulseSectionTitle>
          <div className="viewport dragscroll -my-3 flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 py-3 lg:px-0">
            {artists.map((artist) => (
              <PulseArtistTile
                artist={artist}
                key={`search-artist-${artist.id ?? artist.name}`}
                onOpen={() => router.push(`/pulse/artist/${encodeURIComponent(normalizeText(String(artist.id ?? '0')) || '0')}`)}
              />
            ))}
          </div>
        </>
      ) : null}

      {!loading && playlists.length ? (
        <>
          <PulseSectionTitle>{lang?.playlists || 'Плейлисты'}</PulseSectionTitle>
          <div className="viewport dragscroll flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 lg:px-0">
            {playlists.map((card) => {
              const playableId = getCardPlayableId(card);
              return (
                <PulsePlaylistTile
                  card={card}
                  isPlaying={Boolean(playableId && currentCollectionId === playableId && isPlaying)}
                  key={`search-playlist-${card.id ?? card.genlist ?? card.name}`}
                  onOpen={() => router.push(`/pulse/playlist/${encodeURIComponent(normalizeText(String(card.id ?? '0')) || '0')}`)}
                  onPlay={() => playPlaylistCard(card)}
                />
              );
            })}
          </div>
        </>
      ) : null}

      {!loading && tracks.length ? (
        <>
          <PulseSectionTitle>{lang?.tracks || 'Треки'}</PulseSectionTitle>
          <div className="w-full max-w-screen-2xl rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
            <div className="flex flex-col gap-3">
              {tracks.map((track, index) => (
                <PulseTrackRow
                  currentSongId={currentSongId}
                  favoriteIds={favoriteIds}
                  isAuthenticated={isAuthenticated}
                  key={`search-track-${track.sid ?? index}`}
                  onAddToPlaylist={openAddTrackToPlaylist}
                  onCopyTrackLink={copyTrackLink}
                  onLikeTrack={likeTrack}
                  onOpenArtist={(artistId) => router.push(`/pulse/artist/${encodeURIComponent(artistId)}`)}
                  onPlayTrack={(nextTrack) => {
                    void playTrack(nextTrack.sid ?? 0);
                  }}
                  onQueueTrackNext={(trackId) => playNextTrack(trackId)}
                  track={track}
                  trackIndex={index}
                  user={user}
                  userCountry={userCountry}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {empty ? (
        <PulseEmptyState description={lang?.nopostsdesc || 'Попробуйте другой запрос'} title={lang?.noposts || 'Ничего не найдено'} />
      ) : null}

      <PulseLegalFooter className="mt-3" />

      <ShareModal
        copyLabel={lang?.copylink || 'Скопировать ссылку'}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onCopied={() => showPulseNote(lang?.linkcopied || 'Ссылка скопирована', 'success')}
        onCopyFailed={() => showPulseNote(shareUrl, 'info')}
        shareUrl={shareUrl}
        title={lang?.share || 'Поделиться'}
      />
    </div>
  );
}
