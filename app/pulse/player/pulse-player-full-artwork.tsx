'use client';

import type { RefObject } from 'react';

import { formatPlaybackTime } from './player-utils';

type PulsePlayerFullArtworkProps = {
  displayedCurrentTime: number;
  duration: number;
  mobileCurrentTimeLabelRef: RefObject<HTMLDivElement | null>;
  mobileSeekInputRef: RefObject<HTMLInputElement | null>;
  onSeekCancel: () => void;
  onSeekChange: (value: number) => void;
  onSeekStart: () => void;
  onSeekSubmit: () => void;
};

/** Mobile seek presentation for full player mode. Seek ownership stays in the provider. */
export function PulsePlayerFullArtwork({
  displayedCurrentTime,
  duration,
  mobileCurrentTimeLabelRef,
  mobileSeekInputRef,
  onSeekCancel,
  onSeekChange,
  onSeekStart,
  onSeekSubmit,
}: PulsePlayerFullArtworkProps) {
  return (
    <div className="mt-3 flex w-full max-w-sm flex-col items-center justify-center gap-1 duration-300">
      <input
        min={0}
        max={duration || 0}
        step="0.01"
        type="range"
        value={displayedCurrentTime}
        onPointerDown={onSeekStart}
        onPointerUp={onSeekSubmit}
        onPointerCancel={onSeekCancel}
        onLostPointerCapture={onSeekCancel}
        onChange={(event) => onSeekChange(Number(event.target.value))}
        className="h-3 w-full appearance-none rounded-full bg-zinc-800 accent-purple-500"
        ref={mobileSeekInputRef}
      />
      <div className="flex w-full text-xs text-zinc-300 duration-300 lg:text-sm">
        <div ref={mobileCurrentTimeLabelRef} className="flex-grow">{formatPlaybackTime(displayedCurrentTime)}</div>
        <div>{formatPlaybackTime(duration)}</div>
      </div>
    </div>
  );
}
