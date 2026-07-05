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
import { PulseHeader } from '../pulse-header';
import { readPulseJsonCache, writePulseJsonCache } from '../pulse-cache';
import {
  getPulseBackgroundColorByMood,
  getTrackArtwork,
  getImageUrl,
  decodeHtmlEntities,
  PulseArtistTile,
  PulsePlaylistTile,
  PulseReportModal,
  PulseTrackRow,
  normalizeText,
  toNumber,
  cn,
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

function getPulseSearchCacheKey(query: string) {
  return `pulse_search:${encodeURIComponent(query || '__empty__')}`;
}

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
    currentTrackObj,
    isPlaying,
    openAddToPlaylist,
    playGenlist,
    playNextTrack,
    playPlaylist,
    playTrack,
  } = usePulsePlayer();

  const [artists, setArtists] = useState<PulseArtistCardData[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => (
    (readPulseJsonCache<number[]>(FAVORITES_CACHE_KEY) ?? []).map((id) => toNumber(id)).filter(Boolean)
  ));
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<PulsePlaylistCardData[]>([]);
  const [searchReloadToken, setSearchReloadToken] = useState(0);
  const [searchValue, setSearchValue] = useState(query);
  const [shareUrl, setShareUrl] = useState('');
  const [shareAttachment, setShareAttachment] = useState<{
    widgets: any[];
    preview: { authorName: string; authorImg: string; contentSnippet: string; firstImage?: string };
  } | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<PulseTrack | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<PulseTrack | null>(null);
  const [reportTrackTarget, setReportTrackTarget] = useState<PulseTrack | null>(null);
  const [tracks, setTracks] = useState<PulseTrack[]>([]);

  const userCountry = useMemo(() => {
    const nextCountry = normalizeText(
      typeof window !== 'undefined'
        ? String((window as Window & { userCountry?: string }).userCountry ?? user?.country ?? '')
        : String(user?.country ?? ''),
    );

    return nextCountry || 'RU';
  }, [user?.country]);

  const showPulseNote = useCallback((content: string, type: 'error' | 'info' | 'success' = 'info', time = 4) => {
    showNote({ content, time, type });
  }, [showNote]);

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const searchCacheKey = getPulseSearchCacheKey(query);
    const cachedSearch = readPulseJsonCache<PulseSearchResponse>(searchCacheKey);

    const runSearch = async () => {
      if (cachedSearch) {
        setArtists(Array.isArray(cachedSearch.artists) ? cachedSearch.artists : []);
        setPlaylists(Array.isArray(cachedSearch.playlists) ? cachedSearch.playlists : []);
        setTracks(Array.isArray(cachedSearch.tracks) ? cachedSearch.tracks : []);
        setLoading(false);
      } else {
        setArtists([]);
        setPlaylists([]);
        setTracks([]);
        setLoading(true);
      }

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
        const nextSearchResult: PulseSearchResponse = {
          artists: Array.isArray(searchResult.value.artists) ? searchResult.value.artists : [],
          playlists: Array.isArray(searchResult.value.playlists) ? searchResult.value.playlists : [],
          tracks: Array.isArray(searchResult.value.tracks) ? searchResult.value.tracks : [],
        };
        writePulseJsonCache(searchCacheKey, nextSearchResult);
        setArtists(nextSearchResult.artists ?? []);
        setPlaylists(nextSearchResult.playlists ?? []);
        setTracks(nextSearchResult.tracks ?? []);
      } else {
        if (!cachedSearch) {
          setArtists([]);
          setPlaylists([]);
          setTracks([]);
        }
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
      showPulseNote(lang?.logintoaddfavorites || 'Войдите, чтобы добавлять треки в избранное', 'info');
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
        showPulseNote(result === 'CREATED_ADDED' ? (lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!') : (lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!'), 'success');
        return;
      }

      if (result === 'REMOVED') {
        setFavoriteIds((ids) => {
          const nextIds = ids.filter((id) => id !== trackId);
          writePulseJsonCache(FAVORITES_CACHE_KEY, nextIds);
          return nextIds;
        });
        showPulseNote(lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', 'success');
        return;
      }

      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    } catch {
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    }
  }, [isAuthenticated, lang, showPulseNote]);

  const copyTrackLink = useCallback(async (trackId: number | string, track?: PulseTrack) => {
    const resolvedTrackId = toNumber(trackId);
    if (!resolvedTrackId) return;

    setShareUrl(getExternalPulseUrl(`/pulse/track/${resolvedTrackId}`));
    if (track) {
      setShareAttachment({
        widgets: [{ type: 'music', track_id: resolvedTrackId.toString() }],
        preview: {
          authorName: decodeHtmlEntities(track.artist) || lang?.artist || 'Исполнитель',
          authorImg: getImageUrl(getTrackArtwork(track), '/img/noimg.png'),
          contentSnippet: decodeHtmlEntities(track.title) || lang?.untitled || 'Без названия',
        }
      });
    } else {
      setShareAttachment(null);
    }
    setIsShareModalOpen(true);
  }, [lang]);

  const openAddTrackToPlaylist = useCallback((trackId: number | string) => {
    if (!isAuthenticated) {
      showPulseNote(lang?.logintoaddtoplaylists || 'Войдите, чтобы добавлять треки в плейлисты', 'info');
      return;
    }

    openAddToPlaylist(trackId);
  }, [isAuthenticated, openAddToPlaylist, showPulseNote]);

  const refreshSearchAfterMutation = useCallback(() => {
    writePulseJsonCache(getPulseSearchCacheKey(query), {
      artists,
      playlists,
      tracks,
    });
    setSearchReloadToken((token) => token + 1);
  }, [artists, playlists, query, tracks]);

  const reportTrack = useCallback((track: PulseTrack) => {
    if (!isAuthenticated) {
      showPulseNote(lang?.logintoreport || 'Войдите, чтобы отправить жалобу', 'info');
      return;
    }

    const trackId = toNumber(track.sid);
    if (!trackId) return;

    setReportTrackTarget(track);
    setIsReportModalOpen(true);
  }, [isAuthenticated, showPulseNote]);

  const handleTrackReport = useCallback(async (reason: string) => {
    if (!reportTrackTarget) return;

    const trackId = toNumber(reportTrackTarget.sid);
    if (!trackId) return;

    setIsReportModalOpen(false);
    try {
      const result = await AncialAPI.reportAction<{ message?: string }>({
        comment: reason,
        id: trackId,
        type: 6,
      });
      setReportTrackTarget(null);
      showPulseNote(result?.message || lang?.reportsended || 'Жалоба отправлена', 'success');
    } catch {
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    }
  }, [lang, reportTrackTarget, showPulseNote]);

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
    <div className={cn("relative isolate flex flex-col items-center justify-center gap-3 pb-64 transition-colors duration-1000 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-transparent before:via-black before:to-black lg:before:from-black", getPulseBackgroundColorByMood(currentTrackObj?.mood))}>
      <PulseHeader
        isAuthenticated={isAuthenticated}
        lang={lang}
        onLogoClick={() => router.push('/pulse')}
        onOpenMyPulse={() => router.push('/pulse/my')}
        onSubmitSearch={submitSearch}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        placeholder={lang?.pulse_search || 'Поиск'}
        hideProfileOnMobile
      />

      <div className="relative flex flex-col gap-3 items-center w-full max-w-screen-2xl" style={{ zIndex: 19 }}>
        {loading ? (
          <div className="flex flex-col gap-3 px-3 lg:px-0 animate-pulse w-full">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl w-full">
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-zinc-800" />
                <div className="flex flex-grow flex-col gap-2 w-full">
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
                  onReportTrack={reportTrack}
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
        onCopied={() => showPulseNote(lang?.linkcopied || 'Ссылка скопирована', 'success', 3)}
        onCopyFailed={() => showPulseNote(shareUrl, 'info', 5)}
        shareUrl={shareUrl}
        title={lang?.share || 'Поделиться'}
        attachmentWidgets={shareAttachment?.widgets}
        attachmentPreview={shareAttachment?.preview}
      />
      <PulseReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportTrackTarget(null);
        }}
        onSelectReason={handleTrackReport}
        title={lang?.report || 'Пожаловаться'}
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
