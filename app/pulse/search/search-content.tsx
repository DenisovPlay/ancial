'use client';
/* eslint-disable @next/next/no-img-element */

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import ShareModal from '../../components/share-modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { AncialAPI } from '../../lib/api-v2';
import { SITE_CONFIG } from '../../seo';
import PulseUploadTrackModal, { PulseDeleteTrackModal } from '../pulse-upload-track-modal';
import { writePulseJsonCache } from '../pulse-cache';
import {
  ActionIcon,
  PulseArtistTile,
  PulseLogo,
  PulsePlaylistTile,
  PulseTrackRow,
  cn,
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<PulsePlaylistCardData[]>([]);
  const [searchReloadToken, setSearchReloadToken] = useState(0);
  const [searchValue, setSearchValue] = useState(query);
  const [shareUrl, setShareUrl] = useState('');
  const [trackToDelete, setTrackToDelete] = useState<PulseTrack | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<PulseTrack | null>(null);
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
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      setLoading(true);

      const [favoritesResult, searchResult] = await Promise.allSettled([
        AncialAPI.pulseGetLibrary<{ ids?: Array<number | string> }>('favorites'),
        AncialAPI.pulseSearch<PulseSearchResponse>(query),
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
  }, [query, searchReloadToken]);

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
      const response = await AncialAPI.pulseTrackAction<{ message?: string }>('add_favorite', trackId);
      const result = response.message || '';

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

  const refreshSearchAfterMutation = useCallback(() => {
    setSearchReloadToken((token) => token + 1);
  }, []);

  const openEditTrack = useCallback((track: PulseTrack) => {
    setTrackToEdit(track);
  }, []);

  const closeEditTrack = useCallback(() => {
    setTrackToEdit(null);
  }, []);

  const openDeleteTrack = useCallback((track: PulseTrack) => {
    setTrackToDelete(track);
  }, []);

  const empty = !loading && !artists.length && !playlists.length && !tracks.length;

  const submitSearch = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/pulse/search?q=${encodeURIComponent(searchValue)}`);
  }, [router, searchValue]);

  const label = useCallback((text: string) => (
    <span className="cutetext w-full px-3 text-2xl font-black lg:px-0 lg:text-3xl xl:text-4xl">
      {text}
    </span>
  ), []);

  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-pink-500/25 via-black to-black pb-64 duration-300 lg:from-black">
      <div className="sticky top-0 flex w-full max-w-screen-2xl items-center gap-3 bg-gradient-to-b from-black via-black/90 to-transparent px-3 pt-3 lg:px-0" style={{ zIndex: 99 }}>
        <button
          type="button"
          onClick={() => router.push('/pulse')}
          className={cn(
            'shrink-0 overflow-hidden cursor-pointer duration-300 active:scale-95 flex items-center',
            isSearchFocused ? 'w-0 opacity-0 scale-95' : 'w-32 sm:w-48 opacity-100 scale-100',
          )}
        >
          <PulseLogo className="w-32 sm:w-48 duration-300 hover:opacity-80" />
        </button>
        <form
          onSubmit={submitSearch}
          className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 backdrop-blur-md backdrop-saturate-200"
          style={{ zIndex: 11 }}
        >
          <input
            value={searchValue}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(event) => setSearchValue(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full bg-transparent pl-2 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
            placeholder={lang?.pulse_search || 'Поиск'}
            autoComplete="off"
          />
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-zinc-700 active:scale-95"
          >
            <ActionIcon className="h-8 w-8" name="IC-search" />
          </button>
        </form>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => router.push('/pulse/my')}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 backdrop-blur-md backdrop-saturate-200 duration-300 hover:bg-zinc-700 active:scale-95"
          >
            <ActionIcon className="h-8 w-8" name="IC-me" />
          </button>
        ) : null}
      </div>

      <div className="relative flex w-full max-w-screen-2xl flex-col gap-3" style={{ zIndex: 19 }}>
        {loading ? (
          <div className="flex flex-col gap-3 px-3 lg:px-0 animate-pulse">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl">
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-zinc-800" />
                <div className="flex flex-grow flex-col gap-2">
                  <div className="h-4 w-2/3 rounded-full bg-zinc-800" />
                  <div className="h-3 w-1/3 rounded-full bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && artists.length ? (
          <>
            {label(lang?.artists || 'Артисты')}
            <div className="viewport dragscroll -mx-3 -my-3 flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 py-3 lg:px-0">
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
            {label(lang?.playlists || 'Плейлисты')}
            <div className="viewport dragscroll -mx-3 -my-3 flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 py-3 lg:px-0">
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
            {label(lang?.tracks || 'Треки')}
            <div className="flex h-full w-full flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
              {tracks.map((track, index) => (
                <PulseTrackRow
                  currentSongId={currentSongId}
                  favoriteIds={favoriteIds}
                  isAuthenticated={isAuthenticated}
                  key={`search-track-${track.sid ?? index}`}
                  onAddToPlaylist={openAddTrackToPlaylist}
                  onCopyTrackLink={copyTrackLink}
                  onDeleteTrack={openDeleteTrack}
                  onEditTrack={openEditTrack}
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
          </>
        ) : null}

        {empty ? (
          <div className="flex w-full flex-col items-center justify-center gap-0.5 text-center">
            <img src="/includes/img/anlite/nothingfound.webp" className="h-56" alt="" />
            <span className="w-full text-center text-base font-black text-content-600">{lang?.noposts || 'Ничего не найдено'}</span>
            <span className="w-full text-center text-sm font-medium text-content-400">{lang?.nopostsdesc || 'Попробуйте другой запрос'}</span>
          </div>
        ) : null}
      </div>

      <ShareModal
        copyLabel={lang?.copylink || 'Скопировать ссылку'}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onCopied={() => showPulseNote(lang?.linkcopied || 'Ссылка скопирована', 'success')}
        onCopyFailed={() => showPulseNote(shareUrl, 'info')}
        shareUrl={shareUrl}
        title={lang?.share || 'Поделиться'}
      />
      <PulseUploadTrackModal
        isOpen={Boolean(trackToEdit)}
        onClose={closeEditTrack}
        onUploaded={refreshSearchAfterMutation}
        showNote={showPulseNote}
        track={trackToEdit}
      />
      <PulseDeleteTrackModal
        isOpen={Boolean(trackToDelete)}
        onClose={() => setTrackToDelete(null)}
        onDeleted={refreshSearchAfterMutation}
        showNote={showPulseNote}
        track={trackToDelete}
      />
    </div>
  );
}
