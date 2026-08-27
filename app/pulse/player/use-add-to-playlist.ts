'use client';

import { useCallback, useState, type ReactNode } from 'react';

import { AncialAPI, getApiMessage } from '../../lib/api-v2';
import { normalizeText, parsePlaylistSongs, toNumber } from './player-utils';
import { resolvePulsePlaylistTitle } from '../playlist/playlist-model';

type LangMap = Record<string, string> | null;
type Notice = (notice: { content: ReactNode; time?: number; type?: 'error' | 'info' | 'success' }) => void;
type PlaylistItem = { id?: number | string | null; img?: string | null; name?: string | null; songs?: string | null };
export type PulsePlaylistOption = { hasSong: boolean; id: string; image: string; name: string; songs: number[] };

export function useAddToPlaylist({ lang, navigate, notify }: { lang: LangMap; navigate: (href: string) => void; notify: Notice }) {
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [isPlaylistEditorOpen, setIsPlaylistEditorOpen] = useState(false);
  const [addToPlaylistSongId, setAddToPlaylistSongId] = useState(0);
  const [playlistOptions, setPlaylistOptions] = useState<PulsePlaylistOption[]>([]);
  const [playlistOptionsLoading, setPlaylistOptionsLoading] = useState(false);

  const openAddToPlaylist = useCallback((songId: number | string) => {
    const rawId = String(songId ?? '').trim();
    if (!rawId) return;

    setIsAddToPlaylistOpen(true);
    setPlaylistOptions([]);
    setPlaylistOptionsLoading(true);

    void (async () => {
      try {
        let resolvedSongId = toNumber(rawId);
        if (!resolvedSongId && rawId.startsWith('ext_')) {
          const trackRes = await AncialAPI.pulseGetTrack<{ track?: { id?: number | string } }>(rawId);
          if (trackRes?.track?.id) {
            resolvedSongId = toNumber(trackRes.track.id);
          }
        }

        if (!resolvedSongId) {
          notify({ content: lang?.pulse_error_happened || 'Произошла ошибка =(', type: 'error', time: 5 });
          setIsAddToPlaylistOpen(false);
          return;
        }

        setAddToPlaylistSongId(resolvedSongId);

        const result = await AncialAPI.pulsePlaylistAction<{ data?: PlaylistItem[]; playlists?: PlaylistItem[]; error?: string }>('list', {});
        const playlistList = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.playlists)
            ? result.playlists
            : Array.isArray(result)
              ? (result as PlaylistItem[])
              : null;
        if (!playlistList) {
          notify({ content: getApiMessage(result?.error, lang, lang?.pulse_error_happened || 'Произошла ошибка =('), type: 'error', time: 5 });
          setPlaylistOptions([]);
          return;
        }
        setPlaylistOptions(playlistList.map((item) => {
          const songs = parsePlaylistSongs(item.songs);
          return {
            hasSong: songs.includes(resolvedSongId),
            id: normalizeText(String(item.id ?? '')),
            image: normalizeText(item.img),
            name: resolvePulsePlaylistTitle(item, lang),
            songs,
          };
        }).filter((item) => item.id));
      } catch (err) {
        notify({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.pulse_error_happened || 'Произошла ошибка =('), type: 'error', time: 5 });
        setPlaylistOptions([]);
      } finally {
        setPlaylistOptionsLoading(false);
      }
    })();
  }, [lang, notify]);


  const toggleSongInPlaylist = useCallback(async (playlistId: string, hasSong: boolean) => {
    if (!playlistId || !addToPlaylistSongId) return;
    const option = playlistOptions.find((item) => item.id === playlistId);
    if (!option) return;
    const songs = hasSong ? option.songs.filter((id) => id !== addToPlaylistSongId) : [...option.songs, addToPlaylistSongId];

    try {
      await AncialAPI.pulsePlaylistAction('update', { id: playlistId, songs: songs.join('|') });
      setPlaylistOptions((current) => current.map((item) => item.id === playlistId ? { ...item, hasSong: !hasSong, songs } : item));
      notify({ content: hasSong ? lang?.pulse_removed_from_playlist || 'Удалено из плейлиста' : lang?.pulse_added_to_playlist || 'Добавлено в плейлист', type: 'success', time: 2 });
      if (window._pagePlaylistConf?.type === 2 && normalizeText(String(window._pagePlaylistConf.id ?? '')) === playlistId) {
        window.setTimeout(() => { setIsAddToPlaylistOpen(false); navigate(`/pulse/playlist/${playlistId}`); }, 400);
      }
    } catch (err) {
      notify({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.pulse_error_happened || 'Произошла ошибка =('), type: 'error', time: 5 });
    }
  }, [addToPlaylistSongId, lang, navigate, notify, playlistOptions]);

  return {
    addToPlaylistSongId, isAddToPlaylistOpen, isPlaylistEditorOpen, openAddToPlaylist,
    playlistOptions, playlistOptionsLoading, setIsAddToPlaylistOpen, setIsPlaylistEditorOpen,
    toggleSongInPlaylist,
  };
}
