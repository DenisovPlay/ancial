'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cache } from '../../lib/cache';
import { cacheAudioInBackground } from './offline-audio';
import { normalizeTrackSource, toNumber } from './player-utils';

export type OfflineSaveStatus = 'idle' | 'saving' | 'saved' | 'already' | 'error';
export type OfflineSaveResult = 'failed' | 'saved' | 'skipped';

type OfflineAudioTrack = {
  artist?: string | null;
  sid?: number | string | null;
  src?: string | null;
  title?: string | null;
};

export function useOfflineAudioSave(currentTrack: OfflineAudioTrack | null) {
  const [offlineSaveStatus, setOfflineSaveStatus] = useState<OfflineSaveStatus>('idle');
  const backgroundCacheAbortRef = useRef<AbortController | null>(null);
  const isManualSaveInFlightRef = useRef(false);
  const statusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStatusResetTimer = useCallback(() => {
    if (statusResetTimerRef.current !== null) {
      clearTimeout(statusResetTimerRef.current);
      statusResetTimerRef.current = null;
    }
  }, []);

  const scheduleStatusReset = useCallback(() => {
    clearStatusResetTimer();
    statusResetTimerRef.current = setTimeout(() => {
      statusResetTimerRef.current = null;
      setOfflineSaveStatus('idle');
    }, 4000);
  }, [clearStatusResetTimer]);

  useEffect(() => {
    const trackId = toNumber(currentTrack?.sid);
    let cancelled = false;
    clearStatusResetTimer();
    if (!trackId) {
      queueMicrotask(() => {
        if (!cancelled) setOfflineSaveStatus('idle');
      });
      return undefined;
    }

    void cache.audio.has(trackId)
      .then((exists) => {
        if (!cancelled) setOfflineSaveStatus(exists ? 'already' : 'idle');
      })
      .catch(() => {
        if (!cancelled) setOfflineSaveStatus('idle');
      });

    return () => {
      cancelled = true;
    };
  }, [clearStatusResetTimer, currentTrack?.sid]);

  useEffect(() => () => {
    backgroundCacheAbortRef.current?.abort();
    clearStatusResetTimer();
  }, [clearStatusResetTimer]);

  const cacheCurrentTrackInBackground = useCallback((track: OfflineAudioTrack | null) => {
    const trackId = toNumber(track?.sid);
    const source = normalizeTrackSource(track?.src);
    if (!trackId || !source) return;

    backgroundCacheAbortRef.current?.abort();
    const controller = new AbortController();
    backgroundCacheAbortRef.current = controller;

    void cacheAudioInBackground(trackId, source, {
      artist: track?.artist || undefined,
      title: track?.title || undefined,
    }, controller.signal).catch((error) => {
      if (error?.name !== 'AbortError') {
        console.error('Failed to auto-cache audio file in background', error);
      }
    });
  }, []);

  const saveCurrentTrack = useCallback(async (track: OfflineAudioTrack | null) => {
    if (isManualSaveInFlightRef.current || offlineSaveStatus === 'saving' || offlineSaveStatus === 'already') return 'skipped' as const;

    const trackId = toNumber(track?.sid);
    const source = normalizeTrackSource(track?.src);
    if (!trackId || !source) return 'skipped' as const;

    clearStatusResetTimer();
    isManualSaveInFlightRef.current = true;
    setOfflineSaveStatus('saving');
    try {
      const saved = await cache.audio.save(
        trackId,
        source,
        { artist: track?.artist || undefined, title: track?.title || undefined },
        undefined,
        true,
      );
      setOfflineSaveStatus(saved === true ? 'saved' : 'error');
      scheduleStatusReset();
      return saved === true ? 'saved' as const : 'failed' as const;
    } catch {
      setOfflineSaveStatus('error');
      scheduleStatusReset();
      return 'failed' as const;
    } finally {
      isManualSaveInFlightRef.current = false;
    }
  }, [clearStatusResetTimer, offlineSaveStatus, scheduleStatusReset]);

  return { cacheCurrentTrackInBackground, offlineSaveStatus, saveCurrentTrack };
}
