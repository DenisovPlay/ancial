'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { FrameBrandLoader } from './cinema-skeleton';
import { getMovieProgress, saveWatchHistoryItem } from '../cinema-history';
import {
  isLikelyCinemaContentDuration,
  parseFlixPlaybackPayload,
  resolveResumeTime,
} from '../cinema-progress';

/** iOS Safari: нативный фуллскрин <video>. */
type IosFullscreenVideo = {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

/** Вендорные свойства Document для фуллскрина (Safari/Firefox/IE). */
type FsVendorDoc = {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

/** Вендорные методы запроса фуллскрина для HTMLElement. */
type FsVendorReq = {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isSeekingRef = useRef<boolean>(false);
  const seekDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isFlixCDN = Boolean(
    selectedPlayerId === 'flixcdn' ||
    (fallbackIframeSrc && (fallbackIframeSrc.includes('tarantino.factorios.live') || fallbackIframeSrc.includes('flixcdn')))
  );

  const releaseSeekingDebounce = useCallback(() => {
    if (seekDebounceTimerRef.current) clearTimeout(seekDebounceTimerRef.current);
    seekDebounceTimerRef.current = setTimeout(() => {
      isSeekingRef.current = false;
    }, 1200);
  }, []);

  const sendIframeCommand = useCallback((cmd: string, val?: number) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    const win = iframeRef.current.contentWindow;
    try {
      if (cmd === 'pause') {
        win.postMessage('pause', '*');
        win.postMessage({ api: 'pause' }, '*');
        win.postMessage(JSON.stringify({ api: 'pause' }), '*');
      } else if (cmd === 'play') {
        win.postMessage('play', '*');
        win.postMessage({ api: 'play' }, '*');
        win.postMessage(JSON.stringify({ api: 'play' }), '*');
      } else if (cmd === 'playpause') {
        win.postMessage('playpause', '*');
        win.postMessage('play', '*');
        win.postMessage({ api: 'play' }, '*');
      } else if (cmd === 'seek') {
        isSeekingRef.current = true;
        releaseSeekingDebounce();
        win.postMessage({ api: 'seek', time: val }, '*');
        win.postMessage(JSON.stringify({ api: 'seek', time: val }), '*');
        win.postMessage({ event: 'seek', time: val }, '*');
        win.postMessage(JSON.stringify({ event: 'seek', time: val }), '*');
        win.postMessage(`seek:${val}`, '*');
        win.postMessage(`time:${val}`, '*');
      } else if (cmd === 'volume') {
        win.postMessage({ api: 'setVolume', volume: val }, '*');
        win.postMessage(JSON.stringify({ api: 'setVolume', volume: val }), '*');
      }
    } catch (e) {}
  }, [releaseSeekingDebounce]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const currentTimeRef = useRef<number>(0);
  // Keep a separate ref so unmount cleanup can always read the latest time
  // regardless of stale closures (relevant for FlixCDN iframe where videoRef has no time)
  const liveCurrentTimeRef = useRef<number>(0);

  const updateCurrentTime = useCallback((time: number) => {
    currentTimeRef.current = time;
    liveCurrentTimeRef.current = time;
    setCurrentTime(time);
  }, []);

  const [duration, setDuration] = useState<number>(0);
  const durationRef = useRef<number>(0);

  const updateDuration = useCallback((nextDuration: number) => {
    durationRef.current = nextDuration;
    setDuration(nextDuration);
  }, []);
  const [buffered, setBuffered] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState<boolean>(false);

  const [showControls, setShowControls] = useState<boolean>(true);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasSeekedSavedTimeRef = useRef<boolean>(false);
  const hasReceivedContentDurationRef = useRef<boolean>(false);
  const hasHandledEndedRef = useRef<boolean>(false);

  const getSavedTime = useCallback((): number => {
    return resolveResumeTime(
      startTime,
      movieId ? getMovieProgress(movieId) : null,
      isSeries,
      season || 1,
      episode || 1,
    );
  }, [startTime, movieId, isSeries, season, episode]);

  const saveCurrentProgress = (overrideTime?: number) => {
    if (!movieId) return;
    const liveDuration = videoRef.current?.duration || durationRef.current;
    const hasPlayableDuration = src
      ? Number.isFinite(liveDuration) && liveDuration > 30
      : isLikelyCinemaContentDuration(liveDuration);
    if (!hasPlayableDuration) return;
    const curTime = overrideTime !== undefined ? overrideTime : (videoRef.current ? videoRef.current.currentTime : liveCurrentTimeRef.current);
    if (!curTime || curTime < 3) return;
    const dur = liveDuration;
    const activeTransObj = translations?.find((t) => t.id === selectedTranslationId);
    const activePlayerObj = players?.find((p) => p.id === selectedPlayerId);

    saveWatchHistoryItem({
      id: movieId,
      title,
      season: season || 1,
      episode: episode || 1,
      translationId: selectedTranslationId || null,
      translationTitle: activeTransObj?.title || '',
      playerId: selectedPlayerId || 'videohub',
      playerName: activePlayerObj?.name || '',
      time: Math.floor(curTime),
      currentTime: Math.floor(curTime),
      durationSeconds: Math.floor(dur),
      type: isSeries ? 'series' : 'movie',
      preserveActiveSelection: true,
    });
  };

  // Throttle-сохранение прогресса: не чаще одного раза в 2 секунды воспроизведения.
  const maybeSaveProgress = (time: number) => {
    if (time > 3 && Math.abs(time - lastSavedTimeRef.current) >= 2) {
      lastSavedTimeRef.current = time;
      saveCurrentProgress(time);
    }
  };

  // PostMessage listener for iframe player state events
  useEffect(() => {
    if (!isFlixCDN) return;

    const handleIframeMessage = (e: MessageEvent) => {
      try {
        if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
        if (fallbackIframeSrc) {
          const expectedOrigin = new URL(fallbackIframeSrc, window.location.origin).origin;
          if (e.origin && e.origin !== 'null' && e.origin !== expectedOrigin) return;
        }
        let data = e.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (err) {}
        }
        if (!data || typeof data !== 'object') return;
        const playback = parseFlixPlaybackPayload(data);

        if (playback.duration !== undefined && isLikelyCinemaContentDuration(playback.duration)) {
          hasReceivedContentDurationRef.current = true;
          updateDuration(playback.duration);

          // Auto-restore saved progress as soon as ad finishes & real duration is received
          if (!hasSeekedSavedTimeRef.current) {
            const savedTime = getSavedTime();
            if (savedTime > 5 && savedTime < playback.duration - 15) {
              hasSeekedSavedTimeRef.current = true;
              updateCurrentTime(savedTime);
              setTimeout(() => {
                sendIframeCommand('seek', savedTime);
              }, 150);
              setTimeout(() => {
                sendIframeCommand('seek', savedTime);
              }, 500);
            }
          }
        }
        if (playback.time !== undefined && hasReceivedContentDurationRef.current) {
          if (!isSeekingRef.current) {
            updateCurrentTime(playback.time);
            maybeSaveProgress(playback.time);
          }
        }

        if (data.event === 'pause' || data.event === 'paused' || data.action === 'Video paused') {
          setIsPlaying(false);
        } else if (data.event === 'play' || data.event === 'playing' || data.action === 'Video playing') {
          setIsPlaying(true);
        } else if (
          data.event === 'ended' ||
          data.event === 'finished' ||
          data.event === 'complete' ||
          data.action === 'Video ended' ||
          data.action === 'Video finished'
        ) {
          // Ignore ad completion and duplicate provider completion events.
          if (hasReceivedContentDurationRef.current && !hasHandledEndedRef.current && onNextEpisode) {
            hasHandledEndedRef.current = true;
            onNextEpisode();
          }
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [isFlixCDN, fallbackIframeSrc, movieId, season, episode, updateCurrentTime, updateDuration, getSavedTime, sendIframeCommand, onNextEpisode]);

  useEffect(() => {
    // Сброс лоадера при смене источника плеера — сеттлер здесь и есть источник правды:
    // новый iframe обязан показать спиннер до onLoad, альтернативы без каскада нет.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Показ контролов при монтировании/смене фильма — resetControlsTimer и есть источник правды.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [movieId, resetControlsTimer]);

  // Seek relative seconds with instant ref sync
  const seekRelative = (seconds: number) => {
    const baseTime = currentTimeRef.current || (videoRef.current ? videoRef.current.currentTime : 0);
    const targetTime = Math.max(0, Math.min(duration || 999999, baseTime + seconds));
    updateCurrentTime(targetTime);

    if (isFlixCDN && !src) {
      sendIframeCommand('seek', targetTime);
      resetControlsTimer();
      return;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      resetControlsTimer();
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (isFlixCDN && !src) {
      const nextState = !isPlaying;
      setIsPlaying(nextState);
      sendIframeCommand(nextState ? 'play' : 'pause');
      return;
    }
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


  // Save progress instantly when unmounting or changing episode
  useEffect(() => {
    return () => {
      // For FlixCDN iframe: videoRef has no time — use liveCurrentTimeRef updated from postMessages
      // For native video: use videoRef.currentTime
      const timeToSave = videoRef.current && videoRef.current.currentTime > 3
        ? videoRef.current.currentTime
        : liveCurrentTimeRef.current;
      if (timeToSave > 3) {
        saveCurrentProgress(timeToSave);
      }
    };
  }, [movieId, season, episode, selectedTranslationId, selectedPlayerId]);

  const performRestoreTime = () => {
    if (restoredRef.current || !videoRef.current || !movieId) return;
    try {
      const savedTime = resolveResumeTime(
        startTime,
        getMovieProgress(movieId),
        isSeries,
        season || 1,
        episode || 1,
      );

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
      updateDuration(videoRef.current.duration || 0);
    }
    performRestoreTime();
  };

  // Toggle fullscreen & sync state (supporting iOS / Safari / Desktop / Mobile)
  const toggleFullscreen = () => {
    // 1. Check iOS Safari Video native fullscreen method first
    if (videoRef.current && typeof (videoRef.current as HTMLVideoElement & IosFullscreenVideo).webkitEnterFullscreen === 'function') {
      if ((videoRef.current as HTMLVideoElement & IosFullscreenVideo).webkitDisplayingFullscreen) {
        (videoRef.current as HTMLVideoElement & IosFullscreenVideo).webkitExitFullscreen?.();
      } else {
        (videoRef.current as HTMLVideoElement & IosFullscreenVideo).webkitEnterFullscreen?.();
      }
      return;
    }

    if (!containerRef.current) return;
    const isFs = !!(
      document.fullscreenElement ||
      (document as Document & FsVendorDoc).webkitFullscreenElement ||
      (document as Document & FsVendorDoc).mozFullScreenElement ||
      (document as Document & FsVendorDoc).msFullscreenElement
    );

    if (!isFs) {
      const req = containerRef.current.requestFullscreen ||
                  (containerRef.current as HTMLElement & FsVendorReq).webkitRequestFullscreen ||
                  (containerRef.current as HTMLElement & FsVendorReq).mozRequestFullScreen ||
                  (containerRef.current as HTMLElement & FsVendorReq).msRequestFullscreen;
      if (req) {
        req.call(containerRef.current).catch(() => {
          (videoRef.current as (HTMLVideoElement & IosFullscreenVideo) | null)?.webkitEnterFullscreen?.();
        });
      } else if (videoRef.current && (videoRef.current as HTMLVideoElement & IosFullscreenVideo).webkitEnterFullscreen) {
        (videoRef.current as HTMLVideoElement & IosFullscreenVideo).webkitEnterFullscreen?.();
      }
    } else {
      const exit = document.exitFullscreen ||
                   (document as Document & FsVendorDoc).webkitExitFullscreen ||
                   (document as Document & FsVendorDoc).mozCancelFullScreen ||
                   (document as Document & FsVendorDoc).msExitFullscreen;
      if (exit) exit.call(document).catch(() => {});
    }
  };

  // Sync fullscreen state with native browser & webkit events
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as Document & FsVendorDoc).webkitFullscreenElement ||
        (document as Document & FsVendorDoc).mozFullScreenElement ||
        (document as Document & FsVendorDoc).msFullscreenElement ||
        (videoRef.current as (HTMLVideoElement & IosFullscreenVideo) | null)?.webkitDisplayingFullscreen
      );
      setIsFullscreen(isFs);
    };

    const vid = videoRef.current;

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    if (vid) {
      vid.addEventListener('webkitbeginfullscreen', handleFsChange);
      vid.addEventListener('webkitendfullscreen', handleFsChange);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
      if (vid) {
        vid.removeEventListener('webkitbeginfullscreen', handleFsChange);
        vid.removeEventListener('webkitendfullscreen', handleFsChange);
      }
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
            if (picker) { picker.focus(); return; }
            // no picker — jump to timeline
            const tl = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="timeline"]');
            if (tl) tl.focus();
          } else if (activeControl === 'picker') {
            // nothing to the right in top bar
          } else if (activeControl === 'play') {
            const prevEp = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="prev-episode"]');
            if (prevEp) { prevEp.focus(); return; }
            const nextEp = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="next-episode"]');
            if (nextEp) { nextEp.focus(); return; }
            const q = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="quality"]') ||
                      containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="fullscreen"]');
            if (q) q.focus();
          } else if (activeControl === 'prev-episode') {
            const nextEp = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="next-episode"]');
            if (nextEp) { nextEp.focus(); return; }
            const q = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="quality"]') ||
                      containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="fullscreen"]');
            if (q) q.focus();
          } else if (activeControl === 'next-episode') {
            const q = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="quality"]') ||
                      containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="fullscreen"]');
            if (q) q.focus();
          } else if (activeControl === 'quality') {
            const fs = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="fullscreen"]');
            if (fs) fs.focus();
          } else if (activeControl === 'timeline') {
            seekRelative(10);
          }
          return;
        }

        if (e.key === 'ArrowLeft') {
          if (activeControl === 'picker') {
            const back = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="back"]');
            if (back) back.focus();
          } else if (activeControl === 'fullscreen') {
            const q = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="quality"]') ||
                      containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="next-episode"]') ||
                      containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="prev-episode"]') ||
                      containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="play"]');
            if (q) q.focus();
          } else if (activeControl === 'quality') {
            const nextEp = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="next-episode"]');
            if (nextEp) { nextEp.focus(); return; }
            const prevEp = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="prev-episode"]');
            if (prevEp) { prevEp.focus(); return; }
            const play = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="play"]');
            if (play) play.focus();
          } else if (activeControl === 'next-episode') {
            const prevEp = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="prev-episode"]');
            if (prevEp) { prevEp.focus(); return; }
            const play = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="play"]');
            if (play) play.focus();
          } else if (activeControl === 'prev-episode') {
            const play = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="play"]');
            if (play) play.focus();
          } else if (activeControl === 'play') {
            // play is the leftmost in bottom bar
          } else if (activeControl === 'timeline') {
            seekRelative(-10);
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          if (activeControl === 'timeline') {
            const back = containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="back"]') ||
                         containerRef.current?.querySelector<HTMLElement>('[data-tv-player-control="picker"]');
            if (back) back.focus();
          } else if (['play', 'prev-episode', 'next-episode', 'quality', 'fullscreen'].includes(activeControl || '')) {
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

        {/* IFRAME PRELOADER OR LOADING SPINNER (LOCATED AT Z-10 BEHIND TOP BAR Z-40) */}
        {(isIframeLoading || !fallbackIframeSrc) && (
          <div className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center pointer-events-none">
            <FrameBrandLoader />
          </div>
        )}

        {Boolean(fallbackIframeSrc) && (
          <iframe
            ref={iframeRef}
            src={fallbackIframeSrc}
            title={title}
            className="w-full h-full border-0 relative z-20"
            onLoad={() => setIsIframeLoading(false)}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* FLIXCDN CUSTOM CONTROLS OVERLAY (BOTTOM BAR) */}
        {isFlixCDN && (
          <div
            className={`absolute bottom-0 inset-x-0 p-4 lg:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3 transition-opacity duration-300 z-40 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* INTERACTIVE SEEK TIMELINE BAR */}
            <div className="space-y-1">
              <div className="relative w-full h-3.5 group/slider flex items-center cursor-pointer">
                <div className="absolute inset-0 rounded-full bg-white/20 group-focus-within/slider:ring-2 group-focus-within/slider:ring-indigo-400 group-focus-within/slider:scale-y-125 transition-all" />
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50 group-focus-within/slider:bg-gradient-to-r group-focus-within/slider:from-indigo-500 group-focus-within/slider:to-violet-400"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onMouseDown={() => { isSeekingRef.current = true; }}
                  onTouchStart={() => { isSeekingRef.current = true; }}
                  onMouseUp={releaseSeekingDebounce}
                  onTouchEnd={releaseSeekingDebounce}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    isSeekingRef.current = true;
                    setCurrentTime(val);
                    sendIframeCommand('seek', val);
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

                {/* PREV EPISODE — desktop only */}
                {onPrevEpisode && (
                  <button
                    onClick={onPrevEpisode}
                    tabIndex={0}
                    data-tv-player-control="prev-episode"
                    aria-label="Предыдущая серия"
                    className="hidden md:flex focusable-tv p-2.5 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white items-center gap-1 text-xs font-bold shrink-0"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                  </button>
                )}

                {/* NEXT EPISODE — desktop only */}
                {onNextEpisode && (
                  <button
                    onClick={onNextEpisode}
                    tabIndex={0}
                    data-tv-player-control="next-episode"
                    aria-label="Следующая серия"
                    className="hidden md:flex focusable-tv p-2.5 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white items-center gap-1 text-xs font-bold shrink-0"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zm2.5-6l8.5 6V6z" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFullscreen}
                  tabIndex={0}
                  data-tv-player-control="fullscreen"
                  aria-label="На весь экран"
                  className="focusable-tv p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
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
        onEnded={() => {
          setIsPlaying(false);
          if (videoRef.current) saveCurrentProgress(videoRef.current.currentTime);
          // Auto-advance to next episode when direct video stream ends
          if (onNextEpisode) {
            onNextEpisode();
          }
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            if (!restoredRef.current && videoRef.current.currentTime < 3) {
              performRestoreTime();
            }

            const cur = videoRef.current.currentTime;
            const dur = videoRef.current.duration || 0;
            updateCurrentTime(cur);
            updateDuration(dur);

            // Calculate buffer
            if (videoRef.current.buffered.length > 0) {
              const bufEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
              setBuffered((bufEnd / (dur || 1)) * 100);
            }

            // Save progress to localStorage every 2 seconds during playback
            maybeSaveProgress(cur);
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

            {/* PREV EPISODE — desktop only */}
            {onPrevEpisode && (
              <button
                onClick={onPrevEpisode}
                tabIndex={0}
                data-tv-player-control="prev-episode"
                aria-label="Предыдущая серия"
                className="hidden md:flex focusable-tv p-2.5 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white items-center gap-1 text-xs font-bold shrink-0"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
            )}

            {/* NEXT EPISODE — desktop only */}
            {onNextEpisode && (
              <button
                onClick={onNextEpisode}
                tabIndex={0}
                data-tv-player-control="next-episode"
                aria-label="Следующая серия"
                className="hidden md:flex focusable-tv p-2.5 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white items-center gap-1 text-xs font-bold shrink-0"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zm2.5-6l8.5 6V6z" />
                </svg>
              </button>
            )}
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
                            if (videoRef.current) saveCurrentProgress(videoRef.current.currentTime);
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
              className="focusable-tv p-3 rounded-3xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white shadow-lg shrink-0 flex items-center justify-center"
            >
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                {isFullscreen ? (
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                ) : (
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
