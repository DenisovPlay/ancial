'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import type { PulseTrack } from '../../context/PulsePlayerContext';
import { useIsListenFollower } from './listen-along';
import { getPlayerTrackArtwork } from './player-utils';

/** Сколько обложек видно по каждую сторону от текущей. */
const VISIBLE_SIDE = 3;
/** Сдвиг по горизонтали в долях размера обложки: первая соседняя ближе к центру, дальше — плотнее. */
const FIRST_GAP = 0.62;
const NEXT_GAP = 0.26;
/** Масштаб текущей обложки и боковых (боковые чуть меньше). */
const CENTER_SCALE = 1.14;
const SIDE_SCALE = 0.86;
/** Размер обложки — доли контейнера по высоте и ширине (меньшая из двух). */
const SIZE_H = 0.78;
const SIZE_W = 0.4;
const TILT_DEG = 58;
/** Время «догонять» цель, мс: меньше — резче, больше — мягче (экспоненциальное приближение, прерывается пальцем). */
const SETTLE_TAU_MS = 85;
/** Порог перелистывания: доля шага. Скорость жеста «бросает» ленту дальше: проекция на столько мс вперёд. */
const COMMIT_RATIO = 0.3;
const INERTIA_MS = 180;
/** Обложек в разметке по каждую сторону от ближайшей к позиции: с запасом за видимыми, чтобы они не возникали в кадре. */
const RENDER_SIDE = VISIBLE_SIDE + 2;

/** Положение обложки по дробному смещению от центра: всё непрерывно, поэтому обложки идут за пальцем. */
function placeCover(element: HTMLElement, offset: number) {
  const abs = Math.abs(offset);
  const dir = Math.sign(offset);
  const tilt = Math.min(abs, 1);
  const shift = (abs <= 1 ? FIRST_GAP * abs : FIRST_GAP + (abs - 1) * NEXT_GAP) * dir;
  const fade = Math.min(1, Math.max(0, VISIBLE_SIDE + 0.5 - abs));
  element.style.transform = `translate3d(calc(var(--cf-size) * ${shift}), 0, ${-abs * 60}px) rotateY(${-dir * TILT_DEG * tilt}deg) scale(${CENTER_SCALE - (CENTER_SCALE - SIDE_SCALE) * tilt})`;
  // Прозрачность только у уходящих за край: у перекрывающихся обложек полупрозрачность давала мерцание краёв.
  element.style.opacity = String(fade);
}

/**
 * CoverFlow для телефона в альбомной ориентации (как в iPod touch): обложки идут за пальцем, а после отпускания
 * плавно доезжают до ближайшей (быстрый жест пролистывает несколько треков); нажатия по обложкам не работают. Положение — дробный индекс `pRef`,
 * обложки расставляются напрямую в DOM (без setState на каждый кадр). Слушатель (совместное прослушивание)
 * листать не может — треки задаёт хост; в очереди из одного трека (или без текущего) рисуется одна обложка.
 */
export function PulseCoverFlow({
  currentIndex,
  fallbackArtwork,
  onNext,
  onPrev,
  onSelect,
  playlist,
}: {
  currentIndex: number;
  /** Обложка текущего трека — когда его нет в очереди. */
  fallbackArtwork: string;
  onNext: () => void;
  onPrev: () => void;
  /** Перейти сразу к треку очереди (быстрый жест через несколько обложек). */
  onSelect: (index: number) => void;
  playlist: PulseTrack[];
}) {
  const isFollower = useIsListenFollower();
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef(new Map<number, HTMLElement>());
  const pRef = useRef(currentIndex);
  const centerRef = useRef(currentIndex);
  const [center, setCenter] = useState(currentIndex);
  const indexRef = useRef(currentIndex);
  const rafRef = useRef(0);
  const dragRef = useRef<{ lastT: number; lastX: number; startP: number; startX: number; step: number; velocity: number } | null>(null);

  const items: Array<{ index: number; track: PulseTrack }> = [];
  // Окно разметки следует за позицией ленты (а не за индексом трека): обложки за краем видимых уже смонтированы и прозрачны.
  for (let offset = -RENDER_SIDE; offset <= RENDER_SIDE; offset += 1) {
    const track = playlist[center + offset];
    if (track) items.push({ index: center + offset, track });
  }
  const hasCurrent = Boolean(playlist[currentIndex]);
  const canBrowse = !isFollower && hasCurrent && playlist.length > 1;

  const place = useCallback((position: number) => {
    pRef.current = position;
    elementsRef.current.forEach((element, index) => placeCover(element, index - position));
  }, []);

  const applyPosition = useCallback((position: number) => {
    place(position);
    const rounded = Math.round(position);
    if (rounded !== centerRef.current) {
      centerRef.current = rounded;
      setCenter(rounded);
    }
  }, [place]);

  const settleTo = useCallback((target: number) => {
    window.cancelAnimationFrame(rafRef.current);
    // Далёкий прыжок (очередь сменилась) — без пролёта через всю ленту.
    if (Math.abs(target - pRef.current) > 12 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      applyPosition(target);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const next = pRef.current + (target - pRef.current) * (1 - Math.exp(-dt / SETTLE_TAU_MS));
      if (Math.abs(target - next) < 0.001) {
        applyPosition(target);
        return;
      }
      applyPosition(next);
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
  }, [applyPosition]);

  // После каждой отрисовки (сменился индекс, подмонтировались новые обложки) расставляем их по текущей позиции.
  useLayoutEffect(() => {
    indexRef.current = currentIndex;
    place(pRef.current);
  });

  // Трек сменился не жестом (кнопки, конец трека, очередь) — плавно доезжаем до него.
  useEffect(() => {
    if (Math.abs(pRef.current - currentIndex) > 0.001 && !dragRef.current) settleTo(currentIndex);
  }, [currentIndex, settleTo]);

  useEffect(() => () => window.cancelAnimationFrame(rafRef.current), []);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    const box = containerRef.current;
    if (!canBrowse || !touch || !box) return;
    window.cancelAnimationFrame(rafRef.current);
    const size = Math.min(box.clientHeight * SIZE_H, box.clientWidth * SIZE_W);
    dragRef.current = { lastT: event.timeStamp, lastX: touch.clientX, startP: pRef.current, startX: touch.clientX, step: Math.max(size * FIRST_GAP, 60), velocity: 0 };
  };

  const onTouchMove = (event: React.TouchEvent) => {
    const drag = dragRef.current;
    const touch = event.touches[0];
    if (!drag || !touch) return;
    const dt = event.timeStamp - drag.lastT;
    if (dt > 0) drag.velocity = (touch.clientX - drag.lastX) / dt;
    drag.lastT = event.timeStamp;
    drag.lastX = touch.clientX;
    const raw = drag.startP - (touch.clientX - drag.startX) / drag.step;
    // Ленту можно тянуть через несколько обложек; за краями очереди — упругое сопротивление.
    const min = 0;
    const max = playlist.length - 1;
    applyPosition(raw < min ? min - (min - raw) * 0.25 : raw > max ? max + (raw - max) * 0.25 : raw);
  };

  const onTouchEnd = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const base = indexRef.current;
    const position = pRef.current;
    // Куда «улетит» лента с учётом скорости; небольшой, но осознанный сдвиг тоже листает на соседний.
    let target = Math.round(position - (drag.velocity * INERTIA_MS) / drag.step);
    if (target === base && Math.abs(position - base) > COMMIT_RATIO) target = base + Math.sign(position - base);
    target = Math.min(Math.max(target, 0), playlist.length - 1);
    if (target === base || !playlist[target]) {
      settleTo(base);
      return;
    }
    settleTo(target);
    if (target === base + 1) onNext();
    else if (target === base - 1) onPrev();
    else onSelect(target);
    // Трек не сменился (радио ещё грузит, заблокирован) — возвращаемся к реальному.
    window.setTimeout(() => {
      if (!dragRef.current && Math.abs(pRef.current - indexRef.current) > 0.5) settleTo(indexRef.current);
    }, 900);
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full [container-type:size]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        // Настоящая глубина (preserve-3d вместо z-index): пересекающиеся обложки сортируются по пикселям и не «перескакивают» при смене активной.
        className="relative flex h-full w-full items-center justify-center [perspective:900px] [transform-style:preserve-3d]"
        style={{ '--cf-size': `min(${SIZE_H * 100}cqh, ${SIZE_W * 100}cqw)` } as React.CSSProperties}
      >
        {items.map(({ index, track }) => (
          <div
            key={`${String(track.sid)}-${index}`}
            ref={(element) => {
              if (element) elementsRef.current.set(index, element);
              else elementsRef.current.delete(index);
            }}
            aria-hidden
            className="pointer-events-none absolute aspect-square h-[var(--cf-size)] overflow-hidden rounded-3xl border border-zinc-600/30 shadow will-change-transform"
          >
            <PulseCoverImage alt="" className="rounded-3xl" sizes={PULSE_COVER_IMAGE_SIZES.playerFull} src={getPlayerTrackArtwork(track)} />
          </div>
        ))}
        {hasCurrent ? null : (
          <div className="absolute aspect-square h-[var(--cf-size)] overflow-hidden rounded-3xl border border-zinc-600/30 shadow">
            <PulseCoverImage alt="" className="rounded-3xl" sizes={PULSE_COVER_IMAGE_SIZES.playerFull} src={fallbackArtwork} />
          </div>
        )}
      </div>
    </div>
  );
}
