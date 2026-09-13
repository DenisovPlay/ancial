'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cache } from '../../lib/cache.ts';

const EQ_BANDS = [60, 230, 910, 3600, 14000];

type WebkitAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function hasCoarsePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export function shouldDisableWebAudioForDevice() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const maybeMobileByUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const maybeTouchDesktop = userAgent.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document;
  const maybeMobileByPointer = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0 && hasCoarsePointer();
  return maybeMobileByUA || maybeTouchDesktop || maybeMobileByPointer;
}

function readSavedEqGains() {
  if (typeof window === 'undefined') return [0, 0, 0, 0, 0];

  try {
    const parsed = cache.get<number[]>('pulse-eq-bands');
    if (Array.isArray(parsed) && parsed.length === EQ_BANDS.length) return parsed;
  } catch {
    // Fall back to flat EQ.
  }

  return [0, 0, 0, 0, 0];
}

type WebAudioGraph = {
  context: AudioContext;
  filters: BiquadFilterNode[];
  source: MediaElementAudioSourceNode;
};

/**
 * createMediaElementSource() привязывает элемент к контексту навсегда: повторный вызов
 * кидает InvalidStateError, а close() контекста оставляет элемент немым без шансов на
 * восстановление. Поэтому граф живёт рядом с самим элементом и переиспользуется —
 * это переживает ремаунт провайдера (в том числе fast-refresh в деве).
 */
const graphByElement = new WeakMap<HTMLAudioElement, WebAudioGraph>();

export function useEqualizer(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const [eqGains, setEqGains] = useState<number[]>(readSavedEqGains);
  const gainsRef = useRef(eqGains);

  useEffect(() => {
    gainsRef.current = eqGains;
  }, [eqGains]);

  const initWebAudio = useCallback(() => {
    if (typeof window === 'undefined' || shouldDisableWebAudioForDevice()) return;
    if (!audioRef.current || audioContextRef.current) return;

    const element = audioRef.current;

    // Элемент уже подключён (ремаунт провайдера) — переиспользуем граф вместо
    // повторного createMediaElementSource, который бы бросил InvalidStateError.
    const existingGraph = graphByElement.get(element);
    if (existingGraph) {
      audioContextRef.current = existingGraph.context;
      sourceNodeRef.current = existingGraph.source;
      filtersRef.current = existingGraph.filters;
      existingGraph.filters.forEach((filter, index) => {
        filter.gain.value = gainsRef.current[index] ?? 0;
      });
      return;
    }

    try {
      const AudioContextConstructor = window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;
      if (!AudioContextConstructor) return;

      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaElementSource(element);
      const filters = EQ_BANDS.map((frequency, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = index === 0 ? 'lowshelf' : index === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = frequency;
        filter.gain.value = gainsRef.current[index];
        if (filter.type === 'peaking') filter.Q.value = 1;
        return filter;
      });

      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      filtersRef.current = filters;
      source.connect(filters[0]);
      filters.slice(0, -1).forEach((filter, index) => filter.connect(filters[index + 1]));
      filters[filters.length - 1].connect(audioContext.destination);
      graphByElement.set(element, { context: audioContext, filters, source });
    } catch (error) {
      console.warn('Failed to initialize Web Audio API', error);
    }
  }, [audioRef]);

  const changeEqGain = useCallback((index: number, nextGain: number) => {
    setEqGains((previous) => {
      const next = [...previous];
      next[index] = nextGain;
      cache.set('pulse-eq-bands', next, { category: 'pulse' });
      return next;
    });
    if (filtersRef.current[index]) filtersRef.current[index].gain.value = nextGain;
  }, []);

  const resetEqGains = useCallback(() => {
    const next = EQ_BANDS.map(() => 0);
    setEqGains(next);
    cache.set('pulse-eq-bands', next, { category: 'pulse' });
    filtersRef.current.forEach((filter) => { filter.gain.value = 0; });
  }, []);

  // Граф намеренно не разбирается при размонтировании: он принадлежит аудио-элементу,
  // а не хуку. Disconnect или close() здесь сделали бы элемент немым навсегда — отключить
  // его от контекста уже нельзя, а новый контекст к нему подключить не даст браузер.

  const resumeWebAudio = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      void audioContextRef.current.resume();
    }
  }, []);

  /**
   * Есть ли смысл вообще поднимать граф. Пока полосы на нуле, WebAudio не даёт ничего,
   * зато делает звук заложником аудио-контекста: тот может умереть ("error from the audio
   * device or the WebAudio renderer"), а отвязать элемент обратно уже нельзя — выйдет
   * полная тишина. Поэтому по умолчанию играем напрямую в динамики.
   */
  const hasActiveEq = useCallback(() => gainsRef.current.some((gain) => gain !== 0), []);

  return { changeEqGain, eqGains, hasActiveEq, initWebAudio, resetEqGains, resumeWebAudio };
}
