'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import ShareModal from '../../../components/share-modal';
import { useAuth, type User } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { usePulsePlayer } from '../../../context/PulsePlayerContext';
import { AncialAPI } from '../../../lib/api-v2';
import { SITE_CONFIG } from '../../../seo';
import PulseUploadTrackModal, { PulseDeleteTrackModal } from '../../pulse-upload-track-modal';
import { getPulsePlaylistTracksCacheKey } from '../../playlist/playlist-model';
import { readPulseJsonCache, removePulseCache, writePulseJsonCache } from '../../pulse-cache';
import {
  ActionIcon,
  DEFAULT_TRACK_IMAGE,
  PulseEmptyState,
  PulseLegalFooter,
  PulsePageHeader,
  PulsePlaylistTile,
  PulsePlaylistTileSkeleton,
  PulseReportModal,
  PulseSectionTitle,
  PulseTrackRow,
  TracksPanelSkeleton,
  cn,
  decodeHtmlEntities,
  getImageUrl,
  normalizeText,
  toNumber,
  type PulsePlaylistCardData,
  type PulseTrack,
} from '../../pulse-components';

type PulseArtistOwner = Pick<User, 'fname' | 'img' | 'lname' | 'username'>;

type PulseArtist = {
  desk?: string | null;
  id?: number | string | null;
  img?: string | null;
  listens?: number | string | null;
  name?: string | null;
  owner?: PulseArtistOwner | null;
  verify?: number | string | null;
};

type PulseArtistResponse = {
  artist?: PulseArtist | null;
};

type PulseArtistPlaylistsResponse = {
  playlists?: PulsePlaylistCardData[] | null;
};

type PulseArtistTracksResponse = {
  popular_tracks?: PulseTrack[] | null;
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

function readFavoriteIds() {
  return (readPulseJsonCache<number[]>(FAVORITES_CACHE_KEY) ?? []).map((id) => toNumber(id)).filter(Boolean);
}

function writeFavoriteIds(ids: number[]) {
  writePulseJsonCache(FAVORITES_CACHE_KEY, ids);
}

function getExternalPulseUrl(path: string) {
  return `${SITE_CONFIG.url}${path}`;
}

export default function PulseArtistContent({ artistId }: { artistId: string }) {
  const router = useRouter();
  const { isAuthenticated, lang, user } = useAuth();
  const { showNote } = useNotification();
  const {
    currentCollectionId,
    currentSongId,
    isPlaying,
    openAddToPlaylist,
    playArtistPlaylist,
    playGenlist,
    playNextTrack,
    playPlaylist,
    togglePlay,
  } = usePulsePlayer();

  const cacheId = normalizeText(artistId) || '0';
  const artistTracksCacheKey = getPulsePlaylistTracksCacheKey(cacheId, { genlist: '', type: '5' }, cacheId);
  const cachedTracks = readPulseJsonCache<PulseTrack[]>(artistTracksCacheKey) ?? [];
  const [artist, setArtist] = useState<PulseArtist | null>(() => readPulseJsonCache<PulseArtistResponse>(`artist_${cacheId}`)?.artist ?? null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => readFavoriteIds());
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareAttachment, setShareAttachment] = useState<{
    widgets: any[];
    preview: { authorName: string; authorImg: string; contentSnippet: string; firstImage?: string };
  } | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<PulseTrack | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<PulseTrack | null>(null);
  const [reportTrackTarget, setReportTrackTarget] = useState<PulseTrack | null>(null);
  const [tracksReloadToken, setTracksReloadToken] = useState(0);
  const [loadingArtist, setLoadingArtist] = useState(!artist);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(!cachedTracks.length);
  const [playlists, setPlaylists] = useState<PulsePlaylistCardData[]>(() => readPulseJsonCache<PulseArtistPlaylistsResponse>(`artist_playlists_${cacheId}`)?.playlists ?? []);
  const [shareUrl, setShareUrl] = useState('');
  const [tracks, setTracks] = useState<PulseTrack[]>(cachedTracks);

  const userCountry = useMemo(() => {
    const nextCountry = normalizeText(
      typeof window !== 'undefined'
        ? String((window as Window & { userCountry?: string }).userCountry ?? user?.country ?? '')
        : String(user?.country ?? ''),
    );

    return nextCountry || 'RU';
  }, [user?.country]);

  const artistName = decodeHtmlEntities(artist?.name) || (lang?.artist || 'Артист');
  const artistDescription = decodeHtmlEntities(artist?.desk);
  const artistImage = getImageUrl(artist?.img, DEFAULT_TRACK_IMAGE);
  const listensTotal = useMemo(() => tracks.reduce((sum, track) => sum + toNumber(track.listens), 0), [tracks]);
  const verifyStatus = String(artist?.verify ?? '');
  const owner = artist?.owner ?? null;

  const showPulseNote = useCallback((content: string, type: 'error' | 'info' | 'success' = 'info') => {
    showNote({ content, time: 4, type });
  }, [showNote]);

  useEffect(() => {
    let cancelled = false;

    void AncialAPI.pulseGetArtist<PulseArtistResponse & PulseArtistPlaylistsResponse & PulseArtistTracksResponse>(cacheId)
      .then((result) => {
        if (cancelled) return;

        if (result.artist) {
          writePulseJsonCache(`artist_${cacheId}`, { artist: result.artist });
          setArtist(result.artist);
        } else {
          setArtist(null);
        }
        
        const nextPlaylists = Array.isArray(result.playlists) ? result.playlists : [];
        if (nextPlaylists.length) {
          writePulseJsonCache(`artist_playlists_${cacheId}`, { playlists: nextPlaylists });
        }
        setPlaylists(nextPlaylists);

        const nextTracks = Array.isArray(result.popular_tracks) ? result.popular_tracks : [];
        if (nextTracks.length) {
          writePulseJsonCache(artistTracksCacheKey, nextTracks);
        }
        setTracks(nextTracks);
        setLoadingTracks(false);
      })
      .catch(() => {
        if (!cancelled) {
          setArtist(null);
          setPlaylists([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingArtist(false);
          setLoadingPlaylists(false);
        }
      });

    void AncialAPI.pulseGetLibrary<{ ids?: Array<number | string> }>('favorites')
      .then((favoritesResult) => {
        if (cancelled) return;

        const nextIds = Array.isArray(favoritesResult.ids)
          ? favoritesResult.ids.map((id) => toNumber(id)).filter(Boolean)
          : [];
        writeFavoriteIds(nextIds);
        setFavoriteIds(nextIds);
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, [artistTracksCacheKey, cacheId, tracksReloadToken]);

  const playPlaylistCard = useCallback((card: PulsePlaylistCardData) => {
    const playableId = getCardPlayableId(card);
    if (!playableId) return;

    if (isGenlistPlaylist(card)) {
      void playGenlist(playableId);
      return;
    }

    void playPlaylist(playableId);
  }, [playGenlist, playPlaylist]);

  const openPlaylistCard = useCallback((card: PulsePlaylistCardData) => {
    const id = normalizeText(String(card.id ?? '0')) || '0';
    router.push(`/pulse/playlist/${encodeURIComponent(id)}`);
  }, [router]);

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
          writeFavoriteIds(nextIds);
          return nextIds;
        });
        showPulseNote(result === 'CREATED_ADDED' ? (lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!') : (lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!'), 'success');
        return;
      }

      if (result === 'REMOVED') {
        setFavoriteIds((ids) => {
          const nextIds = ids.filter((id) => id !== trackId);
          writeFavoriteIds(nextIds);
          return nextIds;
        });
        showPulseNote(lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', 'success');
        return;
      }

      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    } catch {
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    }
  }, [isAuthenticated, lang?.pulse_error_happened, showPulseNote]);

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

  const refreshTracksAfterMutation = useCallback(() => {
    removePulseCache(artistTracksCacheKey);
    setTracksReloadToken((token) => token + 1);
  }, [artistTracksCacheKey]);

  const openEditTrack = useCallback((track: PulseTrack) => {
    setTrackToEdit(track);
  }, []);

  const closeEditTrack = useCallback(() => {
    setTrackToEdit(null);
  }, []);

  const openDeleteTrack = useCallback((track: PulseTrack) => {
    setTrackToDelete(track);
  }, []);

  const missing = !loadingArtist && !artist;
  const artistCollectionActive = currentCollectionId === `artist_${cacheId}` && isPlaying;

  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-pink-500/25 via-black to-black pb-40 duration-300 lg:from-black lg:pb-64">
      <PulsePageHeader onBack={() => router.push('/pulse')} />

      {!missing ? (
        <div className="flex w-full max-w-screen-2xl flex-col items-center justify-center gap-6 px-3 lg:flex-row lg:justify-start lg:px-0">
          <div className="relative flex h-64 w-64 shrink-0 rounded-full border border-zinc-600/30 shadow lg:h-72 lg:w-72">
            {loadingArtist ? (
              <>
                <div className="h-full w-full animate-pulse rounded-full bg-zinc-800 blur-xl" />
                <div className="absolute inset-x-0 h-full w-full animate-pulse rounded-full bg-zinc-800" />
              </>
            ) : (
              <>
                <img className="h-full w-full rounded-full object-cover blur-xl" src={artistImage} alt="" />
                <img className="absolute inset-x-0 z-[9] h-full w-full rounded-full object-cover" src={artistImage} alt={artistName} />
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-start">
            <div className="flex flex-col items-center gap-1.5 text-center lg:items-start lg:text-left">
              {loadingArtist ? (
                <>
                  <div className="h-14 w-64 animate-pulse rounded-2xl bg-zinc-800" />
                  <div className="h-6 w-48 animate-pulse rounded-2xl bg-zinc-800" />
                </>
              ) : (
                <>
                  <h1 className="flex max-w-[92vw] items-center gap-1.5 break-words text-2xl font-black leading-none md:text-4xl lg:max-w-4xl lg:text-7xl">
                    {artistName}
                    {verifyStatus === '0' || verifyStatus === '1' ? (
                      <ActionIcon className={cn('h-5 w-5 md:h-8 md:w-8 lg:h-12 lg:w-12', verifyStatus === '1' ? 'fill-blue-500' : 'fill-amber-500')} name="IC-verify" />
                    ) : null}
                  </h1>
                  {artistDescription ? (
                    <span
                      className="text-base text-zinc-200 md:text-lg lg:text-xl"
                      dangerouslySetInnerHTML={{ __html: artistDescription.replace(/\n/g, '<br>') }}
                    />
                  ) : null}
                  <span className="flex w-full items-center justify-center gap-1 text-zinc-300 lg:justify-start">
                    <ActionIcon className="h-8 w-8 fill-zinc-300" name="IC-speaker" />
                    <span>{loadingTracks ? <ActionIcon className="h-6 w-6 animate-spin fill-purple-500" name="IC-loader" /> : listensTotal}</span>
                    <span className="text-xs text-zinc-400 duration-300 hover:text-lg">за всё время</span>
                  </span>
                  {verifyStatus === '0' ? (
                    <span className="w-fit rounded-box bg-content-100 px-2 py-1 text-xs text-zinc-300 opacity-95 shadow duration-300">
                      <ActionIcon className="inline h-5 w-5 fill-amber-500" name="IC-verify" /> - данные настоящие, но оригинальный владелец не имеет доступа к публикуемым трекам.
                    </span>
                  ) : null}
                  {verifyStatus === '1' && owner ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/@${encodeURIComponent(normalizeText(owner.username) || 'id' + normalizeText(String(artist?.id ?? '')))}`)}
                      className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-zinc-600/30 bg-zinc-800 p-0.5 text-zinc-300 opacity-95 shadow duration-300 hover:bg-zinc-700/80 active:scale-95"
                    >
                      <span className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${getImageUrl(owner.img, DEFAULT_TRACK_IMAGE)})` }} />
                      <span className="text-left text-sm text-zinc-200 lg:text-base">
                        {decodeHtmlEntities(`${owner.fname ?? ''} ${owner.lname ?? ''}`) || (lang?.user || 'Пользователь')} {lang?.manages_page || 'управляет данной страницей'}
                      </span>
                    </button>
                  ) : null}
                </>
              )}
            </div>

            {!loadingArtist && tracks.length ? (
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (artistCollectionActive) {
                      togglePlay();
                    } else {
                      void playArtistPlaylist(cacheId);
                    }
                  }}
                  className={cn('flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95')}
                  aria-label={artistCollectionActive ? 'Pause artist' : 'Play artist'}
                >
                  <ActionIcon className="h-10 w-10" name={artistCollectionActive ? 'IC-pause' : 'IC-play'} />
                </button>
                <button
                  type="button"
                  onClick={() => void playArtistPlaylist(cacheId, true, 1)}
                  className="absolute bottom-0 -right-3 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-lime-500 shadow duration-300 hover:bg-lime-600 active:scale-95"
                  aria-label="Shuffle artist"
                >
                  <svg className="inline h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M8.7,10a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41L3.84,2.29A1,1,0,0,0,2.42,3.71ZM21,14a1,1,0,0,0-1,1v3.59L15.44,14A1,1,0,0,0,14,15.44L18.59,20H15a1,1,0,0,0,0,2h6a1,1,0,0,0,.38-.08,1,1,0,0,0,.54-.54A1,1,0,0,0,22,21V15A1,1,0,0,0,21,14Zm.92-11.38a1,1,0,0,0-.54-.54A1,1,0,0,0,21,2H15a1,1,0,0,0,0,2h3.59L2.29,20.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L20,5.41V9a1,1,0,0,0,2,0V3A1,1,0,0,0,21.92,2.62Z" />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <PulseEmptyState description={lang?.nopostsdesc || 'Артист не найден'} title={lang?.emptytopic || 'Пусто'} />
      )}

      {!missing && (loadingPlaylists || playlists.length > 0) ? (
        <>
          <PulseSectionTitle>{lang?.playlists || 'Плейлисты'}</PulseSectionTitle>
          <div className="viewport dragscroll flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 lg:px-0">
            {loadingPlaylists && !playlists.length ? Array.from({ length: 6 }).map((_, index) => <PulsePlaylistTileSkeleton key={index} />) : null}
            {playlists.map((card) => {
              const playableId = getCardPlayableId(card);
              return (
                <PulsePlaylistTile
                  card={card}
                  isPlaying={Boolean(playableId && currentCollectionId === playableId && isPlaying)}
                  key={`artist-playlist-${card.id ?? card.genlist ?? card.name}`}
                  onOpen={() => openPlaylistCard(card)}
                  onPlay={() => playPlaylistCard(card)}
                />
              );
            })}
          </div>
        </>
      ) : null}

      {!missing ? (
        <>
          <PulseSectionTitle>{lang?.tracks || 'Треки'}</PulseSectionTitle>
          <div className="w-full max-w-screen-2xl rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
            {loadingTracks ? <TracksPanelSkeleton rows={6} /> : null}
            {!loadingTracks && tracks.length ? (
              <div className="flex flex-col gap-3">
                {tracks.map((track, index) => (
                  <PulseTrackRow
                    currentSongId={currentSongId}
                    favoriteIds={favoriteIds}
                    isAuthenticated={isAuthenticated}
                    key={`artist-track-${track.sid ?? index}`}
                    onAddToPlaylist={openAddTrackToPlaylist}
                    onCopyTrackLink={copyTrackLink}
                    onDeleteTrack={openDeleteTrack}
                    onEditTrack={openEditTrack}
                    onLikeTrack={likeTrack}
                    onOpenArtist={(nextArtistId) => router.push(`/pulse/artist/${encodeURIComponent(nextArtistId)}`)}
                    onPlayTrack={(nextTrack, nextIndex) => {
                      void playArtistPlaylist(cacheId, true, 0, nextIndex, nextTrack.sid);
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
            ) : null}
            {!loadingTracks && !tracks.length ? (
              <PulseEmptyState description={lang?.hope_not_long || 'Надеемся, что это не на долго'} title={lang?.empty_here || 'Здесь пока пусто'} />
            ) : null}
          </div>
        </>
      ) : null}

      <PulseLegalFooter className="mt-3" />

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
        onUploaded={refreshTracksAfterMutation}
        showNote={showPulseNote}
        track={trackToEdit}
      />
      <PulseDeleteTrackModal
        isOpen={Boolean(trackToDelete)}
        onClose={() => setTrackToDelete(null)}
        onDeleted={refreshTracksAfterMutation}
        showNote={showPulseNote}
        track={trackToDelete}
      />
    </div>
  );
}
