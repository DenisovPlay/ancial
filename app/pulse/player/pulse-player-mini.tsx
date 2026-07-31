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
  isVisible: boolean;
  lang: Record<string, string> | null;
  onChangeVolume: (volume: string) => void;
  onDesktopSeekCancel: () => void;
  onDesktopSeekChange: (value: number) => void;
  onDesktopSeekStart: () => void;
  onDesktopSeekSubmit: () => void;
  onNextTrack: () => void;
  onOpenFull: () => void;
  onPrevTrack: () => void;
  onTouchEnd: TouchEventHandler<HTMLDivElement>;
  onTouchStart: TouchEventHandler<HTMLDivElement>;
  onTogglePlay: () => void;
  playerArtist: string;
  playerArtwork: string;
  playerTitle: string;
  seekValue: number;
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
  isVisible,
  lang,
  onChangeVolume,
  onDesktopSeekCancel,
  onDesktopSeekChange,
  onDesktopSeekStart,
  onDesktopSeekSubmit,
  onNextTrack,
  onOpenFull,
  onPrevTrack,
  onTouchEnd,
  onTouchStart,
  onTogglePlay,
  playerArtist,
  playerArtwork,
  playerTitle,
  seekValue,
  volume,
  volumeSliderRef,
}: PulsePlayerMiniProps) {
  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-16 z-[60] flex justify-center px-1.5 pb-2.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:bottom-1.5 lg:justify-end lg:pb-1.5',
        isVisible ? 'pointer-events-auto translate-y-0' : 'pointer-events-none translate-y-[200%]',
      )}
    >
      <div
        id="NAVPmini"
        className="pulse-player-mini-shell flex w-full touch-none items-center gap-1 rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 shadow backdrop-blur-md backdrop-saturate-200 duration-300"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={onOpenFull}
          className="group relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-full bg-zinc-800 shadow duration-300 active:scale-95 lg:h-16 lg:w-16"
        >
          <PulseCoverImage alt={playerTitle} className="rounded-full" sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer} src={playerArtwork} />
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 opacity-0 duration-300 group-hover:opacity-100">
            <Icon name="IC-full-mode" className="h-10 w-10 fill-white" />
          </div>
        </button>

        <div className="flex w-40 shrink-0 flex-col lg:w-64">
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

        <div className="flex shrink-0 items-center justify-end gap-1.5 lg:w-80 lg:gap-3">
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

          <button type="button" onClick={onPrevTrack}>
            <Icon name="IC-moveback" className="h-8 w-8 shrink-0 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
          </button>

          <button type="button" onClick={onTogglePlay} className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95">
            <Icon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-10 w-10 fill-white" />
          </button>

          <button type="button" onClick={onNextTrack}>
            <Icon name="IC-moveforward" className="h-8 w-8 shrink-0 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
          </button>
        </div>
      </div>
    </div>
  );
}
