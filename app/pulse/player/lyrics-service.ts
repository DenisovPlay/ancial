'use client';

import { PULSE_LYRICS_BASE } from '../../config';
import { cache } from '../../lib/cache';
import { parseLyricsText, type PulseLyricsLine } from './pulse-lyrics';
import { normalizeText } from './player-utils';

type LyricsTrack = {
  artist?: string | null;
  sid?: number | string | null;
  title?: string | null;
};

export type PulseLyricsData = {
  lines: PulseLyricsLine[];
  source: string;
};

const EMPTY_LYRICS: PulseLyricsData = { lines: [], source: '' };

/** Loads cached or remote synchronized lyrics for a playable Pulse track. */
export async function loadPulseLyrics(track: LyricsTrack | null, signal?: AbortSignal): Promise<PulseLyricsData> {
  if (!track) return EMPTY_LYRICS;

  const title = normalizeText(track.title)
    .replace('(Remix)', '')
    .replace('(Sped Up Version)', '');
  const artist = normalizeText(track.artist).split(',')[0];

  if (!title || !artist) return EMPTY_LYRICS;

  const cacheKey = `lyrics:${track.sid}`;
  try {
    const cached = cache.get<PulseLyricsData>(cacheKey, { category: 'pulse', subcategory: 'lyrics' });
    if (cached && Array.isArray(cached.lines) && cached.lines.length > 0) return cached;
  } catch {
    // A cache miss must not prevent network lyric loading.
  }

  try {
    const response = await fetch(
      `${PULSE_LYRICS_BASE}/UniLyrics.php?a=${encodeURIComponent(artist)}&t=${encodeURIComponent(title)}&d=0&type=alternative`,
      { cache: 'no-store', signal },
    );
    const lines = parseLyricsText(await response.text());
    if (!lines.length) return EMPTY_LYRICS;

    const lyricsData: PulseLyricsData = { lines, source: 'Pulse' };
    try {
      cache.set(cacheKey, lyricsData, { category: 'pulse', subcategory: 'lyrics' });
    } catch {
      // Lyrics remain usable even when persistent cache is unavailable.
    }
    return lyricsData;
  } catch {
    return EMPTY_LYRICS;
  }
}
