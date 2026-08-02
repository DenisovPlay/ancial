'use client';

import { useState, type ComponentType, type RefObject, type TouchEventHandler } from 'react';

import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import {
  getActiveLyricState,
  PulseLyricsDesktop,
  PulseLyricsMobile,
  splitLyricText,
  type PulseLyricsLine,
} from './pulse-lyrics';
import { cn } from './player-utils';
import { PulsePlayerFullHeader } from './pulse-player-full-header';
import { PulsePlayerFullArtwork } from './pulse-player-full-artwork';
import { PulsePlayerFullControls, type RepeatMode } from './pulse-player-full-controls';
import { PulseQueueModal } from './pulse-queue-modal';
import { Dropdown, DropdownItem } from '../../components/navigation';
import type { PulseTrack } from '../../context/PulsePlayerContext';

type PlayerIcon = ComponentType<{ className?: string; name: string }>;

export type PulsePlayerFullProps = {
  // Icons / refs
  Icon: PlayerIcon;
  mobileCurrentTimeLabelRef: RefObject<HTMLDivElement | null>;
  mobileSeekInputRef: RefObject<HTMLInputElement | null>;

  // Track meta
  playerTitle: string;
  playerArtist: string;
  playerArtwork: string;
  prevArtwork: string;
  nextArtwork: string;
  prevTrackObj: object | null;
  nextTrackObj: object | null;
  currentTrack: { src?: string | null; album?: string | null; albumid?: number | string | null } | null;
  // Unique string that changes when the track changes (used to reset animations)
  trackKey: string;

  // Repeat & Queue
  repeatMode?: RepeatMode;
  playlist?: PulseTrack[];
  currentIndex?: number;
  isRadioMode?: boolean;
  radioSeedName?: string;

  // Swipe state (full-player horizontal swipe)
  swipeX: number;
  isSwiping?: boolean;
  touchStartXRef: RefObject<number | null>;

  // Seek / time
  displayedCurrentTime: number;
  duration: number;
  currentTime: number;

  // Playback
  isPlaying: boolean;
  isVisible: boolean;   // combined: isFullMode && isPlayerAnimatingIn

  // Like
  activeLike: boolean;
  isAuthenticated: boolean;

  // Lyrics
  lyricsLines: PulseLyricsLine[];
  lyricsSource: string;
  activeLyricState: ReturnType<typeof getActiveLyricState>;
  mobileLyric: ReturnType<typeof splitLyricText> | null;

  // Header
  albumLabel: string;
  canOpenAlbum: boolean;

  // Controls
  canUseEqualizer: boolean;
  isMobileDevice: boolean;
  offlineSaveStatus: 'already' | 'error' | 'idle' | 'saved' | 'saving';
  lang: Record<string, string> | null;

  // Callbacks – header
  onClose: () => void;
  onMinimize: () => void;
  onOpenAlbum: () => void;

  // Callbacks – cover swipe
  onTouchStartCover: TouchEventHandler<HTMLDivElement>;
  onTouchMoveCover: TouchEventHandler<HTMLDivElement>;
  onTouchEndCover: TouchEventHandler<HTMLDivElement>;

  // Callbacks – shell swipe (close on swipe down)
  onTouchStartFull: TouchEventHandler<HTMLDivElement>;
  onTouchEndFull: TouchEventHandler<HTMLDivElement>;

  // Callbacks – seek
  onSeekCancel: () => void;
  onSeekChange: (value: number) => void;
  onSeekStart: () => void;
  onSeekSubmit: () => void;

  // Callbacks – controls
  onAddToPlaylist: () => void;
  onDownload: () => void;
  onLike: () => void;
  onNext: () => void;
  onOpenEqualizer: () => void;
  onPrev: () => void;
  onSaveOffline: () => Promise<void>;
  onTogglePlay: () => void;
  onToggleRepeat?: () => void;

  // Callbacks – queue
  onPlayQueueTrack?: (index: number) => void;
  onRemoveQueueTrack?: (index: number) => void;
  onMoveQueueTrack?: (fromIndex: number, toIndex: number) => void;

  // Lyrics seek
  onLyricsSeek: (nextTime: number) => void;
};

/**
 * Full-screen player shell.
 * All state and callbacks are owned by PulsePlayerProvider — this component is purely presentational.
 */
export function PulsePlayerFull({
  Icon,
  mobileCurrentTimeLabelRef,
  mobileSeekInputRef,

  playerTitle,
  playerArtist,
  playerArtwork,
  prevArtwork,
  nextArtwork,
  prevTrackObj,
  nextTrackObj,
  currentTrack,
  trackKey,

  repeatMode = 'none',
  playlist = [],
  currentIndex = 0,
  isRadioMode,
  radioSeedName,

  swipeX,
  isSwiping,
  touchStartXRef,

  displayedCurrentTime,
  duration,
  currentTime,

  isPlaying,
  isVisible,

  activeLike,
  isAuthenticated,

  lyricsLines,
  lyricsSource,
  activeLyricState,
  mobileLyric,

  albumLabel,
  canOpenAlbum,

  canUseEqualizer,
  isMobileDevice,
  offlineSaveStatus,
  lang,

  onClose,
  onMinimize,
  onOpenAlbum,

  onTouchStartCover,
  onTouchMoveCover,
  onTouchEndCover,

  onTouchStartFull,
  onTouchEndFull,

  onSeekCancel,
  onSeekChange,
  onSeekStart,
  onSeekSubmit,

  onAddToPlaylist,
  onDownload,
  onLike,
  onNext,
  onOpenEqualizer,
  onPrev,
  onSaveOffline,
  onTogglePlay,
  onToggleRepeat,

  onPlayQueueTrack,
  onRemoveQueueTrack,
  onMoveQueueTrack,

  onLyricsSeek,
}: PulsePlayerFullProps) {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  return (
    <div
      className={cn(
        'absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-[65]',
        isVisible
          ? 'pointer-events-auto translate-y-0'
          : 'pointer-events-none translate-y-full',
      )}
      style={{ transitionDelay: '0ms' }}
    >
      <div
        id="NAVPfull"
        className="pulse-player-full-shell flex h-dvh w-full flex-col items-center justify-center gap-1 overflow-y-auto overflow-x-hidden rounded-none bg-zinc-900/80 p-1 shadow lg:h-full lg:gap-3"
        style={{
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          overscrollBehavior: 'none',
        }}
        onTouchStart={onTouchStartFull}
        onTouchEnd={onTouchEndFull}
      >
        <PulsePlayerFullHeader
          Icon={Icon}
          albumLabel={albumLabel}
          canOpenAlbum={canOpenAlbum}
          onClose={onClose}
          onMinimize={onMinimize}
          onOpenAlbum={onOpenAlbum}
        />

        <div className="flex h-full w-full flex-row items-center justify-center">
          <div className="flex w-full flex-col items-center lg:w-auto lg:items-start lg:shrink-0">
            <div className="flex flex-col items-center duration-300 lg:items-start">
              {/* Cover art with horizontal swipe */}
              <div className="flex items-center justify-center">
                <div
                  className="relative flex w-[calc(100vw-24px)] max-w-sm aspect-square items-center justify-center shrink-0 lg:h-96 lg:w-96 lg:max-w-none"
                  onTouchStart={onTouchStartCover}
                  onTouchMove={onTouchMoveCover}
                  onTouchEnd={onTouchEndCover}
                >
                  {prevTrackObj ? (
                    <div
                      className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl lg:hidden"
                      style={{
                        transform: `translate3d(calc(-100% - 12px + ${swipeX}px), 0, 0)`,
                        willChange: 'transform',
                        transition: isSwiping ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                      }}
                    >
                      <PulseCoverImage
                        alt="Previous Track"
                        className="rounded-3xl"
                        sizes={PULSE_COVER_IMAGE_SIZES.playerFull}
                        src={prevArtwork}
                      />
                    </div>
                  ) : null}

                  <div
                    className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl"
                    style={{
                      transform: `translate3d(${swipeX}px, 0, 0)`,
                      willChange: 'transform, opacity',
                      opacity: 1 - Math.abs(swipeX) / 800,
                      transition: isSwiping ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s' : 'none',
                    }}
                  >
                    <PulseCoverImage
                      alt={playerTitle}
                      className="rounded-3xl"
                      sizes={PULSE_COVER_IMAGE_SIZES.playerFull}
                      src={playerArtwork}
                    />

                    {lyricsLines.length ? (
                      <PulseLyricsMobile
                        activeIndex={activeLyricState.activeIndex}
                        lyric={mobileLyric}
                        progress={activeLyricState.progress}
                        source={lyricsSource}
                      />
                    ) : null}
                  </div>

                  {nextTrackObj ? (
                    <div
                      className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl lg:hidden"
                      style={{
                        transform: `translate3d(calc(100% + 12px + ${swipeX}px), 0, 0)`,
                        willChange: 'transform',
                        transition: isSwiping ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                      }}
                    >
                      <PulseCoverImage
                        alt="Next Track"
                        className="rounded-3xl"
                        sizes={PULSE_COVER_IMAGE_SIZES.playerFull}
                        src={nextArtwork}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Track title + artist + actions row — direct child of w-full column */}
            <div className="flex w-full items-center justify-between gap-2 mt-3 px-3 lg:w-96 lg:px-0">
              <div
                key={`text-${trackKey}`}
                className="animate-smooth-appear flex min-w-0 flex-col"
              >
                <span className="truncate text-base font-bold text-white lg:text-lg">
                  {playerTitle}
                </span>
                <span className="truncate text-sm text-zinc-300 lg:text-base">
                  {playerArtist}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {isAuthenticated ? (
                  <button
                    id="player_likebutton_title"
                    type="button"
                    onClick={onLike}
                    className="cursor-pointer p-1 duration-300 active:scale-95"
                  >
                    <Icon
                      name={activeLike ? 'IC-heart-filled' : 'IC-heart'}
                      className={cn(
                        'h-7 w-7 duration-300 hover:fill-zinc-300',
                        activeLike ? 'fill-pink-400' : 'fill-white',
                      )}
                    />
                  </button>
                ) : null}

                {isAuthenticated && !isMobileDevice ? (
                  <Dropdown
                    position="top"
                    align="end"
                    triggerSize="sm"
                    triggerNode={<Icon name="IC-more" className="h-7 w-7 fill-white duration-300 hover:fill-zinc-300" />}
                    triggerClassName="block !h-auto !w-auto !bg-transparent !p-0 hover:!bg-transparent cursor-pointer p-1 duration-300 active:scale-95"
                  >
                    <DropdownItem onClick={onAddToPlaylist} icon="IC-plus">
                      {lang?.add_to_playlist || 'В плейлист'}
                    </DropdownItem>
                    <DropdownItem icon="IC-download" onClick={onDownload}>
                      {lang?.pulse_download_mp3 || 'Скачать MP3'}
                    </DropdownItem>
                    <DropdownItem
                      icon={offlineSaveStatus === 'already' ? 'IC-bookmark-filled' : 'IC-bookmark'}
                      onClick={() => { void onSaveOffline(); }}
                    >
                      {offlineSaveStatus === 'saving'
                        ? (lang?.pulse_saving_offline || 'Сохраняется...')
                        : offlineSaveStatus === 'already'
                          ? (lang?.pulse_already_saved_offline || 'Уже сохранено')
                          : (lang?.pulse_save_offline || 'Сохранить офлайн')}
                    </DropdownItem>
                    {canUseEqualizer ? (
                      <DropdownItem onClick={onOpenEqualizer} icon="IC-equalizer">Эквалайзер</DropdownItem>
                    ) : null}
                  </Dropdown>
                ) : isAuthenticated && isMobileDevice ? (
                  <button title={lang?.add_to_playlist || 'В плейлист'} type="button" onClick={onAddToPlaylist} className="group cursor-pointer p-1 duration-300 active:scale-95">
                    <Icon name="IC-plus" className="h-7 w-7 fill-white duration-300 group-hover:fill-zinc-300" />
                  </button>
                ) : !isAuthenticated && !isMobileDevice && canUseEqualizer ? (
                  <button title="Эквалайзер" type="button" onClick={onOpenEqualizer} className="group cursor-pointer p-1 duration-300 active:scale-95">
                    <Icon name="IC-equalizer" className="h-7 w-7 fill-white duration-300 group-hover:fill-zinc-300" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="w-full px-3 lg:px-0 lg:max-w-sm">
              <PulsePlayerFullArtwork
                displayedCurrentTime={displayedCurrentTime}
                duration={duration}
                mobileCurrentTimeLabelRef={mobileCurrentTimeLabelRef}
                mobileSeekInputRef={mobileSeekInputRef}
                onSeekCancel={onSeekCancel}
                onSeekChange={onSeekChange}
                onSeekStart={onSeekStart}
                onSeekSubmit={onSeekSubmit}
              />
            </div>

            <PulsePlayerFullControls
              Icon={Icon}
              isPlaying={isPlaying}
              repeatMode={repeatMode}
              onNext={onNext}
              onPrev={onPrev}
              onTogglePlay={onTogglePlay}
              onToggleRepeat={onToggleRepeat}
              onOpenQueue={() => setIsQueueOpen(true)}
              hasQueue={playlist.length > 0}
              lang={lang}
            />
          </div>

          {lyricsLines.length ? (
            <PulseLyricsDesktop
              activeIndex={activeLyricState.activeIndex}
              lines={lyricsLines}
              onSeek={onLyricsSeek}
              progress={activeLyricState.progress}
            />
          ) : null}
        </div>
      </div>

      <PulseQueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        playlist={playlist}
        currentIndex={currentIndex}
        isRadioMode={isRadioMode}
        radioSeedName={radioSeedName}
        lang={lang}
        onPlayTrack={(idx) => {
          onPlayQueueTrack?.(idx);
        }}
        onRemoveTrack={(idx) => {
          onRemoveQueueTrack?.(idx);
        }}
        onMoveTrack={(fromIdx, toIdx) => {
          onMoveQueueTrack?.(fromIdx, toIdx);
        }}
      />
    </div>
  );
}
