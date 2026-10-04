'use client';

/**
 * Настройки Вейва на аккаунте (сервер — источник правды, localStorage — для мгновенного показа).
 * Общее хранилище на сайт: карточка на главной и окно настроек видят одно и то же.
 */

import { useEffect, useSyncExternalStore } from 'react';

import { AncialAPI } from '../../lib/api-v2';
import { cache } from '../../lib/cache';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_WAVE, normalizeWave, type PulseWavePrefs } from './wave-utils';

interface WaveSnapshot {
  wave: PulseWavePrefs;
  loaded: boolean;
}

const CACHE_OPTIONS = { category: 'pulse', subcategory: 'wave' } as const;
const CACHE_KEY = 'pulse_wave_prefs';
const SERVER_SNAPSHOT: WaveSnapshot = { wave: DEFAULT_WAVE, loaded: false };

let snapshot: WaveSnapshot = SERVER_SNAPSHOT;
let started = false;
const listeners = new Set<() => void>();

function setSnapshot(next: WaveSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function startWavePrefs() {
  if (started || typeof window === 'undefined') return;
  started = true;
  try {
    const cached = cache.get<Partial<PulseWavePrefs>>(CACHE_KEY, CACHE_OPTIONS);
    if (cached) setSnapshot({ wave: normalizeWave(cached), loaded: false });
  } catch {
    // нет кэша
  }
  void AncialAPI.pulseGetPrefs<{ wave?: Partial<PulseWavePrefs> }>()
    .then((prefs) => {
      const wave = normalizeWave(prefs?.wave);
      setSnapshot({ wave, loaded: true });
      try {
        cache.set(CACHE_KEY, wave, CACHE_OPTIONS);
      } catch {
        // кэш недоступен
      }
    })
    .catch((error) => console.error('[Pulse] Не удалось загрузить настройки Вейва', error));
}

/** Сохранить настройки; возвращает то, что записал сервер (он приводит значения к словарю). */
export async function saveWavePrefs(next: PulseWavePrefs): Promise<PulseWavePrefs> {
  const previous = snapshot.wave;
  setSnapshot({ wave: next, loaded: true });
  try {
    const prefs = await AncialAPI.pulseSavePrefs<{ wave?: Partial<PulseWavePrefs> }>({ wave: next });
    const saved = normalizeWave(prefs?.wave ?? next);
    setSnapshot({ wave: saved, loaded: true });
    try {
      cache.set(CACHE_KEY, saved, CACHE_OPTIONS);
    } catch {
      // кэш недоступен
    }
    return saved;
  } catch (error) {
    console.error('[Pulse] Не удалось сохранить настройки Вейва', error);
    setSnapshot({ wave: previous, loaded: true });
    throw error;
  }
}

export function usePulseWavePrefs() {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) startWavePrefs();
    else if (started) {
      started = false;
      setSnapshot(SERVER_SNAPSHOT);
    }
  }, [isAuthenticated]);
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
}
