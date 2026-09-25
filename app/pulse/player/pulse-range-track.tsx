'use client';

import { useEffect, type CSSProperties, type InputHTMLAttributes, type RefObject } from 'react';

import { cn } from './player-utils';

/**
 * Пишет долю заполнения в CSS-переменную обёртки — дорожка и ползунок читают её без React-рендеров.
 * smoothMs > 0 — дорожка доезжает до значения линейно за это время: так редкие (4 раза в секунду)
 * обновления при воспроизведении выглядят плавно без покадрового цикла. Перемотка, смена трека
 * и перетаскивание пишут без сглаживания — дорожка прыгает сразу.
 */
export function setRangeProgressVar(input: HTMLInputElement, smoothMs = 0) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 0;
  const value = Number(input.value) || 0;
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const wrapper = input.parentElement;
  if (!wrapper) return;
  wrapper.style.setProperty('--pulse-progress-ease', `${Math.max(0, Math.round(smoothMs))}ms`);
  wrapper.style.setProperty('--pulse-progress', `${Math.min(100, Math.max(0, percent))}%`);
}

type PulseRangeTrackProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'type'> & {
  className?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Задан — заполнение ведёт React (громкость). Не задан — переменную пишет rAF-цикл перемотки. */
  progressPercent?: number;
};

export function PulseRangeTrack({ className, inputRef, onChange, progressPercent, ...inputProps }: PulseRangeTrackProps) {
  // Выключенная дорожка (слушатель в совместном прослушивании): гасим и не ловим нажатия.
  const isDisabled = Boolean(inputProps.disabled);
  const { max: inputMax, min: inputMin, value: inputValue } = inputProps;
  // Заполнение обычно двигает rAF-цикл локального аудио. Но его нет, когда звук идёт на другом
  // устройстве или плеер стоит на паузе: тогда дорожку ведут пропсы, иначе она бы застыла.
  useEffect(() => {
    if (progressPercent !== undefined || !inputRef?.current) return;
    setRangeProgressVar(inputRef.current);
  }, [inputMax, inputMin, inputRef, inputValue, progressPercent]);

  return (
    <div
      className={cn('group/track relative flex h-4 w-full items-center', isDisabled && 'pointer-events-none opacity-40', className)}
      style={progressPercent === undefined ? undefined : ({ '--pulse-progress': `${progressPercent}%` } as CSSProperties)}
    >
      <div className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/20 transition-[height] duration-300 lg:group-hover/track:h-1.5">
        {/* Сглаживание только между тиками воспроизведения (--pulse-progress-ease), перемотка — мгновенно. */}
        <div
          className="h-full rounded-full bg-white"
          style={{ width: 'var(--pulse-progress, 0%)', transition: 'width var(--pulse-progress-ease, 0ms) linear' }}
        />
      </div>

      {/* На тач-устройствах ховера нет — ползунок виден всегда, на десктопе появляется при наведении. */}
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow lg:opacity-0 lg:group-hover/track:opacity-100"
        style={{
          left: 'var(--pulse-progress, 0%)',
          transitionProperty: 'opacity, left',
          transitionDuration: '300ms, var(--pulse-progress-ease, 0ms)',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1), linear',
        }}
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
