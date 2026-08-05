'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cache } from '../../lib/cache';
import { cacheAudioInBackground } from './offline-audio';
import { getTrackArtwork, normalizeTrackSource, toNumber } from './player-utils';

export type OfflineSaveStatus = 'idle' | 'saving' | 'saved' | 'already' | 'error';
export type OfflineSaveResult = 'failed' | 'saved' | 'skipped';

type OfflineAudioTrack = {
  artist?: string | null;
  artwork?: Array<{ src?: string | null }> | null;
  sid?: number | string | null;
  src?: string | null;
  title?: string | null;
};

function resolveArtworkUrl(track: OfflineAudioTrack | null) {
  if (!track) return undefined;
  const fromHelper = getTrackArtwork(track);
  // getTrackArtwork returns fallback placeholder when empty — don't store that as "cover"
  if (!fromHelper || fromHelper.includes('/img/pulse/track.png') || fromHelper.includes('track.png')) {
    const raw = Array.isArray(track.artwork)
      ? track.artwork.map((item) => String(item?.src ?? '').trim()).find(Boolean)
      : '';
    return raw || undefined;
  }
  return fromHelper || undefined;
}

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
      artwork: resolveArtworkUrl(track),
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
        {
          artist: track?.artist || undefined,
          title: track?.title || undefined,
          artwork: resolveArtworkUrl(track),
        },
        undefined,
        true,
      );
      // After success: go directly to 'already' (permanent) so repeated clicks delete, not re-save.
      // The callback receives 'saved' string for showing a success notification.
      setOfflineSaveStatus(saved === true ? 'already' : 'idle');
      return saved === true ? 'saved' as const : 'failed' as const;
    } catch {
      setOfflineSaveStatus('idle');
      return 'failed' as const;
    } finally {
      isManualSaveInFlightRef.current = false;
    }
  }, [clearStatusResetTimer, offlineSaveStatus]);

  const deleteOfflineTrack = useCallback(async (track: OfflineAudioTrack | null): Promise<'deleted' | 'failed' | 'skipped'> => {
    const trackId = toNumber(track?.sid);
    if (!trackId) return 'skipped';

    try {
      await cache.audio.remove(trackId);
      setOfflineSaveStatus('idle');
      return 'deleted';
    } catch {
      return 'failed';
    }
  }, []);

  return { cacheCurrentTrackInBackground, deleteOfflineTrack, offlineSaveStatus, saveCurrentTrack };
}
