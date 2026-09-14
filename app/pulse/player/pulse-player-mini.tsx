'use client';

import { useRef, type ComponentType, type RefObject, type TouchEventHandler } from 'react';

import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import { cn, formatPlaybackTime } from '../player/player-utils';
import { PulseRangeTrack } from './pulse-range-track';

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

const MINI_ICON_BUTTON = 'hidden h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-white/10 active:scale-95 lg:flex';

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
  // Тап по пилюле (кроме play) открывает full. Касание, сдвинувшее палец, — это жест (свайп вверх
  // или листание трека), и его click игнорируется: иначе после свайпа трека открылся бы full.
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef(false);
  const desktopSeekTime = activeSeekSlider === 'desktop' ? seekValue : currentTime;

  const w = Math.max(shellWidth || 0, 360);
  const transition = isSwiping ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';

  const slideStyle = hasSwipe
    ? {
      transform: `translate3d(${swipeX}px, 0, 0)`,
      transition,
      willChange: 'transform' as const,
    }
    : undefined;

  const prevPeekStyle = hasSwipe
    ? {
      transform: `translate3d(calc(-${w}px + ${swipeX}px), 0, 0)`,
      transition,
      willChange: 'transform' as const,
    }
    : undefined;

  const nextPeekStyle = hasSwipe
    ? {
      transform: `translate3d(calc(${w}px + ${swipeX}px), 0, 0)`,
      transition,
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
        className="pulse-player-mini-shell relative flex w-full cursor-pointer touch-none items-center lg:cursor-auto gap-1 overflow-hidden rounded-full border border-zinc-600/30 bg-zinc-900/20 lg:gap-3 lg:p-1 shadow backdrop-blur-md backdrop-saturate-200 duration-300"
        onTouchStart={(event) => {
          touchOriginRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          touchMovedRef.current = false;
          onTouchStart(event);
        }}
        onTouchMove={(event) => {
          const origin = touchOriginRef.current;
          if (origin && Math.hypot(event.touches[0].clientX - origin.x, event.touches[0].clientY - origin.y) > 10) {
            touchMovedRef.current = true;
          }
          onTouchMove(event);
        }}
        onTouchEnd={onTouchEnd}
        onClick={(event) => {
          if (window.innerWidth >= 1024 || touchMovedRef.current) return;
          if ((event.target as HTMLElement).closest('[data-mini-controls]')) return;
          onOpenFull();
        }}
      >
        {/* Track Info Area: обложка + название/артист с каруселью на мобильных */}
        <div className="relative flex shrink-0 items-center">
          {/* Предыдущий трек (подкладывается только во время свайпа) */}
          {hasSwipe && prevArtwork ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center gap-1 lg:hidden"
              style={prevPeekStyle}
            >
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 shadow lg:h-14 lg:w-14">
                <PulseCoverImage alt="" className="rounded-full" sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer} src={prevArtwork} />
              </span>
              <span className="flex w-40 shrink-0 flex-col lg:w-64">
                <span className="w-full truncate text-sm text-white lg:text-base">{prevTitle}</span>
                <span className="w-full truncate text-xs text-zinc-300 lg:text-sm">{prevArtist}</span>
              </span>
            </div>
          ) : null}

          {/* Текущий трек */}
          <div
            className="relative z-10 flex shrink-0 items-center gap-1 lg:gap-3"
            style={slideStyle}
          >
            <button
              type="button"
              onClick={(event) => {
                // На телефоне тап обрабатывает вся пилюля (с защитой от свайпа), на ПК — только обложка.
                if (window.innerWidth < 1024) return;
                event.stopPropagation();
                onOpenFull();
              }}
              className="group relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full bg-zinc-800 shadow duration-300 active:scale-95 lg:h-14 lg:w-14"
            >
              <PulseCoverImage alt={playerTitle} className="rounded-full" sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer} src={playerArtwork} />
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 opacity-0 duration-300 group-hover:opacity-100">
                <Icon name="IC-full-mode" className="h-7 w-7 fill-white" />
              </div>
            </button>

            <div className="flex w-40 shrink-0 flex-col lg:w-56">
              <span className="w-full truncate text-sm font-medium text-white lg:text-base">{playerTitle}</span>
              <span className="w-full truncate text-xs text-zinc-400 lg:text-sm">{playerArtist}</span>
            </div>
          </div>

          {/* Следующий трек (подкладывается только во время свайпа) */}
          {hasSwipe && nextArtwork ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center gap-1 lg:hidden"
              style={nextPeekStyle}
            >
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 shadow lg:h-14 lg:w-14">
                <PulseCoverImage alt="" className="rounded-full" sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer} src={nextArtwork} />
              </span>
              <span className="flex w-40 shrink-0 flex-col lg:w-64">
                <span className="w-full truncate text-sm text-white lg:text-base">{nextTitle}</span>
                <span className="w-full truncate text-xs text-zinc-300 lg:text-sm">{nextArtist}</span>
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex-grow lg:hidden" />

        {/* Перемотка — только десктоп: таймкоды по бокам дорожки, моноширинно, чтобы не прыгали. */}
        <div className="hidden min-w-0 flex-grow items-center justify-center gap-3 lg:flex">
          <div ref={desktopCurrentTimeLabelRef} className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-400">
            {formatPlaybackTime(desktopSeekTime)}
          </div>
          <PulseRangeTrack
            className="max-w-md"
            min={0}
            max={duration || 0}
            step="0.01"
            aria-label={lang?.pulse_seek || 'Перемотка'}
            value={desktopSeekTime}
            inputRef={desktopSeekInputRef}
            onPointerDown={onDesktopSeekStart}
            onPointerUp={onDesktopSeekSubmit}
            onPointerCancel={onDesktopSeekCancel}
            onLostPointerCapture={onDesktopSeekCancel}
            onChange={(event) => onDesktopSeekChange(Number(event.target.value))}
          />
          <div className="w-10 shrink-0 text-xs tabular-nums text-zinc-400">{formatPlaybackTime(duration)}</div>
        </div>

        <div data-mini-controls className="relative z-20 flex shrink-0 items-center justify-end gap-1.5 lg:gap-3 lg:pr-1">
          <div className="hidden w-28 items-center gap-3 lg:flex" title={lang?.volume || 'Громкость'}>
            <Icon name="IC-speaker" className="h-5 w-5 shrink-0 fill-zinc-400" />
            <PulseRangeTrack
              min={0}
              max={1}
              step="0.005"
              aria-label={lang?.volume || 'Громкость'}
              value={volume}
              inputRef={volumeSliderRef}
              progressPercent={volume * 100}
              onChange={(event) => onChangeVolume(event.target.value)}
            />
          </div>

          {/* prev/next — только десктоп; на телефонах треки листаются свайпом */}
          <button type="button" onClick={onPrevTrack} className={MINI_ICON_BUTTON}>
            <Icon name="IC-moveback" className="h-7 w-7 fill-white" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 active:scale-95 lg:h-12 lg:w-12 lg:bg-purple-500 lg:shadow lg:hover:bg-purple-400"
          >
            <Icon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-7 w-7 fill-white lg:h-8 lg:w-8" />
          </button>

          <button type="button" onClick={onNextTrack} className={MINI_ICON_BUTTON}>
            <Icon name="IC-moveforward" className="h-7 w-7 fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
