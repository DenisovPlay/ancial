'use client';

import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react';

import { formatPlaybackTime } from './player-utils';

type SeekTarget = 'desktop' | 'mobile' | null;

/** Keeps native range inputs visually in sync without triggering React renders per frame. */
export function useVisualAudioProgress(
  audioRef: RefObject<HTMLAudioElement | null>,
  seekingSliderRef: MutableRefObject<SeekTarget>,
) {
  const visualProgressFrameRef = useRef<number | null>(null);
  const mobileSeekInputRef = useRef<HTMLInputElement | null>(null);
  const desktopSeekInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCurrentTimeLabelRef = useRef<HTMLDivElement | null>(null);
  const desktopCurrentTimeLabelRef = useRef<HTMLDivElement | null>(null);

  const syncVisualProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || seekingSliderRef.current) return;

    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const value = String(currentTime);
    const max = String(duration || 0);

    [mobileSeekInputRef.current, desktopSeekInputRef.current].forEach((slider) => {
      if (!slider) return;
      slider.max = max;
      slider.value = value;
    });

    const formattedTime = formatPlaybackTime(currentTime);
    if (mobileCurrentTimeLabelRef.current) mobileCurrentTimeLabelRef.current.textContent = formattedTime;
    if (desktopCurrentTimeLabelRef.current) desktopCurrentTimeLabelRef.current.textContent = formattedTime;
  }, [audioRef, seekingSliderRef]);

  const stopVisualProgressLoop = useCallback(() => {
    if (visualProgressFrameRef.current !== null) {
      window.cancelAnimationFrame(visualProgressFrameRef.current);
      visualProgressFrameRef.current = null;
    }
  }, []);

  const startVisualProgressLoop = useCallback(() => {
    stopVisualProgressLoop();

    const tick = () => {
      syncVisualProgress();
      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.ended) {
        visualProgressFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        visualProgressFrameRef.current = null;
      }
    };

    visualProgressFrameRef.current = window.requestAnimationFrame(tick);
  }, [audioRef, stopVisualProgressLoop, syncVisualProgress]);

  useEffect(() => stopVisualProgressLoop, [stopVisualProgressLoop]);

  return {
    desktopCurrentTimeLabelRef,
    desktopSeekInputRef,
    mobileCurrentTimeLabelRef,
    mobileSeekInputRef,
    startVisualProgressLoop,
    stopVisualProgressLoop,
    syncVisualProgress,
  };
}
