'use client';

import { useEffect, type CSSProperties, type InputHTMLAttributes, type RefObject } from 'react';

import { cn } from './player-utils';

/** Пишет долю заполнения в CSS-переменную обёртки — дорожка и ползунок читают её без React-рендеров. */
export function setRangeProgressVar(input: HTMLInputElement) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 0;
  const value = Number(input.value) || 0;
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  input.parentElement?.style.setProperty('--pulse-progress', `${Math.min(100, Math.max(0, percent))}%`);
}

type PulseRangeTrackProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'type'> & {
  className?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Задан — заполнение ведёт React (громкость). Не задан — переменную пишет rAF-цикл перемотки. */
  progressPercent?: number;
};

export function PulseRangeTrack({ className, inputRef, onChange, progressPercent, ...inputProps }: PulseRangeTrackProps) {
  // Стартовое заполнение до первого кадра цикла (например, плеер открыт на паузе).
  useEffect(() => {
    if (inputRef?.current) setRangeProgressVar(inputRef.current);
  }, [inputRef]);

  return (
    <div
      className={cn('group/track relative flex h-4 w-full items-center', className)}
      style={progressPercent === undefined ? undefined : ({ '--pulse-progress': `${progressPercent}%` } as CSSProperties)}
    >
      <div className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/20 transition-[height] duration-300 lg:group-hover/track:h-1.5">
        {/* Без transition: значение и так обновляется каждый кадр, сглаживание давало рывки. */}
        <div className="h-full rounded-full bg-white" style={{ width: 'var(--pulse-progress, 0%)' }} />
      </div>

      {/* На тач-устройствах ховера нет — ползунок виден всегда, на десктопе появляется при наведении. */}
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow transition-opacity duration-300 lg:opacity-0 lg:group-hover/track:opacity-100"
        style={{ left: 'var(--pulse-progress, 0%)' }}
      />

      <input
        {...inputProps}
        ref={inputRef}
        type="range"
        onChange={(event) => {
          setRangeProgressVar(event.currentTarget);
          onChange?.(event);
        }}
        className="pulse-seek-input relative h-4 w-full cursor-pointer appearance-none bg-transparent"
      />
    </div>
  );
}
