'use client';

/**
 * «Не интересно»: общее хранилище на весь сайт (как избранное — одно состояние для всех строк и плеера).
 * Сервер: TrackAction (dislike / undislike / dislike_artist / undislike_artist), Library?type=dislikes, Prefs.
 * Сами списки без отмеченных треков отдаёт бэкенд (GetPlaylist по gid); в обычных плейлистах и поиске строки
 * остаются, помечаются, а автоматическая очередь их пропускает.
 */

import { useEffect, useSyncExternalStore } from 'react';

import { AncialAPI } from '../../lib/api-v2';
import { cache } from '../../lib/cache';
import { useAuth } from '../../context/AuthContext';
import { isTrackDisliked, trackNumericId, type DislikeTrackLike } from './dislike-utils';

export interface PulseDislikedArtist {
  key: string;
  artistId: number | null;
  label: string;
}

export interface PulseRememberedChoices {
  dislike_favorite?: 'remove' | 'keep';
  play_disliked?: 'play' | 'ask';
}

export type PulseDislikeDialog =
  | { kind: 'favorite'; track: DislikeTrackLike }
  | { kind: 'play'; track: DislikeTrackLike; play: () => void }
  | { kind: 'artist'; track: DislikeTrackLike };

interface PulseDislikeSnapshot {
  loaded: boolean;
  trackIds: ReadonlySet<number>;
  artistKeys: ReadonlySet<string>;
  artistIds: ReadonlySet<number>;
  virtualSids: ReadonlySet<string>;
  artists: PulseDislikedArtist[];
  remembered: PulseRememberedChoices;
}

interface ServerDislikes {
  track_ids?: Array<number | string>;
  artists?: Array<{ key?: string; artist_id?: number | string | null; label?: string }>;
}

const EMPTY: PulseDislikeSnapshot = {
  loaded: false,
  trackIds: new Set(),
  artistKeys: new Set(),
  artistIds: new Set(),
  virtualSids: new Set(),
  artists: [],
  remembered: {},
};
const CACHE_OPTIONS = { category: 'pulse', subcategory: 'dislikes' } as const;
const CACHE_KEY = 'pulse_dislikes';
const FOCUS_RELOAD_MS = 60_000;

let snapshot: PulseDislikeSnapshot = EMPTY;
let dialog: PulseDislikeDialog | null = null;
const listeners = new Set<() => void>();
const dialogListeners = new Set<() => void>();
let started = false;
let lastLoadAt = 0;
let loading: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function setSnapshot(next: PulseDislikeSnapshot) {
  snapshot = next;
  emit();
}

function buildSnapshot(server: ServerDislikes, remembered: PulseRememberedChoices): PulseDislikeSnapshot {
  const artists: PulseDislikedArtist[] = (server.artists ?? [])
    .map((item) => ({
      key: String(item.key ?? ''),
      artistId: Number(item.artist_id) > 0 ? Number(item.artist_id) : null,
      label: String(item.label ?? ''),
    }))
    .filter((item) => item.key);
  return {
    loaded: true,
    trackIds: new Set((server.track_ids ?? []).map(Number).filter((id) => id > 0)),
    artistKeys: new Set(artists.map((item) => item.key)),
    artistIds: new Set(artists.map((item) => item.artistId).filter((id): id is number => id !== null)),
    virtualSids: new Set(),
    artists,
    remembered,
  };
}

function persist() {
  try {
    cache.set(CACHE_KEY, {
      track_ids: [...snapshot.trackIds],
      artists: snapshot.artists.map((a) => ({ key: a.key, artist_id: a.artistId, label: a.label })),
    }, CACHE_OPTIONS);
  } catch {
    // кэш недоступен — состояние живёт в памяти
  }
}

/** Загрузка списка и настроек; параллельные вызовы делят один запрос. */
export function reloadPulseDislikes(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const [server, prefs] = await Promise.all([
        AncialAPI.pulseGetDislikes<ServerDislikes>(),
        AncialAPI.pulseGetPrefs<{ remembered?: PulseRememberedChoices; tz?: string }>().catch(() => null),
      ]);
      setSnapshot(buildSnapshot(server ?? {}, prefs?.remembered ?? {}));
      persist();
      lastLoadAt = Date.now();
      // Часовой пояс нужен серверу для суточных подборок: сообщаем один раз, если он изменился.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && prefs && prefs.tz !== tz) void AncialAPI.pulseSavePrefs({ tz }).catch(() => undefined);
    } catch (error) {
      console.error('[Pulse] Не удалось загрузить «не интересно»', error);
    } finally {
      loading = null;
    }
  })();
  return loading;
}

let listenersInstalled = false;
let knownLiked: Set<number> | null = null;

function installListeners() {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;
  window.addEventListener('focus', () => {
    if (started && Date.now() - lastLoadAt > FOCUS_RELOAD_MS) void reloadPulseDislikes();
  });
  // Лайк трека на сервере снимает отметку «не интересно» — зеркалим локально. Событие шлёт избранное при любом
  // обновлении списка (загрузка, «оставить в избранном»), поэтому реагируем только на НОВЫЕ id в списке лайков.
  window.addEventListener('pulse-likes-updated', (event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (!Array.isArray(detail)) return;
    const liked = new Set(detail.map(Number));
    const previous = knownLiked;
    knownLiked = liked;
    if (!previous || snapshot.trackIds.size === 0) return;
    const rest = [...snapshot.trackIds].filter((id) => previous.has(id) || !liked.has(id));
    if (rest.length !== snapshot.trackIds.size) {
      setSnapshot({ ...snapshot, trackIds: new Set(rest) });
      persist();
    }
  });
}

function startPulseDislikes() {
  if (started || typeof window === 'undefined') return;
  started = true;
  installListeners();
  try {
    const cached = cache.get<ServerDislikes>(CACHE_KEY, CACHE_OPTIONS);
    if (cached) setSnapshot(buildSnapshot(cached, snapshot.remembered));
  } catch {
    // нет кэша
  }
  void reloadPulseDislikes();
}

/** Для плеера и мест вне строк треков: запустить загрузку «не интересно» (один раз за сессию). */
export function ensurePulseDislikesStarted() {
  startPulseDislikes();
}

/** Вышли из аккаунта — чужие отметки не показываем. */
function resetPulseDislikes() {
  started = false;
  lastLoadAt = 0;
  knownLiked = null;
  if (snapshot !== EMPTY) setSnapshot(EMPTY);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

/** Состояние и подписка на «не интересно». Подключает загрузку при входе в аккаунт. */
export function usePulseDislikes() {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) startPulseDislikes();
    else resetPulseDislikes();
  }, [isAuthenticated]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function isPulseTrackDisliked(track: DislikeTrackLike | null | undefined, state: PulseDislikeSnapshot = snapshot) {
  return isTrackDisliked(track, state);
}

// ───────────── Действия ─────────────

export type DislikeResult =
  | { status: 'done'; id: number; removedFromFavorites: boolean }
  | { status: 'needs_choice'; id: number }
  | { status: 'error' };

interface DislikeResponse {
  message?: string;
  id?: number | string;
  removed_from_favorites?: boolean;
}

function addTrackId(id: number) {
  if (id <= 0 || snapshot.trackIds.has(id)) return;
  setSnapshot({ ...snapshot, trackIds: new Set([...snapshot.trackIds, id]) });
  persist();
}

function dropTrackId(id: number) {
  if (!snapshot.trackIds.has(id)) return;
  setSnapshot({ ...snapshot, trackIds: new Set([...snapshot.trackIds].filter((x) => x !== id)) });
  persist();
}

/** Из избранного убрали трек (после «не интересно» с выбором «убрать») — обновляем списки лайков по всему сайту. */
function broadcastFavoriteRemoval(id: number) {
  if (typeof window === 'undefined') return;
  const current = (window as Window & { _pulseLikedSongs?: number[] | null })._pulseLikedSongs;
  if (!Array.isArray(current)) return;
  window.dispatchEvent(new CustomEvent('pulse-likes-updated', { detail: current.filter((x) => Number(x) !== id) }));
}

export async function dislikeTrack(
  track: DislikeTrackLike,
  choice?: { favorite: 'remove' | 'keep'; remember?: boolean },
): Promise<DislikeResult> {
  const sid = String(track.sid ?? '');
  if (!sid) return { status: 'error' };
  try {
    const extra: Record<string, string> = {};
    if (choice) {
      extra.favorite = choice.favorite;
      if (choice.remember) extra.remember = '1';
    }
    const response = await AncialAPI.pulseTrackActionWith<DislikeResponse>('dislike', sid, extra);
    const id = Number(response?.id) || trackNumericId(track);
    if (response?.message === 'NEEDS_CHOICE') return { status: 'needs_choice', id };
    addTrackId(id);
    if (trackNumericId(track) === 0) setSnapshot({ ...snapshot, virtualSids: new Set([...snapshot.virtualSids, sid]) });
    if (choice?.remember) setSnapshot({ ...snapshot, remembered: { ...snapshot.remembered, dislike_favorite: choice.favorite } });
    if (response?.removed_from_favorites) broadcastFavoriteRemoval(id);
    return { status: 'done', id, removedFromFavorites: Boolean(response?.removed_from_favorites) };
  } catch (error) {
    console.error('[Pulse] dislike failed', error);
    return { status: 'error' };
  }
}

export async function undislikeTrack(track: DislikeTrackLike): Promise<boolean> {
  const sid = String(track.sid ?? '');
  if (!sid) return false;
  try {
    const response = await AncialAPI.pulseTrackActionWith<DislikeResponse>('undislike', sid, {});
    dropTrackId(Number(response?.id) || trackNumericId(track));
    if (snapshot.virtualSids.has(sid)) setSnapshot({ ...snapshot, virtualSids: new Set([...snapshot.virtualSids].filter((x) => x !== sid)) });
    return true;
  } catch (error) {
    console.error('[Pulse] undislike failed', error);
    return false;
  }
}

export async function dislikeArtist(track: DislikeTrackLike, name: string, artistId: number | null): Promise<boolean> {
  const sid = String(track.sid ?? '');
  if (!sid || !name.trim()) return false;
  try {
    await AncialAPI.pulseTrackActionWith('dislike_artist', sid, { artist: name, ...(artistId ? { artist_id: String(artistId) } : {}) });
    await reloadPulseDislikes();
    return true;
  } catch (error) {
    console.error('[Pulse] dislike artist failed', error);
    return false;
  }
}

export async function undislikeArtist(item: PulseDislikedArtist): Promise<boolean> {
  try {
    // id трека серверу нужен только как «валидный запрос»: берём любой известный или 1 — он не используется для исполнителя
    const anchor = [...snapshot.trackIds][0] ?? 1;
    await AncialAPI.pulseTrackActionWith('undislike_artist', anchor, { artist: item.label || item.key, ...(item.artistId ? { artist_id: String(item.artistId) } : {}) });
    await reloadPulseDislikes();
    return true;
  } catch (error) {
    console.error('[Pulse] undislike artist failed', error);
    return false;
  }
}

/** Запомнить ответ (или сбросить: значение null). */
export async function rememberPulseChoice(patch: { dislike_favorite?: 'remove' | 'keep' | null; play_disliked?: 'play' | 'ask' | null }) {
  const next: PulseRememberedChoices = { ...snapshot.remembered };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete next[key as keyof PulseRememberedChoices];
    else (next as Record<string, string>)[key] = value as string;
  }
  setSnapshot({ ...snapshot, remembered: next });
  try {
    await AncialAPI.pulseSavePrefs({ remembered: patch });
  } catch (error) {
    console.error('[Pulse] prefs save failed', error);
  }
}

// ───────────── Диалоги (рисует PulseDislikeHost) ─────────────

export function openPulseDislikeDialog(next: PulseDislikeDialog) {
  dialog = next;
  for (const listener of dialogListeners) listener();
}

export function closePulseDislikeDialog() {
  dialog = null;
  for (const listener of dialogListeners) listener();
}

export function usePulseDislikeDialog() {
  return useSyncExternalStore(
    (listener) => { dialogListeners.add(listener); return () => { dialogListeners.delete(listener); }; },
    () => dialog,
    () => null,
  );
}

/**
 * Клик «играть» по строке: отмеченный трек сначала спрашиваем (если не запомнено «играть сразу»).
 * Возвращает true, если запуск отложен до ответа пользователя.
 */
export function guardPlayDisliked(track: DislikeTrackLike, play: () => void): boolean {
  if (!isTrackDisliked(track, snapshot)) return false;
  if (snapshot.remembered.play_disliked === 'play') return false;
  openPulseDislikeDialog({ kind: 'play', track, play });
  return true;
}
