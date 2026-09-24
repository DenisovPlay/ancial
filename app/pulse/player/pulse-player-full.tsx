'use client';

import { useEffect, useState, useSyncExternalStore, type RefObject, type TouchEventHandler } from 'react';
import { GLASS_MODE_CHANGE_EVENT, GLASS_MODE_STORAGE_KEY, readGlassMode } from '../../lib/android-glass';

import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import {
  PulseLyricsDesktop,
  type PulseLyricsClock,
  PulseLyricsMobile,
  PulseLyricsMobileSheet,
  PulseLyricsPlain,
  type PulseLyricsLine } from './pulse-lyrics';
import { isSyncedLyrics } from '../../lib/lrc';
import { cn } from './player-utils';
import { PulsePlayerFullHeader } from './pulse-player-full-header';
import { PulsePlayerFullArtwork } from './pulse-player-full-artwork';
import { PulsePlayerFullControls, type RepeatMode } from './pulse-player-full-controls';
import { PulseQueueModal } from './pulse-queue-modal';
import { PlaybackStatusBar } from './playback-status-bar';
import { PulseDevicesButton } from './pulse-devices-button';
import { Dropdown, DropdownItem } from '../../components/navigation';
import type { PulseTrack } from '../../context/PulsePlayerContext';
import Icon from '../../components/svg-icon';


const DESKTOP_LAYOUT_QUERY = '(min-width: 1024px)';

function subscribeDesktopLayout(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_LAYOUT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const readDesktopLayout = () => window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;

const LYRICS_MODE_EXIT_MS = 260;

/** Держит элемент смонтированным, пока доигрывает анимация ухода. */
function usePresence(visible: boolean, exitMs = LYRICS_MODE_EXIT_MS) {
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible || !mounted) return undefined;
    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [visible, mounted, exitMs]);

  return { leaving: !visible && mounted, mounted: visible || mounted };
}

export type PulsePlayerFullProps = {
  // Icons / refs
  audioRef: RefObject<PulseLyricsClock | null>;
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

  // Seek / time
  displayedCurrentTime: number;
  duration: number;

  // Playback
  isPlaying: boolean;
  isVisible: boolean;   // combined: isFullMode && isPlayerAnimatingIn

  // Like
  activeLike: boolean;
  isAuthenticated: boolean;

  // Lyrics
  lyricsLines: PulseLyricsLine[];
  lyricsEnabled: boolean;
  onToggleLyrics: () => void;

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
  audioRef,
  mobileCurrentTimeLabelRef,
  mobileSeekInputRef,

  playerTitle,
  playerArtist,
  playerArtwork,
  prevArtwork,
  nextArtwork,
  prevTrackObj,
  nextTrackObj,
  trackKey,

  repeatMode = 'none',
  playlist = [],
  currentIndex = 0,
  isRadioMode,
  radioSeedName,

  swipeX,
  isSwiping,

  displayedCurrentTime,
  duration,

  isPlaying,
  isVisible,

  activeLike,
  isAuthenticated,

  lyricsLines,
  lyricsEnabled,
  onToggleLyrics,

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
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  // Рендерим только видимую раскладку текста: спрятанная CSS-ом всё равно считала бы кадры.
  const isDesktopLayout = useSyncExternalStore(subscribeDesktopLayout, readDesktopLayout, () => false);
  const hasLyrics = lyricsEnabled && lyricsLines.length > 0;
  const showDesktopLyrics = hasLyrics && isDesktopLayout;
  const showMobileLyrics = hasLyrics && !isDesktopLayout;
  const [expandFromIndex, setExpandFromIndex] = useState(-1);
  // Пока текст уходит анимацией, нужны прежние строки: провайдер очищает их сразу.
  const [stickyLines, setStickyLines] = useState(lyricsLines);
  if (lyricsLines.length > 0 && lyricsLines !== stickyLines) setStickyLines(lyricsLines);
  // Без тайм-кодов нет «текущей строки»: на телефоне сразу весь текст, без режима одной строки.
  const lyricsSynced = isSyncedLyrics(stickyLines);
  const showMobileSheet = showMobileLyrics && (isLyricsExpanded || !lyricsSynced);
  const mobileLyricsPresence = usePresence(showMobileLyrics);
  // Совпадает с длительностью pulse-lyrics-slot-out в globals.css.
  const desktopLyricsPresence = usePresence(showDesktopLyrics, 380);
  // Строка и список сменяют друг друга симметрично: уходящий догасает, потом проявляется новый.
  // Внутри гаснущей подложки строка остаётся, чтобы текст не пропадал раньше блюра.
  const linePresence = usePresence(!isLyricsExpanded && lyricsSynced);
  const sheetPresence = usePresence(showMobileSheet && !linePresence.mounted);
  const showMobileLine = linePresence.mounted && !sheetPresence.mounted;
  const glassMode = useSyncExternalStore(
    (cb) => {
      const handle = (e: StorageEvent | Event) => {
        if (e instanceof StorageEvent && e.key !== GLASS_MODE_STORAGE_KEY) return;
        cb();
      };
      window.addEventListener('storage', handle);
      window.addEventListener(GLASS_MODE_CHANGE_EVENT, handle);
      return () => {
        window.removeEventListener('storage', handle);
        window.removeEventListener(GLASS_MODE_CHANGE_EVENT, handle);
      };
    },
    readGlassMode,
    () => 'auto' as const,
  );
  return (
    <div
      className={cn(
        'fixed inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-[65]',

        isVisible
          ? 'pointer-events-auto translate-y-0'
          : 'pointer-events-none translate-y-full',
      )}
      style={{ transitionDelay: '0ms' }}
    >
      <div
        id="NAVPfull"
        className="pulse-player-full-shell flex h-dvh w-full flex-col items-center justify-center overflow-hidden rounded-none bg-zinc-900/80 shadow lg:h-full"
        style={{
          backdropFilter: glassMode === 'off' ? 'none' : 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: glassMode === 'off' ? 'none' : 'blur(40px) saturate(180%)',
          overscrollBehavior: 'none',
        }}
        onTouchStart={(event) => {
          // «Вниз — свернуть» только по самому плееру: не из листаемого текста и не из модалок
          // (события из порталов тоже всплывают сюда по дереву React).
          const target = event.target;
          if (!(target instanceof Element) || !event.currentTarget.contains(target) || target.closest('[data-swipe-close="off"]')) return;
          onTouchStartFull(event);
        }}
        onTouchEnd={onTouchEndFull}
      >
        <PulsePlayerFullHeader
          albumLabel={albumLabel}
          canOpenAlbum={canOpenAlbum}
          onClose={onClose}
          onMinimize={onMinimize}
          onOpenAlbum={onOpenAlbum}
        />

        <div className="flex h-full w-full flex-row items-center justify-center gap-3 px-3 py-20 lg:gap-0 lg:py-24">
          <div className="flex w-full max-w-sm shrink-0 flex-col items-center lg:w-[420px] lg:max-w-none lg:items-start xl:w-[480px]">
            <div className="flex w-full flex-col items-center duration-300 lg:items-start">
              {/* Cover art with horizontal swipe */}
              <div className="flex w-full items-center justify-center">
                <div
                  className="pulse-full-rise relative flex aspect-square w-full max-w-sm shrink-0 items-center justify-center lg:max-w-none"
                  // В режиме полного текста свайп треков выключен: иначе прокрутка списка листает треки.
                  onTouchStart={showMobileSheet ? undefined : onTouchStartCover}
                  onTouchMove={showMobileSheet ? undefined : onTouchMoveCover}
                  onTouchEnd={showMobileSheet ? undefined : onTouchEndCover}
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
                    <div key={`art-${trackKey}`} className="pulse-art-layer animate-opacity-fade-in absolute inset-0">
                      <PulseCoverImage
                        alt={playerTitle}
                        className="rounded-3xl"
                        sizes={PULSE_COVER_IMAGE_SIZES.playerFull}
                        src={playerArtwork}
                      />
                    </div>

                    {!isDesktopLayout && mobileLyricsPresence.mounted ? (
                      <div
                        data-swipe-close={sheetPresence.mounted ? 'off' : undefined}
                        className={cn(
                          'absolute inset-0 overflow-hidden rounded-3xl bg-zinc-900/80 backdrop-blur-md backdrop-saturate-200',
                          mobileLyricsPresence.leaving ? 'pulse-lyrics-backdrop-out' : 'pulse-lyrics-backdrop-in',
                        )}
                      >
                        {sheetPresence.mounted && lyricsSynced ? (
                          <PulseLyricsMobileSheet
                            audioRef={audioRef}
                            initialIndex={expandFromIndex}
                            leaving={sheetPresence.leaving}
                            lines={stickyLines}
                            onSeek={onLyricsSeek}
                          />
                        ) : null}

                        {sheetPresence.mounted && !lyricsSynced ? (
                          <PulseLyricsPlain
                            label={lang?.pulse_lyrics_unsynced || 'Текст без синхронизации'}
                            leaving={sheetPresence.leaving}
                            lines={stickyLines}
                            variant="mobile"
                          />
                        ) : null}

                        {showMobileLine ? (
                          <PulseLyricsMobile
                            audioRef={audioRef}
                            expandLabel={lang?.pulse_lyrics_full || 'Весь текст'}
                            leaving={linePresence.leaving}
                            lines={stickyLines}
                            onExpand={(activeIndex) => {
                              setExpandFromIndex(activeIndex);
                              setIsLyricsExpanded(true);
                            }}
                          />
                        ) : null}

                        {sheetPresence.mounted && !sheetPresence.leaving && lyricsSynced ? (
                          <button
                            type="button"
                            onClick={() => setIsLyricsExpanded(false)}
                            className="animate-opacity-fade-in absolute bottom-3 left-1/2 z-10 -translate-x-1/2 cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800/90 px-3 py-1.5 text-xs text-zinc-200 duration-300 active:scale-95 hover:bg-zinc-700"
                          >
                            {lang?.pulse_lyrics_collapse || 'Свернуть'}
                          </button>
                        ) : null}
                      </div>
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

            {/* Где идёт звук и с кем он общий. Без комнаты и без пульта не рисуется. */}
            <PlaybackStatusBar className="mt-3" />

            {/* Track title + artist + actions row — direct child of w-full column */}
            <div className="mt-3 flex w-full items-center justify-between gap-3">
              <div
                key={`text-${trackKey}`}
                className="animate-smooth-appear flex min-w-0 flex-col"
              >
                <span className="truncate text-lg font-bold text-white lg:text-xl">
                  {playerTitle}
                </span>
                <span className="truncate text-sm text-zinc-400 lg:text-base">
                  {playerArtist}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {isAuthenticated ? (
                  <button
                    id="player_likebutton_title"
                    type="button"
                    onClick={onLike}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 active:scale-95 hover:border-zinc-600/30 hover:bg-white/10"
                  >
                    <Icon
                      name={activeLike ? 'IC-heart-filled' : 'IC-heart'}
                      className={cn(
                        'h-6 w-6 duration-300',
                        activeLike ? 'fill-pink-400' : 'fill-white',
                      )}
                    />
                  </button>
                ) : null}

                <PulseDevicesButton lang={lang} />

                {!isMobileDevice ? (
                  <Dropdown
                    position="top"
                    align="end"
                    triggerSize="sm"
                    triggerNode={<Icon name="IC-more" className="h-6 w-6 fill-white duration-300" />}
                    triggerClassName="flex !h-10 !w-10 items-center justify-center rounded-full !bg-transparent !p-0 hover:!bg-white/10 cursor-pointer duration-300 active:scale-95"
                  >
                    <DropdownItem icon="IC-quote" onClick={onToggleLyrics}>
                      {lyricsEnabled
                        ? (lang?.pulse_lyrics_hide || 'Скрыть текст')
                        : (lang?.pulse_lyrics_show || 'Показать текст')}
                    </DropdownItem>
                    {isAuthenticated ? (
                      <DropdownItem onClick={onAddToPlaylist} icon="IC-plus">
                        {lang?.add_to_playlist || 'В плейлист'}
                      </DropdownItem>
                    ) : null}
                    {isAuthenticated ? (
                      <DropdownItem icon="IC-download" onClick={onDownload}>
                        {lang?.pulse_download_mp3 || 'Скачать MP3'}
                      </DropdownItem>
                    ) : null}
                    {isAuthenticated ? (
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
                    ) : null}
                    {canUseEqualizer ? (
                      <DropdownItem onClick={onOpenEqualizer} icon="IC-equalizer">
                        {lang?.pulse_equalizer || 'Эквалайзер'}
                      </DropdownItem>
                    ) : null}
                  </Dropdown>
                ) : isAuthenticated ? (
                  <button
                    title={lang?.add_to_playlist || 'В плейлист'}
                    type="button"
                    onClick={onAddToPlaylist}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 active:scale-95 hover:border-zinc-600/30 hover:bg-white/10"
                  >
                    <Icon name="IC-plus" className="h-6 w-6 fill-white duration-300" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex w-full flex-col items-center justify-center">
              <PulsePlayerFullArtwork
                displayedCurrentTime={displayedCurrentTime}
                duration={duration}
                mobileCurrentTimeLabelRef={mobileCurrentTimeLabelRef}
                mobileSeekInputRef={mobileSeekInputRef}
                onSeekCancel={onSeekCancel}
                onSeekChange={onSeekChange}
                onSeekStart={onSeekStart}
                onSeekSubmit={onSeekSubmit}
                lang={lang}
              />
            </div>

            <PulsePlayerFullControls
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

          {/* Смена раскладки при ресайзе — мгновенная: анимируются только вкл/выкл и загрузка текста. */}
          {isDesktopLayout && desktopLyricsPresence.mounted ? (
            // Слот включает и отступ от обложки: его ширина раскрывается/схлопывается,
            // поэтому колонка с обложкой плавно едет вместо прыжка в центр.
            // self-stretch + -my-24 компенсируют py-24 ряда: панель от края до края экрана.
            <div
              className={cn(
                'flex shrink-0 justify-end self-stretch overflow-hidden lg:-my-24 lg:w-[516px] lg:pl-24 xl:w-[608px] xl:pl-32 2xl:w-[668px]',
                desktopLyricsPresence.leaving ? 'pulse-lyrics-slot-out' : 'pulse-lyrics-slot-in',
              )}
            >
              {lyricsSynced ? (
                <PulseLyricsDesktop
                  audioRef={audioRef}
                  leaving={desktopLyricsPresence.leaving}
                  lines={stickyLines}
                  onSeek={onLyricsSeek}
                />
              ) : (
                <PulseLyricsPlain
                  label={lang?.pulse_lyrics_unsynced || 'Текст без синхронизации'}
                  leaving={desktopLyricsPresence.leaving}
                  lines={stickyLines}
                  variant="desktop"
                />
              )}
            </div>
          ) : null}
        </div>

        {isMobileDevice ? (
          <button
            type="button"
            onClick={() => {
              if (lyricsEnabled) setIsLyricsExpanded(false);
              onToggleLyrics();
            }}
            className={cn(
              'absolute left-1/2 z-[20] flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm text-white duration-300 active:scale-95 border',
              lyricsEnabled ? 'bg-white/10 border-zinc-600/30' : 'opacity-70 hover:border-zinc-600/30 hover:bg-white/10 hover:opacity-100 border-transparent',
            )}
            style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <Icon name="IC-quote" className="h-4 w-4 fill-white" />
            <span>
              {lyricsEnabled
                ? (lang?.pulse_lyrics_hide || 'Скрыть текст')
                : (lang?.pulse_lyrics_show || 'Показать текст')}
            </span>
          </button>
        ) : null}
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
