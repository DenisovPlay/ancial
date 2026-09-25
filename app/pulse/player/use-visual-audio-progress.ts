'use client';

import { useCallback, useRef, type MutableRefObject, type RefObject } from 'react';

import { formatPlaybackTime } from './player-utils';
import { setRangeProgressVar } from './pulse-range-track';

type SeekTarget = 'desktop' | 'mobile' | null;

/**
 * Шаг обновления прогресса при воспроизведении (его задаёт таймер плеера). Дорожка доезжает
 * между шагами CSS-переходом той же длины — покадровый цикл для плавности не нужен.
 */
export const VISUAL_PROGRESS_STEP_MS = 250;
/** Скачок больше этого (перемотка, новый трек) рисуем сразу, без сглаживания. */
const MAX_SMOOTH_JUMP_SECONDS = 1;

/** Keeps native range inputs visually in sync without triggering React renders per frame. */
export function useVisualAudioProgress(
  audioRef: RefObject<HTMLAudioElement | null>,
  seekingSliderRef: MutableRefObject<SeekTarget>,
) {
  const mobileSeekInputRef = useRef<HTMLInputElement | null>(null);
  const desktopSeekInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCurrentTimeLabelRef = useRef<HTMLDivElement | null>(null);
  const desktopCurrentTimeLabelRef = useRef<HTMLDivElement | null>(null);
  const lastSyncedTimeRef = useRef<number | null>(null);

  const syncVisualProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || seekingSliderRef.current) return;

    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const value = String(currentTime);
    const max = String(duration || 0);

    // Обычный шаг воспроизведения — сглаживаем; перемотку, паузу и смену трека — рисуем сразу.
    const previousTime = lastSyncedTimeRef.current;
    lastSyncedTimeRef.current = currentTime;
    const step = previousTime === null ? -1 : currentTime - previousTime;
    const smoothMs = !audio.paused && step > 0 && step <= MAX_SMOOTH_JUMP_SECONDS ? VISUAL_PROGRESS_STEP_MS : 0;

    [mobileSeekInputRef.current, desktopSeekInputRef.current].forEach((slider) => {
      if (!slider) return;
      slider.max = max;
      slider.value = value;
      // Нативный инпут невидим — видимую дорожку двигает эта переменная.
      setRangeProgressVar(slider, smoothMs);
    });

    // Время меняется раз в секунду — DOM трогаем только тогда.
    const formattedTime = formatPlaybackTime(currentTime);
    [mobileCurrentTimeLabelRef.current, desktopCurrentTimeLabelRef.current].forEach((label) => {
      if (label && label.textContent !== formattedTime) label.textContent = formattedTime;
    });
  }, [audioRef, seekingSliderRef]);

  return {
    desktopCurrentTimeLabelRef,
    desktopSeekInputRef,
    mobileCurrentTimeLabelRef,
    mobileSeekInputRef,
    syncVisualProgress,
  };
}
