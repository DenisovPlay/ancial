'use client';

import type { RefObject } from 'react';

import { formatPlaybackTime } from './player-utils';
import { PulseRangeTrack } from './pulse-range-track';

type PulsePlayerFullArtworkProps = {
  displayedCurrentTime: number;
  duration: number;
  mobileCurrentTimeLabelRef: RefObject<HTMLDivElement | null>;
  mobileSeekInputRef: RefObject<HTMLInputElement | null>;
  onSeekCancel: () => void;
  onSeekChange: (value: number) => void;
  onSeekStart: () => void;
  onSeekSubmit: () => void;
  lang?: Record<string, string> | null;
};

/** Seek presentation for full player mode. Seek ownership stays in the provider. */
export function PulsePlayerFullArtwork({
  displayedCurrentTime,
  duration,
  mobileCurrentTimeLabelRef,
  mobileSeekInputRef,
  onSeekCancel,
  onSeekChange,
  onSeekStart,
  onSeekSubmit,
  lang,
}: PulsePlayerFullArtworkProps) {
  return (
    <div className="group relative mt-3 flex w-full flex-col items-center justify-center">
      <PulseRangeTrack
        min={0}
        max={duration || 0}
        step="0.01"
        aria-label={lang?.pulse_seek || 'Перемотка'}
        value={displayedCurrentTime}
        inputRef={mobileSeekInputRef}
        onPointerDown={onSeekStart}
        onPointerUp={onSeekSubmit}
        onPointerCancel={onSeekCancel}
        onLostPointerCapture={onSeekCancel}
        onChange={(event) => onSeekChange(Number(event.target.value))}
      />

      {/* На ПК тайминги вне потока и появляются при наведении — место под полосой не держат. */}
      <div className="flex w-full text-xs tabular-nums text-zinc-400 transition-opacity duration-300 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-4 lg:text-sm lg:opacity-0 lg:group-hover:opacity-100">
        <div ref={mobileCurrentTimeLabelRef} className="flex-grow">{formatPlaybackTime(displayedCurrentTime)}</div>
        <div>{formatPlaybackTime(duration)}</div>
      </div>
    </div>
  );
}
