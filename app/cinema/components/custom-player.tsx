'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FrameBrandLoader } from './cinema-skeleton';

interface CustomPlayerProps {
  src?: string;
  fallbackIframeSrc?: string;
  title: string;
  movieId: string;
  season?: number;
  episode?: number;
  startTime?: number;
  totalEpisodes?: number;
  totalSeasons?: number;
  isSeries?: boolean;
  translations?: Array<{ id: number; title: string }>;
  selectedTranslationId?: number | null;
  players?: Array<{ id: string; name: string; provider: string; quality?: string }>;
  selectedPlayerId?: string;
  qualities?: Array<{ label: string; url: string }>;
  selectedQualityUrl?: string;
  onSelectQuality?: (url: string) => void;
  onSelectPlayer?: (id: string) => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onSelectTranslation?: (id: number) => void;
  onSelectEpisodeModal?: () => void;
  onBack?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function CustomPlayer({
  src,
  fallbackIframeSrc,
  title,
  movieId,
  season,
  episode,
  startTime,
  totalEpisodes,
  totalSeasons,
  isSeries = false,
  translations,
  selectedTranslationId,
  players,
  selectedPlayerId = 'flixcdn',
  qualities,
  selectedQualityUrl,
  onSelectQuality,
  onSelectPlayer,
  onNextEpisode,
  onPrevEpisode,
  onSelectTranslation,
  onSelectEpisodeModal,
  onBack,
}: CustomPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState<boolean>(false);

  const [showControls, setShowControls] = useState<boolean>(true);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsIframeLoading(true);
  }, [fallbackIframeSrc, selectedPlayerId]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4500);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    try {
      const progRaw = localStorage.getItem(`cinema_progress_${movieId}`);
      if (progRaw) {
        const parsed = JSON.parse(progRaw);
        if (parsed.currentTime && videoRef.current) {
          videoRef.current.currentTime = parsed.currentTime;
        }
      }
    } catch (e) {}
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [movieId, resetControlsTimer]);

  // Seek relative seconds
  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration || 999999, videoRef.current.currentTime + seconds));
    setCurrentTime(videoRef.current.currentTime);
    resetControlsTimer();
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => { });
    }
  };

  const [showResumeToast, setShowResumeToast] = useState(false);
  const [resumeToastTime, setResumeToastTime] = useState<number | null>(null);
  const restoredRef = useRef(false);
  const lastSavedTimeRef = useRef<number>(0);

  useEffect(() => {
    restoredRef.current = false;
  }, [src, season, episode]);

  const saveCurrentProgress = (overrideTime?: number) => {
    if (!movieId || !videoRef.current) return;
    const curTime = overrideTime !== undefined ? overrideTime : videoRef.current.currentTime;
    if (!curTime || curTime < 3) return;
    const dur = videoRef.current.duration || 0;
    try {
      const raw = localStorage.getItem(`cinema_progress_${movieId}`);
      const parsed = raw ? JSON.parse(raw) : {};
      const updated = {
        ...parsed,
        season: season || parsed.season || 1,
        episode: episode || parsed.episode || 1,
        translationId: selectedTranslationId || parsed.translationId || null,
        playerId: selectedPlayerId || 'videohub',
        time: Math.floor(curTime),
        currentTime: Math.floor(curTime),
        duration: Math.floor(dur),
        updatedAt: Date.now(),
      };
      localStorage.setItem(`cinema_progress_${movieId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  // Save progress instantly when unmounting or changing episode
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.currentTime > 3) {
        saveCurrentProgress(videoRef.current.currentTime);
      }
    };
  }, [movieId, season, episode, selectedTranslationId, selectedPlayerId]);

  const performRestoreTime = () => {
    if (restoredRef.current || !videoRef.current || !movieId) return;
    try {
      let savedTime = startTime && startTime > 5 ? Number(startTime) : 0;

      if (!savedTime) {
        const raw = localStorage.getItem(`cinema_progress_${movieId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const sMatch = !isSeries || !parsed.season || Number(parsed.season) === Number(season || 1);
          const eMatch = !isSeries || !parsed.episode || Number(parsed.episode) === Number(episode || 1);
          if (sMatch && eMatch) {
            savedTime = Number(parsed.time || parsed.currentTime || 0);
          }
        }
      }

      if (savedTime > 5) {
        const totalDur = videoRef.current.duration || 999999;
        if (savedTime < totalDur - 15) {
          videoRef.current.currentTime = savedTime;
          setCurrentTime(savedTime);
          restoredRef.current = true;

          // Double check & retry if autoPlay initialized after metadata and reset currentTime to 0
          setTimeout(() => {
            if (videoRef.current && Math.abs(videoRef.current.currentTime - savedTime) > 3) {
              videoRef.current.currentTime = savedTime;
              setCurrentTime(savedTime);
            }
          }, 150);

          setTimeout(() => {
            if (videoRef.current && Math.abs(videoRef.current.currentTime - savedTime) > 3) {
              videoRef.current.currentTime = savedTime;
              setCurrentTime(savedTime);
            }
          }, 500);
        }
      }
    } catch (e) {}
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
    performRestoreTime();
  };

  // Toggle fullscreen & sync state
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    const isFs = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isFs) {
      const req = containerRef.current.requestFullscreen ||
                  (containerRef.current as any).webkitRequestFullscreen ||
                  (containerRef.current as any).mozRequestFullScreen ||
                  (containerRef.current as any).msRequestFullscreen;
      if (req) req.call(containerRef.current).catch(() => {});
    } else {
      const exit = document.exitFullscreen ||
                   (document as any).webkitExitFullscreen ||
                   (document as any).mozCancelFullScreen ||
                   (document as any).msExitFullscreen;
      if (exit) exit.call(document).catch(() => {});
    }
  };

  // Sync fullscreen state with native browser events
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Autofocus selected or first quality item when dropdown opens
  useEffect(() => {
    if (showQualityDropdown) {
      setTimeout(() => {
        const qualityItems = Array.from(
          containerRef.current?.querySelectorAll<HTMLElement>('[data-quality-dropdown="true"] button') || []
        );
        const selectedOrFirst = qualityItems.find((el) => el.classList.contains('bg-white')) || qualityItems[0];
        if (selectedOrFirst) selectedOrFirst.focus();
      }, 50);
    }
  }, [showQualityDropdown]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetControlsTimer();

      // Close Quality Dropdown on Escape or Back key
      if (showQualityDropdown) {
        if (e.key === 'Escape' || e.key === 'GoBack' || e.keyCode === 27 || e.keyCode === 4) {
          e.preventDefault();
          e.stopPropagation();
          setShowQualityDropdown(false);
          return;
        }
      }

      const activeElem = document.activeElement as HTMLElement | null;
      const activeControl = activeElem?.getAttribute('data-tv-player-control');

      // Intercept D-Pad Arrow keys when any player control or quality item is active
      if (
        (activeControl || activeElem?.closest('[data-quality-dropdown="true"]')) &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();

        // SPECIAL NAVIGATION INSIDE QUALITY DROPDOWN MENU
        if (showQualityDropdown || activeControl === 'quality-item' || activeElem?.closest('[data-quality-dropdown="true"]')) {
          const items = Array.from(
            containerRef.current?.querySelectorAll<HTMLElement>('[data-quality-dropdown="true"] button') || []
          );
          const currentIdx = items.indexOf(activeElem as HTMLElement);

          if (e.key === 'ArrowDown') {
            if (currentIdx !== -1 && currentIdx < items.length - 1) {
              items[currentIdx + 1].focus();
            } else if (items.length > 0) {
              items[0].focus();
            }
            return;
          }
          if (e.key === 'ArrowUp') {
            if (currentIdx > 0) {
              items[currentIdx - 1].focus();
            } else if (items.length > 0) {
              items[items.length - 1].focus();
            }
            return;
          }
          if (e.key === 'ArrowLeft') {
            setShowQualityDropdown(false);
            const qBtn = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="quality"]');
            if (qBtn) qBtn.focus();
            return;
          }
        }

        if (e.key === 'ArrowRight') {
          if (activeControl === 'back') {
            const picker = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="picker"]');
            if (picker) picker.focus();
          } else if (activeControl === 'play') {
            const rewind = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="rewind"]');
            if (rewind) rewind.focus();
          } else if (activeControl === 'rewind') {
            const fwd = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="forward"]');
            if (fwd) fwd.focus();
          } else if (activeControl === 'forward') {
            const q = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="quality"]') ||
                      containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="fullscreen"]');
            if (q) q.focus();
          } else if (activeControl === 'quality') {
            const fs = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="fullscreen"]');
            if (fs) fs.focus();
          } else if (activeControl === 'timeline') {
            seekRelative(5);
          }
          return;
        }

        if (e.key === 'ArrowLeft') {
          if (activeControl === 'picker') {
            const back = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="back"]');
            if (back) back.focus();
          } else if (activeControl === 'fullscreen') {
            const q = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="quality"]') ||
                      containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="forward"]');
            if (q) q.focus();
          } else if (activeControl === 'quality') {
            const fwd = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="forward"]');
            if (fwd) fwd.focus();
          } else if (activeControl === 'forward') {
            const r = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="rewind"]');
            if (r) r.focus();
          } else if (activeControl === 'rewind') {
            const p = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="play"]');
            if (p) p.focus();
          } else if (activeControl === 'timeline') {
            seekRelative(-5);
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          if (activeControl === 'timeline') {
            const back = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="back"]') ||
                         containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="picker"]');
            if (back) back.focus();
          } else if (['play', 'rewind', 'forward', 'quality', 'fullscreen'].includes(activeControl || '')) {
            const timeline = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="timeline"]');
            if (timeline) timeline.focus();
          }
          return;
        }

        if (e.key === 'ArrowDown') {
          if (activeControl === 'back' || activeControl === 'picker') {
            const timeline = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="timeline"]');
            if (timeline) timeline.focus();
          } else if (activeControl === 'timeline') {
            const play = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="play"]');
            if (play) play.focus();
          }
          return;
        }
      }

      // Don't intercept shortcut keys if typing in standard text inputs
      if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type !== 'range') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          if (!showControls) {
            e.preventDefault();
            seekRelative(-10);
          }
          break;
        case 'ArrowRight':
          if (!showControls) {
            e.preventDefault();
            seekRelative(10);
          }
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          setShowControls(true);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [resetControlsTimer, duration, showControls, showQualityDropdown]);

  // Wakeup controls on fullscreen change, window focus, or cursor returning to window
  useEffect(() => {
    const handleWakeup = () => {
      resetControlsTimer();
    };

    window.addEventListener('focus', handleWakeup);
    window.addEventListener('mouseenter', handleWakeup);
    window.addEventListener('pointermove', handleWakeup, { capture: true });
    window.addEventListener('mousemove', handleWakeup, { capture: true });
    document.addEventListener('fullscreenchange', handleWakeup);

    return () => {
      window.removeEventListener('focus', handleWakeup);
      window.removeEventListener('mouseenter', handleWakeup);
      window.removeEventListener('pointermove', handleWakeup, { capture: true });
      window.removeEventListener('mousemove', handleWakeup, { capture: true });
      document.removeEventListener('fullscreenchange', handleWakeup);
    };
  }, [resetControlsTimer]);

  const isCollaps = selectedPlayerId === 'collaps' || (fallbackIframeSrc && fallbackIframeSrc.includes('ortified.ws'));

  // If no direct video src is provided, fallback cleanly to iframe with our custom controls overlay
  if (!src) {
    return (
      <div
        ref={containerRef}
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
        onClick={resetControlsTimer}
        className="relative w-screen h-[100dvh] bg-black overflow-hidden select-none font-sans group"
      >
        {/* TOP SENSITIVE HOVER STRIP FOR GUARANTEED MOUSEMOVE WAKEUP */}
        <div
          onMouseEnter={resetControlsTimer}
          onMouseMove={resetControlsTimer}
          className={`absolute top-0 inset-x-0 h-16 z-30 ${isCollaps ? 'pointer-events-none' : 'pointer-events-auto'}`}
        />
        {/* TOP HEADER CONTROLS OVERLAY (ALWAYS Z-40 ABOVE PRELOADER) */}
        <div
          className={`absolute inset-x-0 p-4 lg:p-6 flex items-center justify-between transition-all duration-300 z-40 pointer-events-none ${
            isCollaps
              ? 'top-10 lg:top-12 bg-gradient-to-b from-transparent via-black/40 to-transparent'
              : 'top-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent'
          } ${showControls ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={onBack}
              aria-label="Назад"
              tabIndex={0}
              data-tv-player-control="back"
              className="focusable-tv p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/20 backdrop-blur-md text-white transition-all active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-xl"
            >
              <svg className="w-5 h-5 stroke-white fill-none stroke-[2.5]" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div>
              <h1 className="text-lg lg:text-xl font-black text-white line-clamp-1">{title}</h1>
              {isSeries && ((totalSeasons || 0) > 1 || (totalEpisodes || 0) > 1) && (
                <p className="text-xs text-zinc-400 font-semibold">
                  {(totalSeasons || 0) > 1 ? `Сезон ${season || 1}, ` : ''}Серия {episode || 1}
                </p>
              )}
            </div>
          </div>

          {onSelectEpisodeModal && (
            <button
              onClick={onSelectEpisodeModal}
              tabIndex={0}
              data-tv-player-control="picker"
              className="focusable-tv pointer-events-auto px-4 py-2 flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-bold text-xs shadow-xl outline-none focus:outline-none focus:ring-4 focus:ring-white cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>
                {((totalSeasons || 0) > 1 || (totalEpisodes || 0) > 1)
                  ? `С${season || 1} Е${episode || 1} (Выбор серии)`
                  : players && players.length > 1
                  ? 'Плееры и источники'
                  : 'Выбор серии'}
              </span>
            </button>
          )}
        </div>

        {/* IFRAME PRELOADER (LOCATED AT Z-10 BEHIND TOP BAR Z-40) */}
        {isIframeLoading && (
          <div className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center pointer-events-none">
            <FrameBrandLoader />
          </div>
        )}

        <iframe
          src={fallbackIframeSrc}
          title={title}
          className="w-full h-full border-0 relative z-20"
          onLoad={() => setIsIframeLoading(false)}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={resetControlsTimer}
      className="relative w-screen h-[100dvh] bg-black overflow-hidden select-none font-sans group"
    >
      {/* HTML5 VIDEO STREAM */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        muted={isMuted}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={performRestoreTime}
        onCanPlay={performRestoreTime}
        onPlay={() => {
          setIsPlaying(true);
          performRestoreTime();
        }}
        onPause={() => {
          setIsPlaying(false);
          if (videoRef.current) saveCurrentProgress(videoRef.current.currentTime);
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            if (!restoredRef.current && videoRef.current.currentTime < 3) {
              performRestoreTime();
            }

            const cur = videoRef.current.currentTime;
            const dur = videoRef.current.duration || 0;
            setCurrentTime(cur);
            setDuration(dur);

            // Calculate buffer
            if (videoRef.current.buffered.length > 0) {
              const bufEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
              setBuffered((bufEnd / (dur || 1)) * 100);
            }

            // Save progress to localStorage every 2 seconds during playback
            if (cur > 3 && Math.abs(cur - lastSavedTimeRef.current) >= 2) {
              lastSavedTimeRef.current = cur;
              saveCurrentProgress(cur);
            }
          }
        }}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* TOP HEADER CONTROLS */}
      <div
        className={`absolute top-0 inset-x-0 p-4 lg:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-40 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pr-2">
          <button
            onClick={onBack}
            aria-label="Назад"
            tabIndex={0}
            data-tv-player-control="back"
            className="focusable-tv p-2.5 rounded-3xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/20 backdrop-blur-md text-white transition-all active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-xl shrink-0"
          >
            <svg className="w-5 h-5 stroke-white fill-none stroke-[2.5]" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg lg:text-xl font-black text-white truncate max-w-[200px] xs:max-w-[280px] sm:max-w-md lg:max-w-xl">{title}</h1>
            {isSeries && ((totalSeasons || 0) > 1 || (totalEpisodes || 0) > 1) && (
              <p className="text-[11px] sm:text-xs text-zinc-400 font-semibold truncate">
                {(totalSeasons || 0) > 1 ? `Сезон ${season || 1}, ` : ''}Серия {episode || 1}
              </p>
            )}
          </div>
        </div>

        {onSelectEpisodeModal && (
          <button
            onClick={onSelectEpisodeModal}
            tabIndex={0}
            data-tv-player-control="picker"
            aria-label="Выбор серии и озвучки"
            className="focusable-tv px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-bold text-xs shadow-xl outline-none focus:outline-none focus:ring-4 focus:ring-white cursor-pointer active:scale-95 shrink-0"
          >
            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">
              {((totalSeasons || 0) > 1 || (totalEpisodes || 0) > 1)
                ? `С${season || 1} Е${episode || 1} (Выбор серии)`
                : players && players.length > 1
                ? 'Плееры и озвучка'
                : 'Выбор озвучки'}
            </span>
            <span className="sm:hidden font-extrabold text-xs">
              {((totalSeasons || 0) > 1 || (totalEpisodes || 0) > 1)
                ? `С${season || 1} Е${episode || 1}`
                : 'Меню'}
            </span>
          </button>
        )}
      </div>

      {/* CENTER PLAY/PAUSE BIG OVERLAY ICON (ON TOUCH/CLICK) */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs cursor-pointer z-30"
        >
          <button className="w-20 h-20 rounded-full bg-white/90 text-black flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95">
            <svg className="w-10 h-10 fill-black ml-1" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}

      {/* BOTTOM CONTROLS BAR */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 lg:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3 transition-opacity duration-300 z-40 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* INTERACTIVE SEEK TIMELINE BAR */}
        <div className="space-y-1">
          <div className="relative w-full h-3.5 group/slider flex items-center cursor-pointer">
            {/* Background Track */}
            <div className="absolute inset-0 rounded-full bg-white/20 group-focus-within/slider:ring-2 group-focus-within/slider:ring-indigo-400 group-focus-within/slider:scale-y-125 transition-all" />
            {/* Buffer Track */}
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full bg-white/30 transition-all duration-200"
              style={{ width: `${buffered}%` }}
            />
            {/* Progress Track */}
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50 group-focus-within/slider:bg-gradient-to-r group-focus-within/slider:from-indigo-500 group-focus-within/slider:to-violet-400"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            {/* Glowing Focus Thumb Indicator */}
            <div
              className="absolute w-4 h-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] transition-transform scale-0 group-focus-within/slider:scale-125 -ml-2 pointer-events-none"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            {/* Native Slider Input */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = val;
                setCurrentTime(val);
              }}
              tabIndex={0}
              data-tv-player-control="timeline"
              className="focusable-tv absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none rounded-full"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1 pt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            {/* PLAY / PAUSE */}
            <button
              onClick={togglePlay}
              tabIndex={0}
              data-tv-player-control="play"
              aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
              className="focusable-tv p-3 rounded-3xl bg-white hover:bg-zinc-200 text-black font-extrabold flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-white shadow-xl"
            >
              {isPlaying ? (
                <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* REWIND -10S */}
            <button
              onClick={() => seekRelative(-10)}
              tabIndex={0}
              data-tv-player-control="rewind"
              aria-label="Назад на 10 секунд"
              className="focusable-tv flex p-2.5 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white items-center gap-1 text-xs font-bold shrink-0"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
              </svg>
              <span>-10s</span>
            </button>

            {/* FAST FORWARD +10S */}
            <button
              onClick={() => seekRelative(10)}
              tabIndex={0}
              data-tv-player-control="forward"
              aria-label="Вперёд на 10 секунд"
              className="focusable-tv flex p-2.5 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white items-center gap-1 text-xs font-bold shrink-0"
            >
              <span>+10s</span>
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* QUALITY DROPDOWN SELECTOR */}
            {qualities && qualities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowQualityDropdown((prev) => !prev)}
                  tabIndex={0}
                  data-tv-player-control="quality"
                  className="focusable-tv px-3.5 py-2 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
                >
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {qualities.find((q) => (selectedQualityUrl ? selectedQualityUrl === q.url : src === q.url))?.label || qualities[0]?.label || 'Качество'}
                  </span>
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showQualityDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showQualityDropdown && (
                  <div data-quality-dropdown="true" className="absolute bottom-12 right-0 bg-zinc-900/95 border border-zinc-700/60 rounded-3xl p-2 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1 min-w-[130px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] uppercase font-black tracking-wider text-zinc-400 px-3 py-1 border-b border-white/5">
                      Качество
                    </div>
                    {qualities.map((q) => {
                      const isSelected = selectedQualityUrl ? selectedQualityUrl === q.url : src === q.url;
                      return (
                        <button
                          key={q.label}
                          tabIndex={0}
                          data-tv-player-control="quality-item"
                          onClick={() => {
                            if (onSelectQuality) onSelectQuality(q.url);
                            setShowQualityDropdown(false);
                            setTimeout(() => {
                              const qBtn = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="quality"]');
                              if (qBtn) qBtn.focus();
                            }, 50);
                          }}
                          className={`focusable-tv w-full px-3 py-2 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-95 outline-none focus:ring-2 focus:ring-white focus:bg-indigo-600 focus:text-white ${
                            isSelected
                              ? 'bg-white text-black shadow-md'
                              : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{q.label}</span>
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 fill-black" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* FULLSCREEN TOGGLE */}
            <button
              onClick={toggleFullscreen}
              tabIndex={0}
              data-tv-player-control="fullscreen"
              aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
              className="focusable-tv p-3 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white shadow-lg shrink-0"
            >
              <svg className="w-5 h-5 stroke-white fill-none stroke-[2]" viewBox="0 0 24 24">
                {isFullscreen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m11 5l5-5m0 0h-4m4 0v4M9 15l-5 5m0 0v-4m0 4h4m11 0l-5-5m0 0v4m0-4h4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
