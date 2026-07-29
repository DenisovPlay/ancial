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
  totalEpisodes?: number;
  totalSeasons?: number;
  isSeries?: boolean;
  translations?: Array<{ id: number; title: string }>;
  selectedTranslationId?: number | null;
  players?: Array<{ id: string; name: string; provider: string; quality?: string }>;
  selectedPlayerId?: string;
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
  totalEpisodes,
  totalSeasons,
  isSeries = false,
  translations,
  selectedTranslationId,
  players,
  selectedPlayerId = 'flixcdn',
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

  // Save playback time periodically
  useEffect(() => {
    if (!isPlaying || !currentTime) return;
    const timer = setTimeout(() => {
      try {
        const progRaw = localStorage.getItem(`cinema_progress_${movieId}`);
        const parsed = progRaw ? JSON.parse(progRaw) : {};
        parsed.currentTime = currentTime;
        parsed.updatedAt = Date.now();
        localStorage.setItem(`cinema_progress_${movieId}`, JSON.stringify(parsed));
      } catch (e) { }
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentTime, isPlaying, movieId]);

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => { });
    }
  };

  // Seek relative seconds
  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    resetControlsTimer();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetControlsTimer();

      // Don't intercept if typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetControlsTimer, duration, showControls]);

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
          className="absolute top-0 inset-x-0 h-16 z-30 pointer-events-auto"
        />
        {/* TOP HEADER CONTROLS OVERLAY (ALWAYS Z-40 ABOVE PRELOADER) */}
        <div
          className={`absolute top-0 inset-x-0 p-4 lg:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-40 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              aria-label="Назад"
              tabIndex={0}
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
              className="focusable-tv px-4 py-2 flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-bold text-xs shadow-xl outline-none focus:outline-none focus:ring-4 focus:ring-white cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>
                {((totalSeasons || 0) > 1 || (totalEpisodes || 0) > 1)
                  ? `С${season || 1} Е${episode || 1} (Выбор серии)`
                  : players && players.length > 1
                  ? 'Плееры и озвучка'
                  : 'Выбор озвучки'}
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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration || 0);

            // Calculate buffer
            if (videoRef.current.buffered.length > 0) {
              const bufEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
              setBuffered((bufEnd / (videoRef.current.duration || 1)) * 100);
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
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            aria-label="Назад"
            tabIndex={0}
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
            className="focusable-tv px-4 py-2 flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-bold text-xs shadow-xl outline-none focus:outline-none focus:ring-4 focus:ring-white cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>
              {((totalSeasons || 0) > 1 || (totalEpisodes || 0) > 1)
                ? `С${season || 1} Е${episode || 1} (Выбор серии)`
                : players && players.length > 1
                ? 'Плееры и озвучка'
                : 'Выбор озвучки'}
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
          <div className="relative w-full h-2 group/slider flex items-center cursor-pointer">
            {/* Background Track */}
            <div className="absolute inset-0 rounded-full bg-white/20" />
            {/* Buffer Track */}
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full bg-white/30 transition-all duration-200"
              style={{ width: `${buffered}%` }}
            />
            {/* Progress Track */}
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
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
              className="focusable-tv absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none focus:ring-2 focus:ring-white rounded-full"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1 pt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            {/* PLAY / PAUSE */}
            <button
              onClick={togglePlay}
              tabIndex={0}
              className="focusable-tv p-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-extrabold flex items-center justify-center transition-transform active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-white"
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
              aria-label="Назад на 10 секунд"
              className="focusable-tv p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white flex items-center gap-1 text-xs font-bold"
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
              aria-label="Вперёд на 10 секунд"
              className="focusable-tv p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white flex items-center gap-1 text-xs font-bold"
            >
              <span>+10s</span>
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* FULLSCREEN TOGGLE */}
            <button
              onClick={toggleFullscreen}
              tabIndex={0}
              aria-label="Полноэкранный режим"
              className="focusable-tv p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white"
            >
              <svg className="w-5 h-5 stroke-white fill-none stroke-[2]" viewBox="0 0 24 24">
                {isFullscreen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m6 0l5 5m0-5v4m0-4h-4m-6 16l-5-5m0 5v-4m0 4h4m6 0l5-5m0 5v-4m0 4h-4" />
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
