/**
 * События прослушивания для рекомендаций: «доиграл» (kind 2) и «пропустил» (kind 3).
 * Копятся в памяти и уходят пачкой: раз в 30 секунд, при уходе со страницы и когда накопилось 20.
 * Серверная сторона — php-v2-api/.../modules/pulse/events.php (лимиты, проверка треков).
 */

import { AncialAPI } from '../../lib/api-v2';

export type PulseEventSource = 'wave' | 'radio' | 'daily' | 'your' | 'playlist' | 'search' | 'artist' | 'other';

interface QueuedEvent {
  /** Id трека в базе; у виртуального трека Яндекса (ext_yandex_123) — 0, тогда сервер берёт external_id и заводит его в базу. */
  song_id: number;
  external_id?: string;
  /** 1 — «старт» (только завести виртуальный трек в базу), 2 — доиграл, 3 — пропустил. */
  kind: 1 | 2 | 3;
  ratio: number;
  src: PulseEventSource;
  at: number;
}

const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_BATCH = 20;
const MAX_QUEUE = 200;
/** Доля прослушанного, с которой трек считается доигранным. */
export const PULSE_FINISH_RATIO = 85;

let queue: QueuedEvent[] = [];
let enabled = false;
let installed = false;
let sending = false;

/** Источник события по ключу коллекции плеера (radio_5, -5, artist_12, 17 …). */
export function pulseEventSourceOf(collectionId: string): PulseEventSource {
  if (collectionId.startsWith('radio_')) return 'radio';
  if (collectionId === 'wave') return 'wave';
  if (collectionId.startsWith('daily_') || /^-1[123]$/.test(collectionId)) return 'daily';
  if (collectionId === '-5' || collectionId === 'playlist_-5') return 'your';
  if (collectionId.startsWith('artist_')) return 'artist';
  if (/^-?\d+$/.test(collectionId)) return 'playlist';
  return 'other';
}

/** Событие по текущему положению: на 85% и дальше — «доиграл», раньше — «пропустил». */
export function pulseEventKindFor(ratio: number): 2 | 3 {
  return ratio >= PULSE_FINISH_RATIO ? 2 : 3;
}

async function flush() {
  if (sending || !enabled || queue.length === 0) return;
  sending = true;
  const batch = queue.splice(0, 30);
  const now = Date.now();
  try {
    await AncialAPI.pulseSendEvents(batch.map((event) => ({
      song_id: event.song_id,
      external_id: event.external_id,
      kind: event.kind,
      ratio: event.ratio,
      src: event.src,
      ago: Math.max(0, Math.round((now - event.at) / 1000)),
    })));
  } catch {
    // сеть/лимит: возвращаем пачку в начало очереди (в пределах размера), следующая попытка — по таймеру
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
  } finally {
    sending = false;
  }
}

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
  window.addEventListener('pagehide', () => void flush());
}

export function setPulseEventsEnabled(next: boolean) {
  enabled = next;
  if (next) install();
  else queue = [];
}

/** Ключ виртуального трека (`ext_<сервис>_<id>`) из sid, иначе пусто. */
export function pulseExternalKeyOf(sid: unknown): string {
  return typeof sid === 'string' && /^ext_[a-z]+_[A-Za-z0-9:_-]{1,40}$/.test(sid) ? sid : '';
}

export function queuePulseEvent(event: { songId: number; externalId?: string; ratio: number; src: PulseEventSource; start?: boolean }) {
  const externalId = event.songId > 0 ? '' : (event.externalId ?? '');
  if (!enabled || (!(event.songId > 0) && !externalId)) return;
  const ratio = Math.max(0, Math.min(100, Math.round(event.ratio)));
  queue.push({
    song_id: event.songId,
    external_id: externalId || undefined,
    kind: event.start ? 1 : pulseEventKindFor(ratio),
    ratio,
    src: event.src,
    at: Date.now(),
  });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= FLUSH_BATCH) void flush();
}
