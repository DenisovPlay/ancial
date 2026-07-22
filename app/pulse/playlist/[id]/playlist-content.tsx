'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import ShareModal from '../../../components/share-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { usePulsePlayer } from '../../../context/PulsePlayerContext';
import { AncialAPI } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache.ts';
import { SITE_CONFIG } from '../../../seo';
import { readPulseJsonCache, removePulseCache, writePulseJsonCache } from '../../pulse-cache';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../../pulse-image';
import PulsePlaylistEditorModal from '../../pulse-playlist-editor-modal';
import {
  ActionIcon,
  DEFAULT_TRACK_IMAGE,
  PulseLegalFooter,
  PulseLogo,
  PulseReportModal,
  PulseTrackRow,
  TracksPanelSkeleton,
  cn,
  decodeHtmlEntities,
  getImageUrl,
  getTrackArtwork,
  normalizeText,
  toNumber,
  type PulseTrack,
} from '../../pulse-components';
import PulseUploadTrackModal, { PulseDeleteTrackModal } from '../../pulse-upload-track-modal';
import {
  canUploadToPulseFavoritesPlaylist,
  canViewPulsePlaylist,
  getPulseBuiltinPlaylistCover,
  getPulseBuiltinPlaylistMeta,
  getPulseBuiltinPlaylistTitle,
  getPulsePlaylistActionTarget,
  getPulsePlaylistCacheKey,
  getPulsePlaylistListenTotal,
  getPulsePlaylistTracksCacheKey,
  isPulseBuiltinGeneratedPlaylist,
  normalizePulsePlaylistId,
  getPulsePlaylistTrackParams,
  type PulsePlaylistMeta,
} from '../playlist-model';

type PlaylistPageResponse = {
  is_liked?: boolean;
  playlist?: PulsePlaylistMeta | null;
};

const FAVORITES_CACHE_KEY = 'pulse_fav_ids';
const FALLBACK_PLAYLIST_NAME = 'Неизвестный плейлист';

function readFavoriteIds() {
  const parsed = cache.get<unknown>(FAVORITES_CACHE_KEY, { category: 'pulse', subcategory: 'favorites' });
  return Array.isArray(parsed) ? parsed.map((id) => toNumber(id)).filter(Boolean) : [];
}

function writeFavoriteIds(ids: number[]) {
  cache.set(FAVORITES_CACHE_KEY, ids, { category: 'pulse', subcategory: 'favorites' });
}

function getPlaylistCover(playlistId: string, playlist: PulsePlaylistMeta | null, tracks: PulseTrack[]) {
  const fallbackCover = getPulseBuiltinPlaylistCover(playlistId)
    || (tracks[0] ? getTrackArtwork(tracks[0]) : DEFAULT_TRACK_IMAGE);

  return getImageUrl(playlist?.img, fallbackCover);
}

function getPlaylistTitle(playlistId: string, playlist: PulsePlaylistMeta | null, tracks: PulseTrack[], lang: any) {
  return decodeHtmlEntities(playlist?.name)
    || getPulseBuiltinPlaylistTitle(playlistId, lang)
    || decodeHtmlEntities(tracks[0]?.album)
    || (lang?.unknown_playlist || FALLBACK_PLAYLIST_NAME);
}

function getExternalPulseUrl(path: string) {
  return `${SITE_CONFIG.url}${path}`;
}

export default function PulsePlaylistContent({ playlistId: rawPlaylistId }: { playlistId: string }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();
  const {
    currentCollectionId,
    currentSongId,
    isPlaying,
    openAddToPlaylist,
    playGenlist,
    playNextTrack,
    playPlaylist,
  } = usePulsePlayer();

  const playlistId = useMemo(() => normalizePulsePlaylistId(rawPlaylistId), [rawPlaylistId]);
  const isBuiltinPlaylist = useMemo(() => isPulseBuiltinGeneratedPlaylist(playlistId), [playlistId]);
  const builtinPlaylist = useMemo(() => getPulseBuiltinPlaylistMeta(playlistId), [playlistId]);
  const cachedPlaylistResponse = useMemo(() => readPulseJsonCache<PlaylistPageResponse>(getPulsePlaylistCacheKey(playlistId)), [playlistId]);
  const cachedPlaylist = cachedPlaylistResponse?.playlist ?? builtinPlaylist;
  const cachedTracks = useMemo(
    () => readPulseJsonCache<PulseTrack[]>(getPulsePlaylistTracksCacheKey(playlistId, cachedPlaylist)) ?? [],
    [cachedPlaylist, playlistId],
  );

  const [playlist, setPlaylist] = useState<PulsePlaylistMeta | null>(cachedPlaylist);
  const [playlistLiked, setPlaylistLiked] = useState(Boolean(cachedPlaylistResponse?.is_liked));
  const [tracks, setTracks] = useState<PulseTrack[]>(cachedTracks);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => readFavoriteIds());
  const [metaLoading, setMetaLoading] = useState(!cachedPlaylist && !isBuiltinPlaylist);
  const [tracksLoading, setTracksLoading] = useState(!cachedTracks.length);
  const [error, setError] = useState('');
  const [isPlaylistEditorOpen, setIsPlaylistEditorOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUploadTrackModalOpen, setIsUploadTrackModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareAttachment, setShareAttachment] = useState<{
    widgets: any[];
    preview: { authorName: string; authorImg: string; contentSnippet: string; firstImage?: string };
  } | null>(null);
  const [reportTrackTarget, setReportTrackTarget] = useState<PulseTrack | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<PulseTrack | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<PulseTrack | null>(null);
  const [tracksReloadToken, setTracksReloadToken] = useState(0);

  const userCountry = useMemo(() => {
    const nextCountry = normalizeText(
      typeof window !== 'undefined'
        ? String((window as Window & { userCountry?: string }).userCountry ?? user?.country ?? '')
        : String(user?.country ?? ''),
    );

    return nextCountry || 'RU';
  }, [user?.country]);

  const playlistType = toNumber(playlist?.type);
  const playlistPlayTarget = getPulsePlaylistActionTarget(playlistId, playlist);
  const playlistActive = currentCollectionId === playlistPlayTarget.id && isPlaying;
  const playlistTitle = getPlaylistTitle(playlistId, playlist, tracks, lang);
  const playlistArtist = decodeHtmlEntities(playlist?.artist);
  const playlistCover = getPlaylistCover(playlistId, playlist, tracks);
  const playlistDescription = decodeHtmlEntities(playlist?.desk);
  const playlistLikes = normalizeText(String(playlist?.likes ?? '0')) || '0';
  const canUploadTrack = canUploadToPulseFavoritesPlaylist(playlistId, playlist);
  const listensTotal = useMemo(() => getPulsePlaylistListenTotal(tracks), [tracks]);

  const showPulseNote = useCallback((content: string, type: 'error' | 'info' | 'success' = 'info', time = 4) => {
    showNote({
      content,
      time,
      type,
    });
  }, [showNote]);

  const updateFavoriteIds = useCallback((updater: (ids: number[]) => number[]) => {
    setFavoriteIds((currentIds) => {
      const nextIds = updater(currentIds);
      writeFavoriteIds(nextIds);
      if (typeof window !== 'undefined') {
        window._pulseLikedSongs = nextIds;
        window.dispatchEvent(new CustomEvent('pulse-likes-updated', { detail: nextIds }));
      }
      return nextIds;
    });
  }, []);

  useEffect(() => {
    const handleLikesUpdated = (e: CustomEvent) => {
      setFavoriteIds(e.detail);
      if (window._pagePlaylistConf?.type === 3) {
        setTracksReloadToken((t) => t + 1);
      }
    };
    window.addEventListener('pulse-likes-updated', handleLikesUpdated as EventListener);

    if (typeof window !== 'undefined' && Array.isArray(window._pulseLikedSongs)) {
      setFavoriteIds(window._pulseLikedSongs);
    }

    return () => window.removeEventListener('pulse-likes-updated', handleLikesUpdated as EventListener);
  }, []);

  useEffect(() => {
    window._pagePlaylistConf = {
      id: playlistId,
      type: Number(playlist?.type ?? 0),
    };

    return () => {
      window._pagePlaylistConf = null;
    };
  }, [playlist?.type, playlistId]);

  useEffect(() => {
    if (!authLoading && playlistId === '-5' && !isAuthenticated) {
      router.replace(`/login?backurl=/pulse/playlist/${encodeURIComponent(playlistId)}`);
    }
  }, [authLoading, isAuthenticated, playlistId, router]);

  useEffect(() => {
    let cancelled = false;

    if (isBuiltinPlaylist && playlistId === '-5' && !isAuthenticated) {
      return () => {
        cancelled = true;
      };
    }

    void AncialAPI.pulseGetPlaylistMeta<PlaylistPageResponse>(playlistId)
      .then((result) => {
        if (cancelled) return;

        const nextPlaylist = result.playlist ?? builtinPlaylist;
        setPlaylist(nextPlaylist);
        setPlaylistLiked(Boolean(result.is_liked));

        if (nextPlaylist) {
          writePulseJsonCache(getPulsePlaylistCacheKey(playlistId), {
            ...result,
            playlist: nextPlaylist,
          });
        } else {
          removePulseCache(getPulsePlaylistCacheKey(playlistId));
        }

        if (!authLoading && nextPlaylist && !canViewPulsePlaylist(nextPlaylist, isAuthenticated)) {
          router.replace(`/login?backurl=/pulse/playlist/${encodeURIComponent(playlistId)}`);
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (cachedPlaylist) {
            setPlaylist(cachedPlaylist);
          } else if (builtinPlaylist) {
            setPlaylist(builtinPlaylist);
          } else {
            setPlaylist(null);
            setError(lang?.somethingwrong || 'Произошла ошибка =(');
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMetaLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, builtinPlaylist, cachedPlaylist, isAuthenticated, isBuiltinPlaylist, lang?.somethingwrong, playlistId, router]);

  useEffect(() => {
    let cancelled = false;

    if (!playlist && !isBuiltinPlaylist) {
      return () => {
        cancelled = true;
      };
    }

    const tracksCacheKey = getPulsePlaylistTracksCacheKey(playlistId, playlist);

    void AncialAPI.pulseGetPlaylist<PulseTrack[]>(getPulsePlaylistTrackParams(playlistId, playlist))
      .then((result) => {
        if (!cancelled) {
          const nextTracks = Array.isArray(result) ? result : [];
          setTracks(nextTracks);
          writePulseJsonCache(tracksCacheKey, nextTracks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (cachedTracks && cachedTracks.length > 0) {
            setTracks(cachedTracks);
          } else {
            setError(lang?.somethingwrong || 'Произошла ошибка =(');
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTracksLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isBuiltinPlaylist, lang?.somethingwrong, playlist, playlistId, tracksReloadToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    void AncialAPI.pulseGetLibrary<{ ids?: Array<number | string> }>('favorites')
      .then((result) => {
        if (cancelled) return;

        const nextIds = Array.isArray(result.ids)
          ? result.ids.map((id) => toNumber(id)).filter(Boolean)
          : [];

        writeFavoriteIds(nextIds);
        setFavoriteIds(nextIds);
      })
      .catch(() => {
        if (!cancelled) {
          setFavoriteIds(readFavoriteIds());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const playPlaylistFromStart = useCallback(() => {
    const target = getPulsePlaylistActionTarget(playlistId, playlist);

    if (target.kind === 'genlist') {
      void playGenlist(target.id, target.forceReload, target.shuffle);
      return;
    }

    void playPlaylist(target.id, target.forceReload, target.shuffle);
  }, [playGenlist, playPlaylist, playlist, playlistId]);

  const shufflePlaylist = useCallback(() => {
    const target = getPulsePlaylistActionTarget(playlistId, playlist, { shuffle: true });

    if (target.kind === 'genlist') {
      void playGenlist(target.id, target.forceReload, target.shuffle);
      return;
    }

    void playPlaylist(target.id, target.forceReload, target.shuffle);
  }, [playGenlist, playPlaylist, playlist, playlistId]);

  const playTrackAtIndex = useCallback((track: PulseTrack, index: number) => {
    const target = getPulsePlaylistActionTarget(playlistId, playlist);

    if (target.kind === 'genlist') {
      void playGenlist(target.id, true, 0, index, track.sid);
      return;
    }

    void playPlaylist(target.id, true, 0, index, track.sid);
  }, [playGenlist, playPlaylist, playlist, playlistId]);

  const showSoon = useCallback(() => {
    const legacyWindow = window as Window & { toast?: (message: string) => void };

    if (typeof legacyWindow.toast === 'function') {
      legacyWindow.toast(lang?.coming_soon || 'Скоро!');
      return;
    }

    showPulseNote(lang?.coming_soon || 'Скоро!', 'info');
  }, [lang, showPulseNote]);

  const openPlaylistEditor = useCallback(() => {
    setIsPlaylistEditorOpen(true);
  }, []);

  const handlePlaylistSaved = useCallback((nextPlaylist: { img?: string | null; name: string }) => {
    removePulseCache(getPulsePlaylistCacheKey(playlistId), 'pulse_library', 'pulse_library_big');
    setPlaylist((currentPlaylist) => currentPlaylist
      ? {
        ...currentPlaylist,
        img: nextPlaylist.img ?? currentPlaylist.img,
        name: nextPlaylist.name,
      }
      : currentPlaylist);
  }, [playlistId]);

  const openUploadTrack = useCallback(() => {
    if (!isAuthenticated) {
      showPulseNote(lang?.logintouploadtrack || 'Войдите, чтобы загрузить трек', 'info');
      return;
    }

    setIsUploadTrackModalOpen(true);
  }, [isAuthenticated, showPulseNote]);

  const closeTrackEditor = useCallback(() => {
    setIsUploadTrackModalOpen(false);
    setTrackToEdit(null);
  }, []);

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
        updateFavoriteIds((ids) => (ids.includes(trackId) ? ids : [...ids, trackId]));
        showPulseNote(
          result === 'CREATED_ADDED'
            ? lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!'
            : lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!',
          'success',
        );
        return;
      }

      if (result === 'REMOVED') {
        updateFavoriteIds((ids) => ids.filter((id) => id !== trackId));
        showPulseNote(lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', 'success');
        return;
      }

      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    } catch {
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    }
  }, [isAuthenticated, lang, playlist, showPulseNote, updateFavoriteIds]);

  const togglePlaylistLike = useCallback(async () => {
    if (!isAuthenticated) {
      showPulseNote(lang?.logintoaddplaylist || 'Войдите, чтобы добавить плейлист в избранное', 'info');
      return;
    }

    try {
      const action = playlistLiked ? 'unlike' : 'like';
      const response = await AncialAPI.pulsePlaylistAction<{ message?: string; likes?: number }>(action, { id: playlistId });

      const liked = action === 'like';
      setPlaylistLiked(liked);
      setPlaylist((currentPlaylist) => {
        if (!currentPlaylist) return currentPlaylist;

        return {
          ...currentPlaylist,
          likes: response.likes !== undefined ? String(response.likes) : String(Math.max(0, toNumber(currentPlaylist.likes) + (liked ? 1 : -1))),
        };
      });
      showPulseNote(liked ? (lang?.playlistadded || 'Плейлист добавлен') : (lang?.playlistremoved || 'Плейлист удалён'), 'success');
    } catch {
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    }
  }, [isAuthenticated, lang?.pulse_error_happened, playlistId, playlistLiked, showPulseNote]);

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

  const openArtistPage = useCallback((artistId: string) => {
    router.push(`/pulse/artist/${encodeURIComponent(artistId)}`);
  }, [router]);

  const refreshAfterUpload = useCallback(() => {
    const target = getPulsePlaylistActionTarget(playlistId, playlist);
    const cacheKeys = [
      FAVORITES_CACHE_KEY,
      'pulse_library',
      'pulse_library_big',
      'playlist_tracks_gid_Your',
      `playlist_tracks_${playlistId}`,
    ];

    if (target.kind === 'genlist') {
      cacheKeys.push(`playlist_tracks_gid_${target.id}`);
    }

    removePulseCache(...cacheKeys);
    setTracksReloadToken((token) => token + 1);

    void AncialAPI.pulseGetLibrary<{ ids?: Array<number | string> }>('favorites')
      .then((result) => {
        const nextIds = Array.isArray(result.ids)
          ? result.ids.map((id) => toNumber(id)).filter(Boolean)
          : [];
        writeFavoriteIds(nextIds);
        setFavoriteIds(nextIds);
      })
      .catch(() => { });
  }, [playlist, playlistId]);

  const queueTrackNext = useCallback(async (trackId: number | string) => {
    await playNextTrack(trackId);
  }, [playNextTrack]);

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

  const openEditTrack = useCallback((track: PulseTrack) => {
    setTrackToEdit(track);
  }, []);

  const openDeleteTrack = useCallback((track: PulseTrack) => {
    setTrackToDelete(track);
  }, []);

  const isMetaLoading = isBuiltinPlaylist ? false : metaLoading;
  const isMissing = !isMetaLoading && !playlist && !isBuiltinPlaylist;
  const isLoading = isMetaLoading || tracksLoading || authLoading;

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-0 duration-300 lg:pb-64">
      <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
        <div className="w-full max-w-screen-2xl px-3 lg:px-0">
          <button
            type="button"
            onClick={() => router.push('/pulse')}
            className="flex w-fit cursor-pointer items-center gap-3 duration-300 hover:opacity-80 active:scale-95"
          >
            <ActionIcon className="h-8 w-8" name="IC-chevron-left" />
            <PulseLogo className="w-32 sm:w-48" />
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-3">
        <div className="sticky top-14 flex w-full max-w-screen-2xl flex-col items-center justify-center gap-6 sm:top-16 lg:static lg:top-0 lg:flex-row lg:justify-start">
          <div className="relative flex h-72 w-72 shrink-0 rounded-3xl shadow lg:h-96 lg:w-96">
            {isLoading ? (
              <>
                <div className="h-full w-full animate-pulse rounded-2xl bg-zinc-800 blur-xl" />
                <div className="absolute inset-x-0 h-full w-full animate-pulse rounded-2xl bg-zinc-800" />
              </>
            ) : (
              <>
                <PulseCoverImage
                  alt=""
                  className="rounded-2xl opacity-80 blur-xl"
                  sizes={PULSE_COVER_IMAGE_SIZES.hero}
                  src={playlistCover}
                />
                <PulseCoverImage
                  alt={playlistTitle}
                  className="z-[9] rounded-2xl"
                  sizes={PULSE_COVER_IMAGE_SIZES.hero}
                  src={playlistCover}
                />
                {playlistType === 4 ? (
                  <span className="absolute -bottom-1.5 -right-1.5 z-[99] rounded-full border border-zinc-600/30 bg-pink-500/50 px-1 text-sm text-white backdrop-blur-sm backdrop-saturate-200">
                    ГенЛист
                  </span>
                ) : null}
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-start">
            {isLoading ? (
              <>
                <div className="flex flex-col gap-1.5 text-center lg:text-left">
                  <h1 className="flex h-14 w-64 animate-pulse flex-col rounded-2xl bg-zinc-800 text-2xl font-black md:text-4xl lg:text-7xl" />
                  <span className="flex w-full items-center justify-center gap-1 text-zinc-300 lg:justify-start">
                    <span className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
                    <span className="flex h-8 w-14 animate-pulse flex-col rounded-2xl bg-zinc-800 text-2xl font-black md:text-4xl lg:text-7xl" />
                  </span>
                </div>
                <div className="grid w-fit grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <span key={index} className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 text-center lg:text-left">
                  <h1 className="flex max-w-[92vw] flex-col break-words text-2xl font-black leading-none md:text-4xl lg:max-w-4xl lg:text-7xl">
                    {playlistTitle}
                    <span className="text-sm font-thin text-content-600 lg:text-lg">{playlistArtist}</span>
                  </h1>
                  {playlistDescription ? (
                    <span className="text-base text-zinc-200 md:text-lg lg:text-xl">{playlistDescription}</span>
                  ) : null}
                  {playlistType !== 3 ? (
                    <span className="flex w-full items-center justify-center gap-1 text-zinc-300 lg:justify-start">
                      <ActionIcon className="h-8 w-8 fill-zinc-300" name="IC-speaker" />
                      <span>{tracksLoading ? <ActionIcon className="h-6 w-6 animate-spin fill-purple-500" name="IC-loader" /> : listensTotal}</span>
                    </span>
                  ) : null}
                </div>

                <div className="grid w-fit grid-cols-3 gap-6">
                  <div className="flex flex-col items-center justify-center">
                    {playlistType === 2 ? (
                      <>
                        <button
                          type="button"
                          onClick={openPlaylistEditor}
                          className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 shadow duration-300 hover:bg-zinc-700 active:scale-95"
                        >
                          <ActionIcon className="h-10 w-10" name="IC-edit" />
                        </button>
                        <span className="text-sm text-content-500">{lang?.edit || 'Изменить'}</span>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={showSoon}
                          className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 shadow duration-300 hover:bg-zinc-700 active:scale-95"
                        >
                          <ActionIcon className="h-10 w-10" name="IC-download" />
                        </button>
                        <span className="text-sm text-content-500">{lang?.download || 'Скачать'}</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="relative flex items-center justify-center">
                      <button
                        type="button"
                        onClick={playPlaylistFromStart}
                        className={cn('flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95', `playbuttonSVG${playlistPlayTarget.id}`)}
                        aria-label={playlistActive ? 'Pause playlist' : 'Play playlist'}
                      >
                        <ActionIcon className="h-10 w-10" name={playlistActive ? 'IC-pause' : 'IC-play'} />
                      </button>
                      <button
                        type="button"
                        onClick={shufflePlaylist}
                        className={cn('absolute bottom-0 -right-3 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-lime-500 shadow duration-300 hover:bg-lime-600 active:scale-95', `shufflebuttonSVG${playlistPlayTarget.id}`)}
                        aria-label="Shuffle playlist"
                      >
                        <svg className="inline h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path d="M8.7,10a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41L3.84,2.29A1,1,0,0,0,2.42,3.71ZM21,14a1,1,0,0,0-1,1v3.59L15.44,14A1,1,0,0,0,14,15.44L18.59,20H15a1,1,0,0,0,0,2h6a1,1,0,0,0,.38-.08,1,1,0,0,0,.54-.54A1,1,0,0,0,22,21V15A1,1,0,0,0,21,14Zm.92-11.38a1,1,0,0,0-.54-.54A1,1,0,0,0,21,2H15a1,1,0,0,0,0,2h3.59L2.29,20.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L20,5.41V9a1,1,0,0,0,2,0V3A1,1,0,0,0,21.92,2.62Z" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-sm text-content-500">{lang?.listen || 'Слушать'}</span>
                  </div>

                  {canUploadTrack ? (
                    <div className="flex flex-col items-center justify-center">
                      <button
                        type="button"
                        onClick={openUploadTrack}
                        className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 shadow duration-300 hover:bg-zinc-700 active:scale-95"
                      >
                        <ActionIcon className="h-10 w-10 rotate-180" name="IC-plus" />
                      </button>
                      <span className="text-sm text-content-500">{lang?.addtrack || 'Добавить'}</span>
                    </div>
                  ) : playlistType === 2 ? (
                    <div className="flex flex-col items-center justify-center">
                      <button
                        type="button"
                        disabled
                        className="flex h-16 w-16 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 opacity-30 shadow"
                      >
                        <ActionIcon className="h-10 w-10" name="IC-heart" />
                      </button>
                      <span className="text-sm text-content-500">{playlistLikes}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <button
                        type="button"
                        disabled={!isAuthenticated}
                        onClick={() => void togglePlaylistLike()}
                        className={cn(
                          'flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 shadow duration-300',
                          isAuthenticated ? 'cursor-pointer hover:bg-zinc-700 active:scale-95' : 'cursor-not-allowed opacity-30',
                        )}
                      >
                        <ActionIcon className="h-10 w-10" name={playlistLiked ? 'IC-heart-filled' : 'IC-heart'} />
                      </button>
                      <span className="text-sm text-content-500">{playlistLikes}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative z-[19] h-full w-full max-w-screen-2xl rounded-3xl rounded-b-none border border-zinc-600/30 bg-zinc-900 duration-300 lg:rounded-b-3xl">
          <div className="flex h-full w-full max-w-screen-2xl flex-col gap-3 p-3 lg:pb-3">
            {isLoading ? <TracksPanelSkeleton rows={6} /> : null}

            {!isLoading && error ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-zinc-300">
                <ActionIcon className="h-12 w-12" name="IC-warning" />
                <span>{error}</span>
              </div>
            ) : null}

            {!isLoading && isMissing ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-1 text-center">
                <PulseLogo className="w-48" />
                <span className="text-xl text-zinc-300">{lang?.emptytopic || (lang?.unknown_playlist || FALLBACK_PLAYLIST_NAME)}</span>
                <span className="text-lg text-zinc-500">{lang?.nopostsdesc || 'Плейлист пуст или недоступен'}</span>
              </div>
            ) : null}

            {!isLoading && !error && !isMissing && tracks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {tracks.map((track, index) => (
                  <PulseTrackRow
                    currentSongId={currentSongId}
                    favoriteIds={favoriteIds}
                    isAuthenticated={isAuthenticated}
                    key={`${playlistId}-${track.sid ?? index}`}
                    onAddToPlaylist={openAddTrackToPlaylist}
                    onCopyTrackLink={copyTrackLink}
                    onDeleteTrack={openDeleteTrack}
                    onEditTrack={openEditTrack}
                    onLikeTrack={likeTrack}
                    onOpenArtist={openArtistPage}
                    onPlayTrack={playTrackAtIndex}
                    onQueueTrackNext={queueTrackNext}
                    onReportTrack={reportTrack}
                    track={track}
                    trackIndex={index}
                    user={user}
                    userCountry={userCountry}
                  />
                ))}
              </div>
            ) : null}

            {!isLoading && !error && !isMissing && tracks.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-1 text-center">
                <PulseLogo className="w-48" />
                <span className="text-xl text-zinc-300">{lang?.emptytopic || 'Пусто'}</span>
                <span className="text-lg text-zinc-500">{lang?.nopostsdesc || 'В этом плейлисте пока нет треков'}</span>
              </div>
            ) : null}
          </div>

          <PulseLegalFooter className="lg:hidden pb-80" />
        </div>

        <PulseLegalFooter className="hidden lg:flex" />

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
          isOpen={isUploadTrackModalOpen || Boolean(trackToEdit)}
          onClose={closeTrackEditor}
          onUploaded={refreshAfterUpload}
          showNote={showPulseNote}
          track={trackToEdit}
        />
        <PulseDeleteTrackModal
          isOpen={Boolean(trackToDelete)}
          onClose={() => setTrackToDelete(null)}
          onDeleted={refreshAfterUpload}
          showNote={showPulseNote}
          track={trackToDelete}
        />
        <PulsePlaylistEditorModal
          isOpen={isPlaylistEditorOpen}
          onClose={() => setIsPlaylistEditorOpen(false)}
          onSaved={handlePlaylistSaved}
          playlist={playlist}
          showNote={showPulseNote}
        />
      </div>
    </div>
  );
}
