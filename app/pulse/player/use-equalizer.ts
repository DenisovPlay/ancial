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

    try {
      const AudioContextConstructor = window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;
      if (!AudioContextConstructor) return;

      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaElementSource(audioRef.current);
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

  useEffect(() => () => {
    try { sourceNodeRef.current?.disconnect(); } catch { /* ignore cleanup errors */ }
    filtersRef.current.forEach((filter) => { try { filter.disconnect(); } catch { /* ignore cleanup errors */ } });
    if (audioContextRef.current) void audioContextRef.current.close().catch(() => { /* ignore cleanup errors */ });
  }, []);

  const resumeWebAudio = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      void audioContextRef.current.resume();
    }
  }, []);

  return { changeEqGain, eqGains, initWebAudio, resetEqGains, resumeWebAudio };
}
