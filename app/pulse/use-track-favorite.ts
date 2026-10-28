'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { useAuth } from '../context/AuthContext';
import { usePulseNote } from '../hooks/use-pulse-note';
import { useRequireAuth } from '../hooks/use-require-auth';
import { AncialAPI, getApiMessage } from '../lib/api-v2';
import { registerResolvedExternalId } from './player/external-track-ids';
import {
  getPulseFavoriteServerSnapshot,
  getPulseFavoriteSnapshot,
  subscribePulseFavorites,
  writePulseFavoriteIds,
} from './player/use-pulse-favorite-ids';
import type { PulseTrack } from './pulse-components';

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Избранное для строки трека: общий список (подписка на одно событие на всё приложение) и переключение одним вызовом. */
export function useTrackFavorite() {
  const { lang } = useAuth();
  const note = usePulseNote();
  const requireAuth = useRequireAuth(note);
  const ids = useSyncExternalStore(subscribePulseFavorites, getPulseFavoriteSnapshot, getPulseFavoriteServerSnapshot);

  const isFavorite = useCallback((track: PulseTrack) => {
    const rawSid = String(track.sid ?? '').trim();
    const numeric = toNumber(rawSid);
    return Boolean(numeric > 0 && ids.includes(numeric));
  }, [ids]);

  /** Добавить/убрать трек из избранного; возвращает true, если трек теперь в избранном. */
  const toggleFavorite = useCallback(async (track: PulseTrack): Promise<boolean | null> => {
    if (!requireAuth(lang?.logintoaddfavorites || 'Войдите, чтобы добавлять треки в избранное')) return null;
    const rawSid = String(track.sid ?? '').trim();
    let trackId = toNumber(rawSid);
    try {
      if (!trackId && rawSid.startsWith('ext_')) {
        const res = await AncialAPI.pulseGetTrack<{ track?: { id?: number | string } }>(rawSid);
        trackId = toNumber(res?.track?.id);
        if (trackId) registerResolvedExternalId(rawSid, trackId);
      }
      if (!trackId) throw new Error('no_track_id');
      const response = await AncialAPI.pulseTrackAction<{ id?: number | string; message?: string }>('add_favorite', rawSid.startsWith('ext_') ? trackId : rawSid);
      const finalId = response.id ? toNumber(response.id) : trackId;
      const current = getPulseFavoriteSnapshot();
      if (response.message === 'ADDED' || response.message === 'CREATED_ADDED') {
        writePulseFavoriteIds([finalId, ...current.filter((id) => id !== finalId)]);
        note(response.message === 'CREATED_ADDED'
          ? lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!'
          : lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!', 'success');
        return true;
      }
      if (response.message === 'REMOVED') {
        writePulseFavoriteIds(current.filter((id) => id !== finalId));
        note(lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', 'success');
        return false;
      }
      throw new Error('favorite_failed');
    } catch (err) {
      note(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.pulse_error_happened || 'Произошла ошибка =('), 'error');
      return null;
    }
  }, [lang, note, requireAuth]);

  return { isFavorite, toggleFavorite };
}
