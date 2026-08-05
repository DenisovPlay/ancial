export type PlayerArtwork = {
  sizes?: string | null;
  src?: string | null;
  type?: string | null;
};

export type PlayerTrack = {
  artist?: string | null;
  artwork?: PlayerArtwork[] | null;
  blockedin?: string[] | string | null;
  explicit?: boolean | number | string | null;
  src?: string | null;
  status?: number | string | null;
  title?: string | null;
};

export type PlayerLang = Record<string, string> | null;

const FALLBACK_TRACK_IMAGE = '/img/pulse/track.png';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function toNumber(value: number | string | null | undefined) {
  const nextValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

export function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatPlaybackTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '00:00';
  const totalSeconds = Math.floor(value);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function getTrackDisplayTitle(track: PlayerTrack | null, lang: PlayerLang) {
  if (!track) return lang?.pulse_loading_dots || 'Загрузка';
  const title = normalizeText(track.title) || (lang?.pulse_unknown_track || 'Неизвестный трек');
  return String(track.explicit) === '1' || track.explicit === true ? `${title} \u{1F174}` : title;
}

export function getTrackArtist(track: PlayerTrack | null, lang: PlayerLang) {
  if (!track) return 'Pulse';
  return normalizeText(track.artist) || (lang?.pulse_unknown_artist || 'Неизвестный исполнитель');
}

export function getTrackArtwork(track: PlayerTrack | null) {
  const artwork = Array.isArray(track?.artwork) ? track.artwork : [];
  const nextArtwork = artwork.find((item) => normalizeText(item?.src));
  return normalizeText(nextArtwork?.src) || FALLBACK_TRACK_IMAGE;
}

export function normalizeTrackSource(trackSource: string | null | undefined) {
  const next = normalizeText(trackSource);
  // Virtual offline marker is not a playable network URL
  if (!next || next === 'offline-indexeddb' || next.startsWith('blob:')) {
    // blob: is valid only when already resolved; callers that need network should not pass blob
    if (next.startsWith('blob:')) return next;
    if (next === 'offline-indexeddb') return '';
    return '';
  }
  return next;
}

export function isTrackPlayable(track: PlayerTrack | null, userCountry: string) {
  if (!track || String(track.status ?? '0') !== '1') return false;
  if (Array.isArray(track.blockedin)) return !track.blockedin.includes(userCountry);
  const blockedCountries = normalizeText(String(track.blockedin ?? ''));
  return blockedCountries ? !blockedCountries.includes(userCountry) : true;
}

export function isAndroidBrowser() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

export function buildMediaArtwork(track: PlayerTrack | null) {
  if (isAndroidBrowser()) return [];
  const trackImage = getTrackArtwork(track);
  const artwork = Array.isArray(track?.artwork) ? track.artwork : [];
  const validArtwork = artwork.filter((item) => normalizeText(item?.src));
  if (validArtwork.length && validArtwork[0]?.sizes) {
    return validArtwork.map((item) => ({ sizes: normalizeText(item.sizes), src: normalizeText(item.src), type: normalizeText(item.type) || 'image/png' }));
  }
  return [96, 128, 192, 256, 384, 512].map((size) => ({ src: trackImage, sizes: `${size}x${size}`, type: 'image/png' }));
}

export function normalizeSongIds(value: unknown) {
  return Array.isArray(value) ? value.map((item) => toNumber(item as number | string | null | undefined)).filter(Boolean) : [];
}

export function parsePlaylistSongs(value: string | null | undefined) {
  return String(value ?? '').split('|').map(toNumber).filter(Boolean);
}
