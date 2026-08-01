'use client';

import type { ComponentType } from 'react';

type PlayerIcon = ComponentType<{ className?: string; name: string }>;

type PulsePlayerFullControlsProps = {
  Icon: PlayerIcon;
  isPlaying: boolean;
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
};

/** Full-player control row — prev / play-pause / next only. All other actions live in the title row. */
export function PulsePlayerFullControls({
  Icon,
  isPlaying,
  onNext,
  onPrev,
  onTogglePlay,
}: PulsePlayerFullControlsProps) {
  return (
    <div className="flex w-full max-w-sm items-center justify-center">
      <div className="mt-3 flex items-center gap-3 duration-300 lg:gap-6">
        <button type="button" onClick={onPrev}>
          <Icon name="IC-moveback" className="h-10 w-10 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95"
        >
          <Icon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-12 w-12 fill-white" />
        </button>
        <button type="button" onClick={onNext}>
          <Icon name="IC-moveforward" className="h-10 w-10 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
        </button>
      </div>
    </div>
  );
}
