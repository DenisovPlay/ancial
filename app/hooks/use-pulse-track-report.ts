'use client';

import { useCallback, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { AncialAPI, getApiMessage } from '../lib/api-v2';
import { toNumber } from '../pulse/pulse-components';

interface PulseReportTrackLike {
  sid?: number | string | null;
}

type ShowPulseNote = (content: string, type?: 'error' | 'info' | 'success', time?: number, html?: boolean) => void;

/**
 * Жалоба на трек (type: 6) — раньше reportTrack/handleTrackReport были
 * продублированы по 5 pulse-файлам (pulse/playlist/search/tracks/artist).
 * Часть страниц резолвит sid во внешний числовой id через свой getResolvedId
 * (внешние треки ext_*), часть работает с уже числовым sid напрямую —
 * это учитывается через опциональный resolveTrackId.
 */
export function usePulseTrackReport<T extends PulseReportTrackLike>(
  showPulseNote: ShowPulseNote,
  resolveTrackId?: (idValue: number | string | null | undefined) => Promise<number>,
) {
  const { lang, isAuthenticated } = useAuth();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTrackTarget, setReportTrackTarget] = useState<T | null>(null);

  const reportTrack = useCallback(async (track: T) => {
    if (!isAuthenticated) {
      showPulseNote(lang?.logintoreport || 'Войдите, чтобы отправить жалобу', 'info');
      return;
    }

    if (resolveTrackId) {
      const rawId = String(track.sid ?? '').trim();
      if (!rawId) return;
      const trackId = await resolveTrackId(rawId);
      if (!trackId) return;
      setReportTrackTarget({ ...track, sid: trackId });
    } else {
      const trackId = toNumber(track.sid);
      if (!trackId) return;
      setReportTrackTarget(track);
    }
    setIsReportModalOpen(true);
  }, [isAuthenticated, lang, resolveTrackId, showPulseNote]);

  const handleTrackReport = useCallback(async (reason: string) => {
    if (!reportTrackTarget) return;

    const trackId = resolveTrackId
      ? await resolveTrackId(reportTrackTarget.sid)
      : toNumber(reportTrackTarget.sid);
    if (!trackId) return;

    setIsReportModalOpen(false);
    try {
      const result = await AncialAPI.reportAction<{ message?: string }>({
        comment: reason,
        id: trackId,
        type: 6,
      });
      setReportTrackTarget(null);
      showPulseNote(getApiMessage(result?.message, lang, lang?.reportsended || 'Жалоба отправлена'), 'success', undefined, true);
    } catch (err) {
      showPulseNote(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.pulse_error_happened || 'Произошла ошибка =('), 'error');
    }
  }, [lang, reportTrackTarget, resolveTrackId, showPulseNote]);

  const closeReportModal = useCallback(() => {
    setIsReportModalOpen(false);
    setReportTrackTarget(null);
  }, []);

  return {
    closeReportModal,
    handleTrackReport,
    isReportModalOpen,
    reportTrack,
    reportTrackTarget,
    setReportTrackTarget,
  };
}
