'use client';

import { AncialAPI, AncialAPIError } from '../../lib/api-v2';
import { cache } from '../../lib/cache';
import { parseLyricsText, type LyricsLine } from '../../lib/lrc';
import { toNumber } from './player-utils';

type LyricsTrack = {
  sid?: number | string | null;
};

export type PulseLyricsData = {
  /** Сервер не ответил (сеть, 5xx) — значит, текст стоит попросить ещё раз. */
  failed?: boolean;
  lines: LyricsLine[];
  source: string;
};

const EMPTY_LYRICS: PulseLyricsData = { lines: [], source: '' };
const CACHE_OPTIONS = { category: 'pulse', subcategory: 'lyrics' } as const;
// Автор может поправить текст в Creators — слушатели увидят правку не позже чем через сутки.
const LYRICS_CACHE_TTL = 24 * 60 * 60 * 1000;

/** v2: до перехода на music_lyrics в кэше лежали ответы старого поиска — их не читаем. */
export function lyricsCacheKey(songId: number): string {
  return `lyrics:v2:${songId}`;
}

/** Текст трека: локальный кэш, иначе сервер (он сам хранит текст и ищет у провайдеров). */
export async function loadPulseLyrics(
  track: LyricsTrack | null,
  signal?: AbortSignal,
): Promise<PulseLyricsData> {
  const songId = toNumber(track?.sid);
  if (songId <= 0) return EMPTY_LYRICS;

  const cacheKey = lyricsCacheKey(songId);
  try {
    const hit = cache.get<PulseLyricsData>(cacheKey, CACHE_OPTIONS);
    if (hit && Array.isArray(hit.lines) && hit.lines.length > 0) return hit;
  } catch { /* битый кэш — просто спросим сервер */ }

  try {
    const response = await AncialAPI.pulseLyrics(songId, { cache: 'no-store', signal });
    const data: PulseLyricsData = { lines: parseLyricsText(response.lyrics), source: response.source };
    if (data.lines.length > 0) {
      try {
        cache.set(cacheKey, data, { ...CACHE_OPTIONS, ttl: LYRICS_CACHE_TTL });
      } catch { /* best-effort */ }
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    // 4xx — трека нет или он скрыт: повторять бессмысленно. Сеть и 5xx — стоит.
    if (err instanceof AncialAPIError && err.status < 500) return EMPTY_LYRICS;
    return { ...EMPTY_LYRICS, failed: true };
  }
}
