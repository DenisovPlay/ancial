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

export type OfflineAudioMetadata = {
  title?: string;
  artist?: string;
  artwork?: string;
};

type DownloadedAudioRecord = {
  id: string;
  title?: string;
  artist?: string;
  artwork?: string;
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

/** Best-effort: ask SW to put cover URL into image cache (same-origin only). */
export function warmCoverInServiceWorker(artworkUrl: string | null | undefined) {
  if (typeof window === 'undefined' || !artworkUrl) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const url = new URL(artworkUrl, window.location.origin);
    // Only same-origin covers can be cached by our SW
    if (url.origin !== window.location.origin) return;

    void navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({
        type: 'WARM_URLS',
        urls: [url.pathname + url.search],
      });
    });
  } catch {
    // ignore
  }
}

export function cacheAudioInBackground(
  trackId: number,
  source: string,
  metadata: OfflineAudioMetadata,
  signal: AbortSignal,
) {
  if (metadata.artwork) {
    warmCoverInServiceWorker(metadata.artwork);
  }
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
      artwork: track.artwork
        ? [{ src: track.artwork, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    }));
}

export async function getDownloadedAudioTracks() {
  return cache.audio.getDownloadedList();
}

export async function getDownloadedAudioCount() {
  const list = await getDownloadedAudioTracks();
  return list.length;
}
