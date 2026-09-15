'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import { AncialAPI } from '../lib/api-v2';
import { getPresenceSection } from '../lib/presence';
import { getPlayerTrackArtwork } from '../pulse/player/player-utils';

const PRESENCE_HEARTBEAT_MS = 120_000;
const PRESENCE_OVERRIDE_EVENT = 'zypo:presence-activity';

type PresenceStatus = 'online' | 'idle' | 'offline';

type PresenceActivity = {
  activity_type: 'none' | 'page' | 'music' | 'chat' | 'call' | 'custom';
  activity_key: string;
  activity_label: string;
  activity_url: string;
  activity_meta: Record<string, unknown>;
};

const NO_ACTIVITY: PresenceActivity = {
  activity_type: 'none',
  activity_key: '',
  activity_label: '',
  activity_url: '',
  activity_meta: {},
};

export default function RichPresenceReporter() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { currentTrackObj, isPlaying } = usePulsePlayer();
  const [activityOverride, setActivityOverride] = useState<PresenceActivity | null>(null);
  const trackId = String(currentTrackObj?.sid || '');
  const trackTitle = String(currentTrackObj?.title || '').trim();
  const trackArtist = String(currentTrackObj?.artist || '').trim();
  const trackCover = currentTrackObj ? getPlayerTrackArtwork(currentTrackObj) : '';

  const activity = useMemo<PresenceActivity>(() => {
    if (activityOverride) return activityOverride;

    if (isPlaying && trackId) {
      return {
        activity_type: 'music',
        activity_key: trackId,
        activity_label: [trackTitle, trackArtist].filter(Boolean).join(' — '),
        activity_url: `/pulse/track/${encodeURIComponent(trackId)}`,
        activity_meta: { song_id: trackId, title: trackTitle, artist: trackArtist, cover: trackCover },
      };
    }

    // Чаты — только факт, без собеседника и хеша диалога.
    if (pathname?.startsWith('/messages')) {
      return { ...NO_ACTIVITY, activity_type: 'chat' };
    }

    // Страница — только раздел сайта; служебные разделы (настройки, кошелёк, вход) не сообщаем.
    const section = getPresenceSection(pathname);
    return section ? { ...NO_ACTIVITY, activity_type: 'page', activity_key: section } : NO_ACTIVITY;
  }, [activityOverride, isPlaying, pathname, trackArtist, trackCover, trackId, trackTitle]);

  useEffect(() => {
    const handleOverride = (event: Event) => {
      const detail = (event as CustomEvent<PresenceActivity | null>).detail;
      setActivityOverride(detail || null);
    };
    window.addEventListener(PRESENCE_OVERRIDE_EVENT, handleOverride);
    return () => window.removeEventListener(PRESENCE_OVERRIDE_EVENT, handleOverride);
  }, []);

  const sendPresence = useCallback((status: PresenceStatus = 'online') => {
    if (!isAuthenticated) return;
    const payload = status === 'offline' ? { status, ...NO_ACTIVITY } : { status, ...activity };
    void AncialAPI.updatePresence(payload, { keepalive: true }).catch(() => { });
  }, [activity, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = window.setTimeout(() => sendPresence(document.hidden ? 'idle' : 'online'), 500);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, sendPresence]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = window.setInterval(() => sendPresence(document.hidden ? 'idle' : 'online'), PRESENCE_HEARTBEAT_MS);
    const handleVisibilityChange = () => sendPresence(document.hidden ? 'idle' : 'online');
    // Закрытие вкладки: сразу «не в сети», не дожидаясь истечения heartbeat.
    const handlePageHide = () => sendPresence('offline');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isAuthenticated, sendPresence]);

  return null;
}
