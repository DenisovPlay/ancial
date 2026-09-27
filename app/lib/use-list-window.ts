'use client';

import { useCallback, useEffect, useState } from 'react';

/** Короче — рендерим всё: окно не нужно, поведение прежнее. */
const LIST_WINDOW_MIN_ROWS = 150;
/** Сколько строк держим отрендеренными за краями экрана (с каждой стороны). */
const LIST_WINDOW_OVERSCAN = 40;
/** Границы окна кратны шагу: при прокрутке окно сдвигается порциями, а не на каждой строке. */
const LIST_WINDOW_STEP = 20;
/** Шаг строки до первого замера (строка трека Pulse: обложка h-16 + gap-3). */
const DEFAULT_ROW_PITCH = 76;

type ListWindow = { key: string; start: number; end: number; pitch: number; gap: number };

/**
 * Окно рендера длинного списка строк одинаковой высоты в прокрутке окна (window).
 * Строки дальше LIST_WINDOW_OVERSCAN от экрана не монтируются: вместо них — распорки той же высоты
 * (`spacerBefore`/`spacerAfter`), поэтому высота страницы, прокрутка и её восстановление не меняются,
 * а разметка, картинки и слушатели дальних строк уходят из памяти.
 *
 * Разметка: контейнер с `ref={setListElement}`, строки — прямые дети с `data-list-row`, между ними — один `gap`.
 */
export function useListWindow(count: number, resetKey: string) {
  const enabled = count > LIST_WINDOW_MIN_ROWS;
  // Элемент списка — в состоянии: появился (данные загрузились) → эффект пересчитает окно.
  const [list, setListElement] = useState<HTMLDivElement | null>(null);
  const [range, setRange] = useState<ListWindow>({
    key: resetKey,
    start: 0,
    end: LIST_WINDOW_OVERSCAN * 2,
    pitch: DEFAULT_ROW_PITCH,
    gap: DEFAULT_ROW_PITCH - 64,
  });

  const update = useCallback(() => {
    if (!list) return;

    // Шаг строки — по уже отрендеренным строкам (разные брейкпоинты, шрифты), зазор — row-gap списка.
    let measured: { pitch: number; gap: number } | null = null;
    const rows = list.querySelectorAll<HTMLElement>(':scope > [data-list-row]');
    if (rows.length >= 2) {
      const pitch = rows[1].offsetTop - rows[0].offsetTop;
      const gap = Number.parseFloat(window.getComputedStyle(list).rowGap) || 0;
      if (pitch > 0 && gap < pitch) measured = { pitch, gap };
    }
    const top = list.getBoundingClientRect().top;
    const viewportHeight = window.innerHeight;

    setRange((prev) => {
      const { pitch, gap } = measured ?? prev;
      const firstVisible = Math.floor(-top / pitch);
      const lastVisible = Math.ceil((viewportHeight - top) / pitch);
      const start = Math.min(count, Math.max(0, Math.floor((firstVisible - LIST_WINDOW_OVERSCAN) / LIST_WINDOW_STEP) * LIST_WINDOW_STEP));
      const end = Math.max(start, Math.min(count, Math.ceil((lastVisible + LIST_WINDOW_OVERSCAN) / LIST_WINDOW_STEP) * LIST_WINDOW_STEP));

      if (prev.key === resetKey && prev.start === start && prev.end === end && prev.pitch === pitch && prev.gap === gap) return prev;
      return { key: resetKey, start, end, pitch, gap };
    });
  }, [count, list, resetKey]);

  useEffect(() => {
    if (!enabled) return undefined;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, update]);

  if (!enabled) {
    return { setListElement, start: 0, end: count, spacerBefore: 0, spacerAfter: 0 };
  }

  // Новый список (другой плейлист) — окно с начала, пока прокрутка не пересчитает его.
  const current = range.key === resetKey ? range : { ...range, start: 0, end: LIST_WINDOW_OVERSCAN * 2 };
  const start = Math.min(current.start, count);
  const end = Math.min(Math.max(current.end, start), count);
  const { pitch, gap } = current;
  // Распорка встаёт в ряд со строками и сама получает gap — вычитаем его, чтобы высота совпала.
  const spacer = (rows: number) => (rows > 0 ? rows * pitch - gap : 0);

  return {
    setListElement,
    start,
    end,
    spacerBefore: spacer(start),
    spacerAfter: spacer(count - end),
  };
}
