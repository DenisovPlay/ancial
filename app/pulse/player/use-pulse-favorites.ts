'use client';

import { useCallback, useEffect, type ReactNode } from 'react';

import { AncialAPI } from '../../lib/api-v2';
import { toNumber } from './player-utils';
import { usePulseFavoriteIds } from './use-pulse-favorite-ids';

type LangMap = Record<string, string> | null;
type Notice = (notice: { content: ReactNode; time?: number; type?: 'error' | 'info' | 'success' }) => void;
type Navigate = (href: string) => void;

type ToggleSongLikeOptions = {
  playlistId?: number | string | null;
  triggerPlaylistRedirect?: boolean;
};

/**
 * Player-facing favorite actions. Shared IDs/cache/browser events are owned by
 * usePulseFavoriteIds so player and Pulse pages cannot drift into separate state.
 */
export function usePulseFavorites({
  isAuthenticated,
  lang,
  notify,
  navigate,
}: {
  isAuthenticated: boolean;
  lang: LangMap;
  notify: Notice;
  navigate: Navigate;
}) {
  const {
    favoriteIds: likedSongIds,
    getFavoriteIds,
    getFavoriteIdsSnapshot,
    replaceFavoriteIds: setLikedSongsState,
  } = usePulseFavoriteIds();

  const ensureLikedSongsLoaded = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      setLikedSongsState([]);
      return [];
    }

    const snapshot = getFavoriteIdsSnapshot();
    if (!force && snapshot.ids.length > 0) return snapshot.ids;

    try {
      const result = await AncialAPI.pulseGetLibrary<{ ids?: unknown }>('favorites');
      const nextIds = Array.isArray(result.ids)
        ? result.ids.map((id) => toNumber(id)).filter(Boolean)
        : [];

      // Any page/player mutation or browser event makes this response stale.
      if (snapshot.revision === getFavoriteIdsSnapshot().revision) {
        setLikedSongsState(nextIds);
        return nextIds;
      }
      return getFavoriteIds();
    } catch {
      return getFavoriteIds();
    }
  }, [getFavoriteIds, getFavoriteIdsSnapshot, isAuthenticated, setLikedSongsState]);

  useEffect(() => {
    if (isAuthenticated) void ensureLikedSongsLoaded(true);
  }, [ensureLikedSongsLoaded, isAuthenticated]);

  const toggleSongLike = useCallback(async (songId: number | string, options?: ToggleSongLikeOptions) => {
    const resolvedSongId = toNumber(songId);
    if (!resolvedSongId) return;

    try {
      const response = await AncialAPI.pulseTrackAction<{ message?: string }>('add_favorite', resolvedSongId);
      const result = response.message || '';
      const currentIds = getFavoriteIds();
      const shouldRedirect = Boolean(options?.triggerPlaylistRedirect && options.playlistId);

      if (result === 'ADDED' || result === 'CREATED_ADDED') {
        setLikedSongsState(currentIds.includes(resolvedSongId) ? currentIds : [...currentIds, resolvedSongId]);
        notify({
          content: result === 'CREATED_ADDED'
            ? lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан, трек добавлен'
            : lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!',
          type: 'success',
          time: 5,
        });
        if (shouldRedirect) navigate(`/pulse/playlist/${options?.playlistId}`);
      } else if (result === 'REMOVED') {
        setLikedSongsState(currentIds.filter((id) => id !== resolvedSongId));
        notify({ content: lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', type: 'success', time: 5 });
        if (shouldRedirect) navigate(`/pulse/playlist/${options?.playlistId}`);
      } else if (result === 'UND_SONG') {
        notify({ content: lang?.pulse_unknown_song || 'Неизвестная песня...', type: 'error', time: 5 });
      }
    } catch {
      notify({ content: lang?.pulse_error_happened || 'Произошла ошибка =(', type: 'error', time: 5 });
    }
  }, [getFavoriteIds, lang, navigate, notify, setLikedSongsState]);

  const togglePlaylistLike = useCallback(async (playlistId: number | string) => {
    const resolvedPlaylistId = String(playlistId ?? '').trim();
    if (!resolvedPlaylistId) return;

    try {
      const response = await AncialAPI.pulsePlaylistAction<{ message?: string }>('like', { id: resolvedPlaylistId });
      window.dispatchEvent(new CustomEvent('pulse:playlist-like-changed', {
        detail: { liked: response.message === 'like', playlistId: resolvedPlaylistId },
      }));
    } catch {
      notify({ content: lang?.pulse_error_happened || 'Произошла ошибка =(', type: 'error', time: 5 });
    }
  }, [lang, notify]);

  return {
    ensureLikedSongsLoaded,
    likedSongIds,
    refreshLikedSongs: () => setLikedSongsState(getFavoriteIds()),
    setLikedSongsState,
    togglePlaylistLike,
    toggleSongLike,
  };
}
