'use client';

import { useCallback, useEffect, type ReactNode } from 'react';

import ReportModal from '../components/report-modal';
import { useAuth } from '../context/AuthContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import { usePulseNote } from '../hooks/use-pulse-note';
import { usePulseTrackReport } from '../hooks/use-pulse-track-report';
import { usePulseTrackShare } from '../hooks/use-pulse-track-share';
import { useRequireAuth } from '../hooks/use-require-auth';
import { AncialAPI, getApiMessage } from '../lib/api-v2';
import { buildPulseTrackReportReasons } from '../lib/report-reasons';
import { registerResolvedExternalId } from './player/external-track-ids';
import { usePulseFavoriteIds } from './player/use-pulse-favorite-ids';
import { toNumber, type PulseTrack } from './pulse-components';

/**
 * Действия строки трека (`PulseTrackRow`) вне страниц Pulse: избранное, «в плейлист», ссылка, жалоба.
 * Та же логика, что в поиске Pulse, — чтобы треки в других разделах вели себя точно так же.
 * `modals` нужно отрисовать один раз рядом со списком (окна «поделиться» и «пожаловаться»).
 */
export function usePulseTrackActions(onSidResolved?: (rawSid: string, trackId: number) => void) {
  const { lang } = useAuth();
  const { openAddToPlaylist, playNextTrack } = usePulsePlayer();
  const { favoriteIds, replaceFavoriteIds, updateFavoriteIds } = usePulseFavoriteIds();
  const showPulseNote = usePulseNote();
  const requireAuth = useRequireAuth(showPulseNote);

  useEffect(() => {
    let cancelled = false;
    void AncialAPI.pulseGetLibrary<{ ids?: Array<number | string> }>('favorites')
      .then((library) => {
        if (cancelled) return;
        replaceFavoriteIds(Array.isArray(library.ids) ? library.ids.map((id) => toNumber(id)).filter(Boolean) : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [replaceFavoriteIds]);

  const getResolvedId = useCallback(async (idValue: number | string | null | undefined): Promise<number> => {
    const rawId = String(idValue ?? '').trim();
    if (!rawId) return 0;
    const num = toNumber(rawId);
    if (num > 0) return num;
    if (rawId.startsWith('ext_')) {
      try {
        const res = await AncialAPI.pulseGetTrack<{ track?: { id?: number | string } }>(rawId);
        if (res?.track?.id) {
          const resolvedId = toNumber(res.track.id);
          registerResolvedExternalId(rawId, resolvedId);
          return resolvedId;
        }
      } catch {
        return 0;
      }
    }
    return 0;
  }, []);

  const { copyTrackLink, shareModal } = usePulseTrackShare(showPulseNote, getResolvedId);
  const { closeReportModal, handleTrackReport, isReportModalOpen, reportTrack } = usePulseTrackReport<PulseTrack>(showPulseNote, getResolvedId);

  const likeTrack = useCallback(async (track: PulseTrack) => {
    if (!requireAuth(lang?.logintoaddfavorites || 'Войдите, чтобы добавлять треки в избранное')) return;
    const rawSid = String(track.sid ?? '').trim();
    const trackId = await getResolvedId(rawSid);
    if (!trackId) return;

    try {
      const response = await AncialAPI.pulseTrackAction<{ id?: number | string; message?: string }>('add_favorite', rawSid);
      const result = response.message || '';
      const finalId = response.id ? toNumber(response.id) : trackId;

      if (result === 'ADDED' || result === 'CREATED_ADDED') {
        updateFavoriteIds((ids) => {
          const next = [...ids];
          const addId = toNumber(finalId) || toNumber(rawSid);
          if (addId && !next.includes(addId)) next.push(addId);
          return next;
        });
        onSidResolved?.(rawSid, finalId);
        showPulseNote(result === 'CREATED_ADDED' ? (lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!') : (lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!'), 'success');
        return;
      }
      if (result === 'REMOVED') {
        updateFavoriteIds((ids) => ids.filter((id) => toNumber(id) !== finalId && String(id ?? '').trim() !== rawSid));
        onSidResolved?.(rawSid, finalId);
        showPulseNote(lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', 'success');
        return;
      }
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    } catch (err) {
      showPulseNote(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.pulse_error_happened || 'Произошла ошибка =('), 'error');
    }
  }, [getResolvedId, lang, onSidResolved, requireAuth, showPulseNote, updateFavoriteIds]);

  const openAddTrackToPlaylist = useCallback((trackId: number | string) => {
    if (!requireAuth(lang?.logintoaddtoplaylists || 'Войдите, чтобы добавлять треки в плейлисты')) return;
    openAddToPlaylist(trackId);
  }, [lang, openAddToPlaylist, requireAuth]);

  const modals: ReactNode = (
    <>
      {shareModal}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={closeReportModal}
        onReport={handleTrackReport}
        reasons={buildPulseTrackReportReasons(lang)}
        title={lang?.report || 'Пожаловаться'}
      />
    </>
  );

  return { copyTrackLink, favoriteIds, likeTrack, modals, openAddTrackToPlaylist, playNextTrack, reportTrack };
}
