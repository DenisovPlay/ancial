'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import { AncialAPI } from '../lib/api-v2';

const PRESENCE_HEARTBEAT_MS = 120_000;
const PRESENCE_OVERRIDE_EVENT = 'zypo:presence-activity';

type PresenceActivity = {
  activity_type: 'call' | 'chat' | 'custom';
  activity_key: string;
  activity_label: string;
  activity_url: string;
  activity_meta: Record<string, unknown>;
};

export default function RichPresenceReporter() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { currentTrackObj, isPlaying } = usePulsePlayer();
  const [activityOverride, setActivityOverride] = useState<PresenceActivity | null>(null);
  const trackId = String(currentTrackObj?.sid || '');
  const trackTitle = String(currentTrackObj?.title || '').trim();
  const trackArtist = String(currentTrackObj?.artist || '').trim();

  const activity = useMemo(() => {
    if (activityOverride) return activityOverride;

    if (isPlaying && trackId) {
      return {
        activity_type: 'music',
        activity_key: trackId,
        activity_label: [trackTitle, trackArtist].filter(Boolean).join(' — '),
        activity_url: `/pulse/track/${encodeURIComponent(trackId)}`,
        activity_meta: { song_id: trackId, title: trackTitle, artist: trackArtist },
      };
    }

    return {
      activity_type: 'page',
      activity_key: pathname || '/',
      activity_label: '',
      activity_url: pathname || '/',
      activity_meta: {},
    };
  }, [activityOverride, isPlaying, pathname, trackArtist, trackId, trackTitle]);

  useEffect(() => {
    const handleOverride = (event: Event) => {
      const detail = (event as CustomEvent<PresenceActivity | null>).detail;
      setActivityOverride(detail || null);
    };
    window.addEventListener(PRESENCE_OVERRIDE_EVENT, handleOverride);
    return () => window.removeEventListener(PRESENCE_OVERRIDE_EVENT, handleOverride);
  }, []);

  const sendPresence = useCallback((status: 'online' | 'idle' = 'online') => {
    if (!isAuthenticated) return;
    void AncialAPI.updatePresence({ status, ...activity }, { keepalive: true }).catch(() => { });
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
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, sendPresence]);

  return null;
}
