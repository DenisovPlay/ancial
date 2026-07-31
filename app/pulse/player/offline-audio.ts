'use client';

import { cache } from '../../lib/cache';

export type OfflineAudioArtwork = {
  sizes?: string | null;
  src?: string | null;
  type?: string | null;
};

export type OfflineAudioTrack = {
  sid: number | string | null;
  title?: string | null;
  artist?: string | null;
  src?: string | null;
  status?: number | string | null;
  explicit?: boolean | number | string | null;
  artwork?: OfflineAudioArtwork[] | null;
};

type DownloadedAudioRecord = {
  id: string;
  title?: string;
  artist?: string;
  savedAt: number;
};

export function releaseObjectUrl(objectUrl: string | null | undefined) {
  if (!objectUrl) return null;

  try {
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Failed to revoke audio object URL', error);
  }

  return null;
}

export async function getCachedAudioObjectUrl(trackId: number) {
  if (trackId <= 0) return null;

  const audioBlob = await cache.audio.get(trackId);
  return audioBlob ? URL.createObjectURL(audioBlob) : null;
}

export function cacheAudioInBackground(
  trackId: number,
  source: string,
  metadata: { title?: string; artist?: string },
  signal: AbortSignal,
) {
  return cache.audio.save(trackId, source, metadata, signal);
}

export function mapDownloadedAudioToTracks(downloaded: DownloadedAudioRecord[]): OfflineAudioTrack[] {
  return downloaded
    .slice()
    .sort((left, right) => (right.savedAt || 0) - (left.savedAt || 0))
    .map((track) => ({
      sid: String(track.id),
      title: track.title || '',
      artist: track.artist || '',
      src: 'offline-indexeddb',
      status: '1',
      explicit: false,
      artwork: [],
    }));
}

export async function getDownloadedAudioTracks() {
  return cache.audio.getDownloadedList();
}
