'use client';

import { useCallback, useEffect, useRef, type TouchEvent } from 'react';

import { haptic } from './haptics';

/** Сколько тянуть до срабатывания, сколько максимум (px). За порогом лента идёт с сопротивлением. */
const THRESHOLD = 84;
const MAX = 132;
const LOCK_PX = 8;
/** Подложка заходит под строку на столько px: скруглённые углы строки лежат на цвете, а не на пустоте. */
const TUCK_PX = 24;
const SPRING_MS = 500;

/** Цвет фона, на котором лежит строка (карточка списка или страница): на время жеста строка заливается им. */
function surfaceColor(row: HTMLElement): string {
  for (let node = row.parentElement; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor;
    if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
  }
  return '#000';
}

/** Строка — `currentTarget` жеста; подложки лежат в той же обёртке и помечены data-swipe-side. */
const sidesOf = (row: HTMLElement) => ({
  favorite: row.parentElement?.querySelector<HTMLElement>('[data-swipe-side="favorite"]') ?? null,
  queue: row.parentElement?.querySelector<HTMLElement>('[data-swipe-side="queue"]') ?? null,
});

/**
 * Жест на строке списка (телефон, как в Spotify и Telegram): вправо — одно действие, влево — другое (строки треков Pulse, список чатов).
 * Подложки лежат в той же обёртке рядом со строкой и помечены data-swipe-side="queue" (под правым свайпом) и "favorite" (под левым).
 * Строка идёт за пальцем, под ней проявляется цветная подложка с иконкой (по клипу: сколько освободилось — столько видно);
 * за порогом иконка «щёлкает» (data-armed, лёгкая вибрация), по отпусканию действие выполняется, строка пружинит назад.
 * Всё через DOM (currentTarget) без setState на каждый кадр. Вертикальная прокрутка не мешает: направление фиксируется по первым пикселям.
 */
export function useRowSwipe({
  enabled,
  onFavorite,
  onQueue,
}: {
  enabled: boolean;
  onFavorite: () => void;
  onQueue: () => void;
}) {
  const state = useRef<{ armed: boolean; lock: 'x' | 'y' | null; startX: number; startY: number } | null>(null);
  const swipedRef = useRef(false);
  const timerRef = useRef(0);
  const bgTimerRef = useRef(0);
  const handlers = useRef({ onFavorite, onQueue });

  useEffect(() => {
    handlers.current = { onFavorite, onQueue };
  });
  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
    window.clearTimeout(bgTimerRef.current);
  }, []);

  const reset = useCallback((row: HTMLElement, animate: boolean) => {
    row.style.transition = animate ? `transform ${SPRING_MS}ms cubic-bezier(0.32, 0.72, 0, 1)` : 'none';
    row.style.transform = '';
    // Заливку снимаем, когда строка вернулась на место.
    window.clearTimeout(bgTimerRef.current);
    bgTimerRef.current = window.setTimeout(() => { row.style.backgroundColor = ''; }, animate ? SPRING_MS : 0);
    Object.values(sidesOf(row)).forEach((element) => {
      if (!element) return;
      element.style.transition = animate ? 'opacity 0.3s ease-out' : 'none';
      element.style.opacity = '0';
      element.removeAttribute('data-armed');
    });
  }, []);

  const onTouchStart = useCallback((event: TouchEvent) => {
    if (!enabled || event.touches.length !== 1) return;
    const touch = event.touches[0];
    window.clearTimeout(bgTimerRef.current);
    state.current = { armed: false, lock: null, startX: touch.clientX, startY: touch.clientY };
  }, [enabled]);

  const onTouchMove = useCallback((event: TouchEvent) => {
    const current = state.current;
    const touch = event.touches[0];
    if (!current || !touch || current.lock === 'y') return;
    const dx = touch.clientX - current.startX;
    const dy = touch.clientY - current.startY;
    if (!current.lock) {
      if (Math.hypot(dx, dy) < LOCK_PX) return;
      current.lock = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
      if (current.lock === 'y') return;
    }
    const abs = Math.abs(dx);
    // Сопротивление за порогом: лента не уезжает бесконечно.
    const eased = Math.min(MAX, abs <= THRESHOLD ? abs : THRESHOLD + (abs - THRESHOLD) * 0.35);
    const sign = dx > 0 ? 1 : -1;
    const row = event.currentTarget as HTMLElement;
    const sides = sidesOf(row);
    const side = sign > 0 ? sides.queue : sides.favorite;
    const otherSide = sign > 0 ? sides.favorite : sides.queue;
    if (!side) return;

    row.style.transition = 'none';
    if (!row.style.backgroundColor) row.style.backgroundColor = surfaceColor(row);
    row.style.transform = `translate3d(${sign * eased}px, 0, 0)`;
    if (otherSide) otherSide.style.opacity = '0';
    // Подложка открывается ровно настолько, насколько ушла строка.
    side.style.transition = 'none';
    side.style.opacity = '1';
    const reach = eased + TUCK_PX;
    side.style.clipPath = sign > 0 ? `inset(0 calc(100% - ${reach}px) 0 0)` : `inset(0 0 0 calc(100% - ${reach}px))`;
    side.style.setProperty('--p', String(Math.min(1, eased / THRESHOLD)));
    const armed = abs >= THRESHOLD;
    if (armed !== current.armed) {
      current.armed = armed;
      if (armed) {
        side.setAttribute('data-armed', '');
        haptic('tick');
      } else {
        side.removeAttribute('data-armed');
      }
    }
  }, []);

  const onTouchEnd = useCallback((event: TouchEvent) => {
    const current = state.current;
    state.current = null;
    if (!current || current.lock !== 'x') return;
    const dx = event.changedTouches[0] ? event.changedTouches[0].clientX - current.startX : 0;
    // Жест не должен «нажать» кнопки строки под пальцем.
    swipedRef.current = true;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { swipedRef.current = false; }, 350);
    if (current.armed) {
      haptic('confirm');
      if (dx > 0) handlers.current.onQueue();
      else handlers.current.onFavorite();
    }
    reset(event.currentTarget as HTMLElement, true);
  }, [reset]);

  const onTouchCancel = useCallback((event: TouchEvent) => {
    if (state.current?.lock === 'x') reset(event.currentTarget as HTMLElement, true);
    state.current = null;
  }, [reset]);

  /** Сразу после жеста нажатия по строке гасим (вешается в capture). */
  const wasSwipe = useCallback(() => swipedRef.current, []);

  return { handlers: { onTouchCancel, onTouchEnd, onTouchMove, onTouchStart }, wasSwipe };
}
