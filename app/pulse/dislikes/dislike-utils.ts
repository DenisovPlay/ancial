/**
 * «Не интересно» — чистая логика без React и без импортов (покрыта node-тестами).
 * Нормализация имени исполнителя — зеркало pulse_artist_key / pulse_artist_keys в
 * php-v2-api/backend.ru.zypo/modules/pulse/dislikes.php: менять только вместе.
 */

/** «Не рекомендовать исполнителя» в меню трека временно скрыто (логика и страница «Не интересно» остаются). */
export const PULSE_ARTIST_DISLIKE_MENU = false;

export interface DislikeTrackLike {
  sid?: string | number | null;
  artist?: string | null;
  artists_ids?: Array<string | number> | string | null;
}

export interface DislikeSets {
  trackIds: ReadonlySet<number>;
  artistKeys: ReadonlySet<string>;
  artistIds: ReadonlySet<number>;
  /** Виртуальные sid (ext_yandex_…), отмеченные в этой сессии: настоящий id трек получает на сервере. */
  virtualSids?: ReadonlySet<string>;
}

export interface ArtistChoice {
  name: string;
  id: number | null;
}

/** Ключ имени: регистр, ё, кавычки, пробелы, знаки по краям. */
export function normalizeArtistKey(name: string): string {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’ʼ‘`]/g, "'")
    .replace(/\s+/g, ' ');
  return key.replace(/^[\s.,;:!?"\-–—]+|[\s.,;:!?"\-–—]+$/g, '');
}

const ARTIST_SEPARATORS = /\s*(?:,|;|\/|\+|&|\bfeat\.?|\bft\.?|\bfeaturing\b|\s[xх]\s|×)\s*/i;

/** Ключи строки «A, B feat. C»: вся строка и её части (целая нужна для имён с запятыми). */
export function artistKeysOf(artist: string): string[] {
  const keys = new Set<string>();
  const whole = normalizeArtistKey(artist);
  if (whole) keys.add(whole);
  for (const part of artist.split(ARTIST_SEPARATORS)) {
    const key = normalizeArtistKey(part);
    if (key) keys.add(key);
  }
  return [...keys];
}

export function parseArtistIds(value: DislikeTrackLike['artists_ids']): number[] {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  return list.map((item) => Number.parseInt(String(item), 10)).filter((id) => Number.isFinite(id) && id > 0);
}

export function trackNumericId(track: DislikeTrackLike): number {
  const id = Number.parseInt(String(track.sid ?? ''), 10);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

export function isTrackDisliked(track: DislikeTrackLike | null | undefined, sets: DislikeSets): boolean {
  if (!track) return false;
  const id = trackNumericId(track);
  if (id > 0 && sets.trackIds.has(id)) return true;
  if (id === 0 && sets.virtualSids && sets.virtualSids.has(String(track.sid ?? ''))) return true;

  const artist = String(track.artist ?? '');
  if (artist && sets.artistKeys.size > 0) {
    for (const key of artistKeysOf(artist)) {
      if (sets.artistKeys.has(key)) return true;
    }
  }
  if (sets.artistIds.size > 0) {
    for (const artistId of parseArtistIds(track.artists_ids)) {
      if (sets.artistIds.has(artistId)) return true;
    }
  }
  return false;
}

export interface DislikedArtistLike {
  key: string;
  artistId: number | null;
  label: string;
}

/** Отмечен ли сам трек (а не его исполнитель): по id или по виртуальному sid этой сессии. */
export function isTrackMarkedItself(track: DislikeTrackLike | null | undefined, sets: DislikeSets): boolean {
  if (!track) return false;
  const id = trackNumericId(track);
  if (id > 0) return sets.trackIds.has(id);
  return Boolean(sets.virtualSids && sets.virtualSids.has(String(track.sid ?? '')));
}

/** Отмеченные «не рекомендовать» исполнители, под которых подпадает трек (по имени в строке или по карточке). */
export function matchingDislikedArtists<A extends DislikedArtistLike>(track: DislikeTrackLike | null | undefined, artists: readonly A[]): A[] {
  if (!track || artists.length === 0) return [];
  const keys = new Set(artistKeysOf(String(track.artist ?? '')));
  const ids = parseArtistIds(track.artists_ids);
  return artists.filter((artist) => keys.has(artist.key) || (artist.artistId !== null && ids.includes(artist.artistId)));
}

/**
 * Исполнители трека для выбора «Не рекомендовать»: имена из строки artist; id карточки подставляем,
 * только если имён и id поровну (порядок совпадает), иначе работаем по имени.
 */
export function artistChoices(track: DislikeTrackLike): ArtistChoice[] {
  const names = String(track.artist ?? '')
    .split(ARTIST_SEPARATORS)
    .map((name) => name.trim())
    .filter(Boolean);
  const ids = parseArtistIds(track.artists_ids);
  return names.map((name, index) => ({ name, id: ids.length === names.length ? ids[index] : null }));
}

/**
 * Индекс первого трека, который не нужно пропускать, начиная с `from` в сторону `step` (1 — вперёд, -1 — назад).
 * -1 — подходящего нет. Очередь автоматически пропускает отмеченные «не интересно».
 */
export function findPlayableIndex<T>(list: readonly T[], from: number, step: 1 | -1, isSkipped: (track: T) => boolean): number {
  for (let index = from; index >= 0 && index < list.length; index += step) {
    if (!isSkipped(list[index])) return index;
  }
  return -1;
}
