'use client';

import type { ComponentType } from 'react';
import { cn } from './player-utils';

type PlayerIcon = ComponentType<{ className?: string; name: string }>;

export type RepeatMode = 'none' | 'all' | 'one';

type PulsePlayerFullControlsProps = {
  Icon: PlayerIcon;
  isPlaying: boolean;
  repeatMode?: RepeatMode;
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
  onToggleRepeat?: () => void;
  onOpenQueue?: () => void;
  hasQueue?: boolean;
  lang?: Record<string, string> | null;
};

/**
 * Full-player control row:
 * Queue button on far left edge, playback controls (prev, play/pause, next) centered, Repeat button on far right edge.
 */
export function PulsePlayerFullControls({
  Icon,
  isPlaying,
  repeatMode = 'none',
  onNext,
  onPrev,
  onTogglePlay,
  onToggleRepeat,
  onOpenQueue,
  hasQueue = true,
  lang,
}: PulsePlayerFullControlsProps) {
  return (
    <div className="flex w-full max-w-sm items-center justify-between px-3 lg:px-0 mt-3">
      {/* Queue button — far left edge */}
      <button
        type="button"
        onClick={onOpenQueue}
        title={lang?.pulse_queue_title || 'Очередь воспроизведения'}
        className={cn(
          'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all duration-300 active:scale-95 hover:bg-white/10',
          hasQueue ? 'opacity-100' : 'opacity-40 cursor-not-allowed',
        )}
      >
        <Icon name="IC-list-ul" className="h-6 w-6 fill-white duration-300 hover:fill-purple-300" />
      </button>

      {/* Playback controllers — centered */}
      <div className="flex items-center gap-3 duration-300 lg:gap-5">
        <button type="button" onClick={onPrev} title="Предыдущий трек">
          <Icon name="IC-moveback" className="h-10 w-10 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95"
        >
          <Icon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-12 w-12 fill-white" />
        </button>
        <button type="button" onClick={onNext} title="Следующий трек">
          <Icon name="IC-moveforward" className="h-10 w-10 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
        </button>
      </div>

      {/* Repeat Mode button — far right edge */}
      <button
        type="button"
        onClick={onToggleRepeat}
        title={
          repeatMode === 'one'
            ? (lang?.pulse_repeat_one || 'Повтор текущего трека')
            : repeatMode === 'all'
              ? (lang?.pulse_repeat_all || 'Повтор всех треков')
              : (lang?.pulse_repeat_off || 'Повтор выключен')
        }
        className={cn(
          'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all duration-300 active:scale-95 hover:bg-white/10',
          repeatMode !== 'none' ? 'bg-purple-500/20 text-purple-400' : 'opacity-60 text-white',
        )}
      >
        <Icon
          name={repeatMode === 'one' ? 'IC-repeat-one' : 'IC-repeat'}
          className={cn(
            'h-6 w-6 duration-300',
            repeatMode !== 'none' ? 'fill-purple-400' : 'fill-white hover:fill-zinc-300',
          )}
        />
      </button>
    </div>
  );
}
