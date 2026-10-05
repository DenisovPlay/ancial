/**
 * Виртуальные треки Яндекса (sid `ext_yandex_123`) получают id в music_songs после первого взаимодействия
 * (запуск, лайк, «В плейлист», «Радио»…). Общее хранилище «ключ → id»: плеер и строки списков после этого
 * считают трек обычным (лайк, история, текст песни, пульт). Чистые функции + useSyncExternalStore-хук.
 */

import { useSyncExternalStore } from 'react';

import { pulseExternalKeyOf } from './pulse-events';

const EMPTY: Record<string, number> = {};
let resolved: Record<string, number> = EMPTY;
const listeners = new Set<() => void>();

export const getResolvedExternalIds = () => resolved;

/** true — соответствие новое. */
export function registerResolvedExternalId(key: string, songId: number): boolean {
  if (!key || !(songId > 0) || resolved[key] === songId) return false;
  resolved = { ...resolved, [key]: songId };
  listeners.forEach((listener) => listener());
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useResolvedExternalIds(): Record<string, number> {
  return useSyncExternalStore(subscribe, getResolvedExternalIds, () => EMPTY);
}

/** id в базе: настоящий sid, либо id, который сервер дал виртуальному треку. 0 — пока нет. */
export function songIdWith(map: Record<string, number>, sid: unknown): number {
  const direct = Number.parseInt(String(sid ?? ''), 10);
  return (Number.isFinite(direct) ? direct : 0) || map[pulseExternalKeyOf(sid)] || 0;
}
