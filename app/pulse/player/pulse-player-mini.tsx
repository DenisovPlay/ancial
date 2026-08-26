'use client';

import type { ComponentType, RefObject, TouchEventHandler } from 'react';

import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import { cn, formatPlaybackTime } from '../player/player-utils';

type PlayerIcon = ComponentType<{ className?: string; name: string }>;
type ActiveSeekSlider = 'desktop' | 'mobile' | null;

type PulsePlayerMiniProps = {
  Icon: PlayerIcon;
  activeSeekSlider: ActiveSeekSlider;
  currentTime: number;
  desktopCurrentTimeLabelRef: RefObject<HTMLDivElement | null>;
  desktopSeekInputRef: RefObject<HTMLInputElement | null>;
  duration: number;
  isPlaying: boolean;
  isSwiping: boolean;
  isVisible: boolean;
  lang: Record<string, string> | null;
  nextArtist: string;
  nextArtwork: string;
  nextTitle: string;
  onChangeVolume: (volume: string) => void;
  onDesktopSeekCancel: () => void;
  onDesktopSeekChange: (value: number) => void;
  onDesktopSeekStart: () => void;
  onDesktopSeekSubmit: () => void;
  onNextTrack: () => void;
  onOpenFull: () => void;
  onPrevTrack: () => void;
  onTouchEnd: TouchEventHandler<HTMLDivElement>;
  onTouchMove: TouchEventHandler<HTMLDivElement>;
  onTouchStart: TouchEventHandler<HTMLDivElement>;
  onTogglePlay: () => void;
  playerArtist: string;
  playerArtwork: string;
  playerTitle: string;
  prevArtist: string;
  prevArtwork: string;
  prevTitle: string;
  seekValue: number;
  shellWidth: number;
  swipeX: number;
  volume: number;
  volumeSliderRef: RefObject<HTMLInputElement | null>;
};

/** Prop-driven mini player presentation. Playback and gesture ownership stay in the provider. */
export function PulsePlayerMini({
  Icon,
  activeSeekSlider,
  currentTime,
  desktopCurrentTimeLabelRef,
  desktopSeekInputRef,
  duration,
  isPlaying,
  isSwiping,
  isVisible,
  lang,
  nextArtist,
  nextArtwork,
  nextTitle,
  onChangeVolume,
  onDesktopSeekCancel,
  onDesktopSeekChange,
  onDesktopSeekStart,
  onDesktopSeekSubmit,
  onNextTrack,
  onOpenFull,
  onPrevTrack,
  onTouchEnd,
  onTouchMove,
  onTouchStart,
  onTogglePlay,
  playerArtist,
  playerArtwork,
  playerTitle,
  prevArtist,
  prevArtwork,
  prevTitle,
  seekValue,
  shellWidth,
  swipeX,
  volume,
  volumeSliderRef,
}: PulsePlayerMiniProps) {
  const hasSwipe = swipeX !== 0;

  // Карусель существует только во время жеста на телефонах. При swipeX === 0
  // (десктоп и покой) не рендерится ни один transform — разметка идентична исходной.
  // Уходящая карточка растворяется по мере выхода за порог жеста (как cover в
  // full-плеере): к |swipeX| >= 220 она полностью прозрачна — на докате смена
  // трека визуально бесшовна независимо от ширины пилюли.
  const fade = Math.max(0, Math.min(1, 1 - (Math.abs(swipeX) - 60) / 160));
  const slideStyle = hasSwipe
    ? {
      transform: `translate3d(${swipeX}px, 0, 0)`,
      opacity: fade,
      transition: isSwiping ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s' : 'none',
      willChange: 'transform, opacity' as const,
    }
    : undefined;
  // Обе peek-карточки при старте жеста ПОЛНОСТЬЮ за границами пилюли
  // (overflow-hidden + rounded-full обрезают у скругления):
  //  - prev: слева, translate -100% - 16px -> правый край на -3px;
  //  - next: справа, база W + 8px (якорь left-3) -> левый край за границей.
  // W — фактическая ширина пилюли, замеряется на touchstart в провайдере.
  const peekTransition = isSwiping ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
  const prevPeekStyle = hasSwipe
    ? {
      transform: `translate3d(calc(-100% - 16px + ${swipeX}px), 0, 0)`,
      transition: peekTransition,
      willChange: 'transform' as const,
    }
    : undefined;
  const nextPeekStyle = hasSwipe
    ? {
      transform: `translate3d(calc(${Math.max(shellWidth + 8, 360)}px + ${swipeX}px), 0, 0)`,
      transition: peekTransition,
      willChange: 'transform' as const,
    }
    : undefined;

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-16 z-[60] flex justify-center px-1.5 pb-2.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:bottom-1.5 lg:justify-end lg:pb-1.5',
        isVisible ? 'pointer-events-auto translate-y-0' : 'pointer-events-none translate-y-[200%]',
      )}
    >
      <div
        id="NAVPmini"
        className="pulse-player-mini-shell relative flex w-full touch-none items-center gap-1 overflow-hidden rounded-full border border-zinc-600/30 bg-zinc-900/20 lg:p-1 shadow backdrop-blur-md backdrop-saturate-200 duration-300"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Соседние треки подкладываются под пилюлю только на время свайпа (телефоны).
            Тот же паттерн, что cover-swipe в full: центральная карточка + peek по бокам.
            absolute-слой, layout пилюли не затрагивают. */}
        {hasSwipe && prevArtwork ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-1 lg:hidden"
            style={prevPeekStyle}
          >
            <span className="relative block h-10 w-10 lg:h-14 lg:w-14 overflow-hidden rounded-full bg-zinc-800 shadow">
              <PulseCoverImage alt="" className="rounded-full" sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer} src={prevArtwork} />
            </span>
            <span className="flex w-40 shrink-0 flex-col lg:w-64">
              <span className="w-full truncate text-sm text-white lg:text-base">{prevTitle}</span>
              <span className="w-full truncate text-xs text-zinc-300 lg:text-sm">{prevArtist}</span>
            </span>
          </div>
        ) : null}
        {hasSwipe && nextArtwork ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-1 lg:hidden"
            style={nextPeekStyle}
          >
            <span className="relative block h-10 w-10 lg:h-14 lg:w-14 overflow-hidden rounded-full bg-zinc-800 shadow">
              <PulseCoverImage alt="" className="rounded-full" sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer} src={nextArtwork} />
            </span>
            <span className="flex w-40 shrink-0 flex-col lg:w-64">
              <span className="w-full truncate text-sm text-white lg:text-base">{nextTitle}</span>
              <span className="w-full truncate text-xs text-zinc-300 lg:text-sm">{nextArtist}</span>
            </span>
          </div>
        ) : null}

        {/* Обёртка карусели вокруг ОРИГИНАЛЬНОЙ кнопки обложки: DOM внутри не тронут */}
        <div className="relative z-10 flex shrink-0" style={slideStyle}>
          <button
            type="button"
            onClick={onOpenFull}
            className="group relative h-10 w-10 lg:h-14 lg:w-14 shrink-0 cursor-pointer overflow-hidden rounded-full bg-zinc-800 shadow duration-300 active:scale-95 lg:h-16 lg:w-16"
          >
            <PulseCoverImage alt={playerTitle} className="rounded-full" sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer} src={playerArtwork} />
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 opacity-0 duration-300 group-hover:opacity-100">
              <Icon name="IC-full-mode" className="h-10 w-10 fill-white" />
            </div>
          </button>
        </div>

        {/* Текст едет тем же transform: отдельная обёртка с тем же стилем слайда */}
        <div className="relative z-10 flex w-40 shrink-0 flex-col lg:w-64" style={slideStyle}>
          <span className="w-full truncate text-sm text-white lg:text-base">{playerTitle}</span>
          <span className="w-full truncate text-xs text-zinc-300 lg:text-sm">{playerArtist}</span>
        </div>

        <div className="flex-grow" />

        <div className="hidden flex-grow flex-col items-center justify-center gap-1 lg:flex">
          <input
            min={0}
            max={duration || 0}
            step="0.01"
            type="range"
            value={activeSeekSlider === 'desktop' ? seekValue : currentTime}
            onPointerDown={onDesktopSeekStart}
            onPointerUp={onDesktopSeekSubmit}
            onPointerCancel={onDesktopSeekCancel}
            onLostPointerCapture={onDesktopSeekCancel}
            onChange={(event) => onDesktopSeekChange(Number(event.target.value))}
            className="h-3 w-full max-w-sm appearance-none rounded-full bg-zinc-800 accent-purple-500"
            ref={desktopSeekInputRef}
          />
          <div className="flex w-full max-w-sm text-xs text-zinc-300 lg:text-sm">
            <div ref={desktopCurrentTimeLabelRef} className="flex-grow">{formatPlaybackTime(activeSeekSlider === 'desktop' ? seekValue : currentTime)}</div>
            <div>{formatPlaybackTime(duration)}</div>
          </div>
        </div>

        <div className="hidden flex-grow lg:block" />

        <div className="relative z-10 flex shrink-0 items-center justify-end gap-1.5 lg:w-80 lg:gap-3">
          <div className="hidden flex-col items-center justify-center gap-1 pr-1 lg:flex">
            <span className="text-sm text-zinc-300">{lang?.volume || 'Громкость'}</span>
            <input
              ref={volumeSliderRef}
              min={0}
              max={1}
              step="0.005"
              type="range"
              value={volume}
              onChange={(event) => onChangeVolume(event.target.value)}
              className="h-3 w-full appearance-none rounded-full bg-zinc-800 accent-purple-500"
            />
          </div>

          {/* prev/next — только десктоп; на телефонах треки листаются свайпом */}
          <button type="button" onClick={onPrevTrack} className="hidden lg:block">
            <Icon name="IC-moveback" className="h-8 w-8 shrink-0 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
          </button>

          <button type="button" onClick={onTogglePlay} className="flex h-10 w-10 lg:h-14 lg:w-14 shrink-0 cursor-pointer items-center justify-center rounded-full lg:bg-purple-500 shadow duration-300 lg:hover:bg-purple-600 active:scale-95">
            <Icon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-7 w-7 lg:h-10 lg:w-10 fill-white" />
          </button>

          <button type="button" onClick={onNextTrack} className="hidden lg:block">
            <Icon name="IC-moveforward" className="h-8 w-8 shrink-0 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
          </button>
        </div>
      </div>
    </div>
  );
}
