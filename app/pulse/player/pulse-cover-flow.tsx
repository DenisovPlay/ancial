'use client';

import { useRef } from 'react';

import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import type { PulseTrack } from '../../context/PulsePlayerContext';
import { useIsListenFollower } from './listen-along';
import { cn, getPlayerTrackArtwork } from './player-utils';

/** Сколько обложек видно по каждую сторону от текущей. */
const VISIBLE_SIDE = 3;
/** Сдвиг по горизонтали в долях размера обложки: первая соседняя ближе к центру, дальше — плотнее. */
const FIRST_GAP = 0.62;
const NEXT_GAP = 0.26;
const TILT_DEG = 58;
const SWIPE_MIN_PX = 40;

function itemTransform(offset: number): string {
  if (offset === 0) return 'translate3d(0, 0, 0) rotateY(0deg) scale(1)';
  const dir = Math.sign(offset);
  const abs = Math.abs(offset);
  const shift = (FIRST_GAP + (abs - 1) * NEXT_GAP) * dir;
  return `translate3d(calc(var(--cf-size) * ${shift}), 0, ${-abs * 60}px) rotateY(${-dir * TILT_DEG}deg) scale(0.86)`;
}

/**
 * CoverFlow для телефона в альбомной ориентации: обычный плеер с квадратной обложкой там не помещается.
 * Текущая обложка — по центру, соседние — под углом по бокам. Свайп листает треки, нажатие на боковую
 * обложку переходит к ней. Размер задаётся контейнерными единицами (cqh/cqw): без замеров в JS.
 * Слушатель (совместное прослушивание) листать не может — треки задаёт хост; в очереди из одного трека
 * (или если текущего нет в очереди) рисуется одна обложка, жесты выключены.
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
  onSelect: (index: number) => void;
  playlist: PulseTrack[];
}) {
  const startXRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const isFollower = useIsListenFollower();

  const items: Array<{ index: number; offset: number; track: PulseTrack }> = [];
  for (let offset = -VISIBLE_SIDE; offset <= VISIBLE_SIDE; offset += 1) {
    const index = currentIndex + offset;
    const track = playlist[index];
    if (track) items.push({ index, offset, track });
  }
  const hasCurrent = items.some((item) => item.offset === 0);
  const canBrowse = !isFollower && hasCurrent && items.length > 1;

  return (
    <div
      className="h-full w-full [container-type:size]"
      onTouchStart={(event) => {
        if (!canBrowse) return;
        startXRef.current = event.touches[0]?.clientX ?? null;
        movedRef.current = false;
      }}
      onTouchEnd={(event) => {
        const startX = startXRef.current;
        startXRef.current = null;
        if (startX === null) return;
        const dx = (event.changedTouches[0]?.clientX ?? startX) - startX;
        if (Math.abs(dx) < SWIPE_MIN_PX) return;
        movedRef.current = true;
        if (dx < 0) onNext();
        else onPrev();
      }}
    >
      <div
        className="relative flex h-full w-full items-center justify-center [perspective:900px]"
        // Одна обложка (без соседних) — крупнее: места рядом никто не занимает.
        style={{ '--cf-size': items.length > 1 ? 'min(78cqh, 40cqw)' : 'min(96cqh, 46cqw)' } as React.CSSProperties}
      >
        {items.map(({ index, offset, track }) => (
          <button
            key={`${String(track.sid)}-${index}`}
            type="button"
            tabIndex={offset === 0 || !canBrowse ? -1 : 0}
            aria-label={String(track.title ?? '')}
            onClick={() => {
              if (offset === 0 || !canBrowse || movedRef.current) return;
              onSelect(index);
            }}
            className={cn(
              'absolute aspect-square h-[var(--cf-size)] cursor-pointer overflow-hidden rounded-3xl border border-zinc-600/30 shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95',
              offset === 0 || !canBrowse ? 'z-10 cursor-default' : 'opacity-80',
            )}
            style={{
              transform: itemTransform(offset),
              transitionProperty: 'transform, opacity',
              zIndex: VISIBLE_SIDE - Math.abs(offset),
              willChange: 'transform',
            }}
          >
            <PulseCoverImage alt="" className="rounded-3xl" sizes={PULSE_COVER_IMAGE_SIZES.playerFull} src={getPlayerTrackArtwork(track)} />
          </button>
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
