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

function cleanTrackTitle(rawTitle: string | null | undefined): string {
  const title = normalizeText(rawTitle);
  const cleaned = title
    .replace(/[\(\[\{](?:Remix|Sped Up|Slowed|Explicit|Clean|Deluxe|Bonus Track|Live|Version|Ver\.|Prod\.|feat\.|ft\.).*?[\)\]\}]/gi, '')
    .trim();
  return cleaned || title;
}

/** Loads synchronized lyrics for a track. */
export async function loadPulseLyrics(
  track: LyricsTrack | null,
  signal?: AbortSignal,
): Promise<PulseLyricsData> {
  if (!track) return EMPTY_LYRICS;

  const rawTitle = normalizeText(track.title);
  const title = cleanTrackTitle(rawTitle);
  const rawArtist = normalizeText(track.artist);
  const mainArtist = rawArtist.split(/[,/&]/)[0].trim();

  if (!rawTitle || !rawArtist) return EMPTY_LYRICS;

  const cacheKey = `lyrics:${track.sid || `${mainArtist}_${title}`}`;

  // 1. Try cache first
  try {
    const hit = cache.get<PulseLyricsData>(cacheKey, { category: 'pulse', subcategory: 'lyrics' });
    if (hit && Array.isArray(hit.lines) && hit.lines.length > 0) {
      return hit;
    }
  } catch { /* ignore cache read error */ }

  // 2. Fetch from UniLyrics API using fallback candidate queries
  const artistCandidates = Array.from(new Set([mainArtist, rawArtist])).filter(Boolean);
  const titleCandidates = Array.from(new Set([title, rawTitle])).filter(Boolean);

  for (const artistQuery of artistCandidates) {
    for (const titleQuery of titleCandidates) {
      try {
        const url = `${PULSE_LYRICS_BASE}/UniLyrics.php?a=${encodeURIComponent(artistQuery)}&t=${encodeURIComponent(titleQuery)}&d=0&type=alternative`;
        const res = await fetch(url, { cache: 'no-store', signal });
        if (!res.ok) continue;
        const text = await res.text();
        const lines = parseLyricsText(text);

        if (lines.length > 0) {
          const data: PulseLyricsData = { lines, source: 'Pulse' };
          try {
            cache.set(cacheKey, data, { category: 'pulse', subcategory: 'lyrics' });
          } catch { /* ignore */ }
          return data;
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') throw e;
        // Continue trying fallback candidates on fetch failure
      }
    }
  }

  // 3. Fallback: try cache even if stale
  try {
    const stale = cache.get<PulseLyricsData>(cacheKey, { category: 'pulse', subcategory: 'lyrics' });
    if (stale && Array.isArray(stale.lines) && stale.lines.length > 0) return stale;
  } catch { /* ignore */ }

  return EMPTY_LYRICS;
}
