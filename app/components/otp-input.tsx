'use client';

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

import { cn } from '../lib/cn';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  /** Фон клетки — чтобы совпадал с окружением (на логине инпуты bg-zinc-900). */
  bgClass?: string;
};

/**
 * Сегментированный ввод одноразового кода: одна клетка на цифру.
 * Работает с набором на ПК/телефоне, вставкой, стиранием, стрелками.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  autoFocus,
  ariaLabel,
  bgClass = 'bg-zinc-800',
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focusAt = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    refs.current[clamped]?.focus();
  };

  const emit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const setAt = (index: number, char: string) => {
    const arr = Array.from({ length }, (_, i) => value[i] ?? '');
    arr[index] = char;
    return emit(arr.join(''));
  };

  const handleChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value.replace(/\D/g, '');
    if (!typed) {
      // Символ стёрли внутри клетки.
      setAt(index, '');
      return;
    }
    if (typed.length <= 2) {
      // Ввод одной цифры (в т.ч. поверх заполненной клетки — берём последнюю набранную).
      setAt(index, typed[typed.length - 1]);
      if (index < length - 1) focusAt(index + 1);
      return;
    }
    // Ввели/вставили несколько цифр в одну клетку — раскладываем начиная с неё.
    const arr = Array.from({ length }, (_, i) => value[i] ?? '');
    let cursor = index;
    for (const ch of typed) {
      if (cursor >= length) break;
      arr[cursor] = ch;
      cursor += 1;
    }
    const clean = emit(arr.join(''));
    focusAt(Math.min(clean.length, length - 1));
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        setAt(index, '');
      } else if (index > 0) {
        setAt(index - 1, '');
        focusAt(index - 1);
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const clean = emit(pasted);
    focusAt(Math.min(clean.length, length - 1));
  };

  return (
    <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2" role="group" aria-label={ariaLabel}>
      {digits.map((digit, index) => (
        <input
          ref={(el) => { refs.current[index] = el; }}
          key={index}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d*"
          value={digit}
          disabled={disabled}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          aria-label={`${ariaLabel || 'Код'} ${index + 1}`}
          className={cn(
            // Ровные круги: одинаковые ширина/высота + rounded-full.
            'aspect-square min-w-0 flex-1 max-w-12 rounded-full border text-center text-base font-semibold text-white',
            bgClass,
            // Гасим ЛЮБОЕ белое мигание при фокусе/вводе: нативный вид, обводка, каретка,
            // выделение и мобильный tap-highlight. Фокус показываем только цветом рамки.
            'appearance-none outline-none caret-transparent duration-300 focus:outline-none focus:ring-0 focus:border-purple-500',
            '[-webkit-tap-highlight-color:transparent] [&::selection]:bg-transparent',
            digit ? 'border-zinc-600/60' : 'border-zinc-600/30',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
        />
      ))}
    </div>
  );
}
