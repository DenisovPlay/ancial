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

// Вторичные кнопки: включённое состояние выглядит ровно как hover — без акцентного цвета.
const secondaryButton = 'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 active:scale-95 hover:border-zinc-600/30 hover:bg-white/10';

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
  const isRepeatOn = repeatMode !== 'none';

  return (
    <div className="mt-3 flex w-full items-center gap-3 lg:mt-6">
      {/* Боковые группы равной ширины — иначе play уезжает из центра. */}
      <div className="flex flex-1 items-center justify-start">
        <button
          type="button"
          onClick={onOpenQueue}
          title={lang?.pulse_queue_title || 'Очередь воспроизведения'}
          className={cn(secondaryButton, !hasQueue && 'cursor-not-allowed opacity-30 hover:border-transparent hover:bg-transparent')}
        >
          <Icon name="IC-list-ul" className="h-5 w-5 fill-white" />
        </button>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-6 lg:gap-9">
        <button
          type="button"
          onClick={onPrev}
          title={lang?.pulse_prev_track || 'Предыдущий трек'}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 active:scale-95 hover:border-zinc-600/30 hover:bg-white/10"
        >
          <Icon name="IC-moveback" className="h-9 w-9 fill-white" />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-purple-500 shadow duration-300 hover:bg-purple-400 active:scale-95"
        >
          <Icon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-10 w-10 fill-white" />
        </button>
        <button
          type="button"
          onClick={onNext}
          title={lang?.pulse_next_track || 'Следующий трек'}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 active:scale-95 hover:border-zinc-600/30 hover:bg-white/10"
        >
          <Icon name="IC-moveforward" className="h-9 w-9 fill-white" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-end">
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
          className={cn(secondaryButton, isRepeatOn && 'border-zinc-600/30 bg-white/10')}
        >
          <Icon
            name={repeatMode === 'one' ? 'IC-repeat-one' : 'IC-repeat'}
            className={cn('h-5 w-5 fill-white', !isRepeatOn && 'opacity-60')}
          />
        </button>
      </div>
    </div>
  );
}
