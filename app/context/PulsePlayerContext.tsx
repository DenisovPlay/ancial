'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { AncialAPI } from '../lib/api-v2';
import { cache } from '../lib/cache.ts';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse/pulse-image';
import { shouldDisableWebAudioForDevice, useEqualizer } from '../pulse/player/use-equalizer';
import { usePulseFavorites } from '../pulse/player/use-pulse-favorites';
import { useAddToPlaylist } from '../pulse/player/use-add-to-playlist';
import { loadPulseLyrics } from '../pulse/player/lyrics-service';
import { useOfflineAudioSave } from '../pulse/player/use-offline-audio-save';
import { useVisualAudioProgress } from '../pulse/player/use-visual-audio-progress';
import { PulsePlayerFull } from '../pulse/player/pulse-player-full';
import type { RepeatMode } from '../pulse/player/pulse-player-full-controls';
import { PulsePlayerModals } from '../pulse/player/pulse-player-modals';
import { PulsePlayerMini } from '../pulse/player/pulse-player-mini';
import { shouldRunPulseFullPlayerWork } from '../pulse/player/pulse-player-visibility';
import {
  getCachedAudioObjectUrl,
  getDownloadedAudioTracks,
  mapDownloadedAudioToTracks,
  releaseObjectUrl,
} from '../pulse/player/offline-audio';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { useUserCountry } from '../lib/user-geo';
import {
  getActiveLyricState,
  splitLyricText,
  type PulseLyricsLine,
} from '../pulse/player/pulse-lyrics';

import {
  buildMediaArtwork,
  clamp,
  cn,
  formatPlaybackTime,
  getTrackArtist,
  getTrackArtwork,
  getTrackDisplayTitle,
  isTrackPlayable,
  normalizeSongIds,
  normalizeText,
  normalizeTrackSource,
  parsePlaylistSongs,
  toNumber,
} from '../pulse/player/player-utils';

type LangMap = Record<string, string> | null;

type PulseArtwork = {
  sizes?: string | null;
  src?: string | null;
  type?: string | null;
};

export type PulseTrack = {
  album?: string | null;
  albumid?: number | string | null;
  artist?: string | null;
  artwork?: PulseArtwork[] | null;
  blockedin?: string[] | string | null;
  explicit?: boolean | number | string | null;
  sid?: number | string | null;
  src?: string | null;
  status?: number | string | null;
  title?: string | null;
  mood?: string | null;
};

type PulseCollectionKind = 'artist' | 'downloads' | 'genlist' | 'playlist' | 'track';

/** Идентификатор виртуальной коллекции «Сохранённые» (треки из IndexedDB) */
export const DOWNLOADS_COLLECTION_ID = 'downloads';

export type PulsePlayerMode = 'full' | 'mini';

type PulsePlayerState = {
  currentSongId: number;
  isPlaylist: boolean;
  listenCounted: boolean;
  listenedCounted: boolean;
  playlistId: string;
};

type PulsePlayerContextValue = {
  closePlayer: () => void;
  currentCollectionId: string;
  currentSongId: number;
  currentTrackObj: PulseTrack | null;
  isOpen: boolean;
  isPlaying: boolean;
  mode: PulsePlayerMode;
  openAddToPlaylist: (songId: number | string) => void;
  openBlockedTrackModal: () => void;
  playArtistPlaylist: (artistId: number | string, forceReload?: boolean, shuffle?: number, startIndex?: number, expectedSongId?: number | string | null) => Promise<void>;
  playDownloadedTracks: (forceReload?: boolean, shuffle?: number, startIndex?: number) => Promise<void>;
  playGenlist: (playlistId: number | string, forceReload?: boolean, shuffle?: number, startIndex?: number, expectedSongId?: number | string | null) => Promise<void>;
  playNextTrack: (trackId: number | string) => Promise<void>;
  playPlaylist: (playlistId: number | string, forceReload?: boolean, shuffle?: number, startIndex?: number, expectedSongId?: number | string | null) => Promise<void>;
  playTrack: (trackId: number | string) => Promise<void>;
  setMode: (mode: PulsePlayerMode) => void;
  togglePlay: () => void;
  repeatMode: RepeatMode;
  toggleRepeatMode: () => void;
  playlist: PulseTrack[];
  currentIndex: number;
  playQueueTrack: (index: number) => void;
  removeQueueTrack: (index: number) => void;
  moveQueueTrack: (fromIndex: number, toIndex: number) => void;
};

declare global {
  interface Window {
    PlayerClose?: () => void;
    PlayerMode?: (mode: PulsePlayerMode) => void;
    PlayerShow?: () => void;
    PlayerState?: PulsePlayerState;
    artistPlaylist?: (
      artistId: number | string,
      forceReload?: boolean,
      shuffle?: number,
      startIndex?: number,
      expectedSongId?: number | string | null,
    ) => void;
    audio?: HTMLAudioElement | null;
    changevolume?: (volume: number | string) => void;
    likeplaylist?: (playlistId: number | string) => void;
    likesong?: (songId: number | string, type?: number, playlistId?: number | string | null) => void;
    nextplaylisttrack?: () => void;
    openAddToPlaylist?: (songId: number | string) => void;
    play?: () => void;
    playGenlist?: (
      playlistId: number | string,
      forceReload?: boolean,
      shuffle?: number,
      startIndex?: number,
      expectedSongId?: number | string | null,
    ) => void;
    playNext?: (trackId: number | string) => void;
    playerLikeSong?: () => void;
    playtrack?: (trackId: number | string) => void;
    playtrackfromartist?: (
      artistId: number | string,
      trackNumber: number | string,
      expectedSongId?: number | string | null,
    ) => void;
    playtrackfromgenlist?: (
      playlistId: number | string,
      trackNumber: number | string,
      expectedSongId?: number | string | null,
    ) => void;
    playtrackfromplaylist?: (
      playlistId: number | string,
      trackNumber: number | string,
      expectedSongId?: number | string | null,
    ) => void;
    playlist?: (
      playlistId: number | string,
      forceReload?: boolean,
      shuffle?: number,
      startIndex?: number,
      expectedSongId?: number | string | null,
    ) => void;
    prevplaylisttrack?: () => void;
    statusAudio?: string;
    trackP?: (trackId: number | string) => void;
    updatePlayerLikeBtn?: (songId: number | string) => void;
    _pagePlaylistConf?: { id: number | string; type: number } | null;
    _pulseLikedSongs?: number[] | null;
  }
}

const PulsePlayerContext = createContext<PulsePlayerContextValue | undefined>(undefined);

const FALLBACK_TRACK_IMAGE = '/img/pulse/track.png';
const PRELOAD_PROGRESS_THRESHOLD = 0.5;
const PLAYER_LISTEN_COUNT_AT_SECONDS = 30;
const PLAYER_PROGRESS_LOOP_INTERVAL_MS = 250;
const PLAYER_LYRIC_FILL_TRANSITION_MS = 250;
const PLAYER_MEDIA_POSITION_UPDATE_INTERVAL_MS = 1000;

type SyncTrackProgressOptions = {
  forceProgressUpdate?: boolean;
};

function readSavedVolume() {
  if (typeof window === 'undefined') return 0.7;

  const savedVolume = Number.parseFloat(cache.get<string>('pulse-volume') || '');
  if (!Number.isFinite(savedVolume)) return 0.7;
  return clamp(savedVolume, 0, 1);
}

function PlayerIcon({
  className,
  name,
}: {
  className?: string;
  name: string;
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href={`#${name}`}></use>
    </svg>
  );
}

export function PulsePlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, lang, user } = useAuth();
  const { showNote } = useNotification();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressLoopRef = useRef<number | null>(null);
  const lastMediaPositionUpdateRef = useRef(0);
  const collectionRequestIdRef = useRef(0);
  const preloadStartedRef = useRef(false);
  const playbackSessionRef = useRef(0);
  const listenReportedSessionRef = useRef<number | null>(null);
  const currentSongIdRef = useRef(0);
  const currentCollectionIdRef = useRef('0');
  const currentIsPlaylistRef = useRef(false);
  const playlistRef = useRef<PulseTrack[]>([]);
  const indexRef = useRef(0);
  const seekingSliderRef = useRef<'desktop' | 'mobile' | null>(null);

  const volumeSliderRef = useRef<HTMLInputElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const mediaSessionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerCloseTimerRef = useRef<number | null>(null);
  const {
    desktopCurrentTimeLabelRef,
    desktopSeekInputRef,
    mobileCurrentTimeLabelRef,
    mobileSeekInputRef,
    startVisualProgressLoop,
    stopVisualProgressLoop,
    syncVisualProgress,
  } = useVisualAudioProgress(audioRef, seekingSliderRef);

  const { changeEqGain, eqGains, initWebAudio, resetEqGains, resumeWebAudio } = useEqualizer(audioRef);
  const likedSongIdsRef = useRef<number[]>([]);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [canUseEqualizer, setCanUseEqualizer] = useState(false);

  useEffect(() => () => {
    if (playerCloseTimerRef.current !== null) {
      window.clearTimeout(playerCloseTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const isMobile = shouldDisableWebAudioForDevice();
      setIsMobileDevice(isMobile);
      setCanUseEqualizer(!isMobile);
    }
  }, []);

  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setModeState] = useState<PulsePlayerMode>('mini');
  const modeRef = useRef<PulsePlayerMode>('mini');
  const setMode = useCallback((nextMode: PulsePlayerMode) => {
    modeRef.current = nextMode;
    setModeState(nextMode);
  }, []);

  const [playlist, setPlaylist] = useState<PulseTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [playlistId, setPlaylistId] = useState('0');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => readSavedVolume());
  const [lyricsLines, setLyricsLines] = useState<PulseLyricsLine[]>([]);
  const [lyricsSource, setLyricsSource] = useState('');
  const [seekValue, setSeekValue] = useState(0);
  const [activeSeekSlider, setActiveSeekSlider] = useState<'desktop' | 'mobile' | null>(null);
  const [listenCounted, setListenCounted] = useState(false);
  const [statusAudio, setStatusAudio] = useState('');
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isRadioMode, setIsRadioMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const repeatModeRef = useRef<RepeatMode>('none');
  // Статус принудительного сохранения текущего трека: 'idle' | 'saving' | 'saved' | 'already' | 'error'

  const [radioSeedName, setRadioSeedName] = useState('');

  const touchStartXRef = useRef<number | null>(null);
  const touchStartFullRef = useRef<{ x: number, y: number } | null>(null);
  const touchStartMiniRef = useRef<{ x: number, y: number } | null>(null);
  // Радио: трек-источник, набор уже воспроизведённых ID, флаг загрузки
  const radioSeedTrackIdRef = useRef<number>(0);
  const radioPlayedIdsRef = useRef<Set<number>>(new Set());
  const radioLoadingRef = useRef(false);
  const isRadioModeRef = useRef(false);
  const radioSeedNameRef = useRef('');


  const currentTrack = playlist[index] ?? null;
  const prevTrackObj = playlist[index - 1] ?? null;
  const nextTrackObj = playlist[index + 1] ?? null;
  const currentSongId = toNumber(currentTrack?.sid);
  const { cacheCurrentTrackInBackground, deleteOfflineTrack, offlineSaveStatus, saveCurrentTrack } = useOfflineAudioSave(currentTrack);
  // Страна пользователя: мгновенно из кэша, затем обновляем из GetCountry.php
  const userCountry = useUserCountry();
  const playerTitle = getTrackDisplayTitle(currentTrack, lang);
  const playerArtist = getTrackArtist(currentTrack, lang);
  const playerArtwork = getTrackArtwork(currentTrack);
  const prevArtwork = getTrackArtwork(prevTrackObj);
  const nextArtwork = getTrackArtwork(nextTrackObj);
  const hiddenByMessagesDialog = Boolean(pathname?.startsWith('/messages/'));
  const isCinema = Boolean(pathname?.startsWith('/cinema'));
  const effectivePlayerVisible = isMounted && !hiddenByMessagesDialog && !isCinema;

  useEffect(() => {
    if (isCinema) {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isCinema]);

  const isPlayerAnimatingIn = isVisible && isMounted;
  const isFullPlayerActive = shouldRunPulseFullPlayerWork(mode, isVisible, isMounted);
  const activeLyricState = isFullPlayerActive
    ? getActiveLyricState(lyricsLines, currentTime)
    : { activeIndex: -1, progress: 0 };
  const activeLyricLine = isFullPlayerActive && activeLyricState.activeIndex >= 0
    ? lyricsLines[activeLyricState.activeIndex]
    : null;
  const mobileLyric = activeLyricLine ? splitLyricText(activeLyricLine.text) : null;
  const displayedCurrentTime = activeSeekSlider ? seekValue : currentTime;

  const notify = ({
    content,
    html,
    time = 4,
    type = 'info',
  }: {
    content: React.ReactNode;
    html?: boolean;
    time?: number;
    type?: 'error' | 'info' | 'success';
  }) => {
    showNote({
      content,
      html,
      time,
      type,
    });
  };

  const syncWindowState = () => {
    if (typeof window === 'undefined') return;

    const nextState: PulsePlayerState = {
      currentSongId: currentSongIdRef.current,
      isPlaylist: currentIsPlaylistRef.current,
      listenCounted,
      listenedCounted: listenCounted,
      playlistId: currentCollectionIdRef.current,
    };

    window.PlayerState = nextState;
    window._pulseLikedSongs = likedSongIdsRef.current;
    window.statusAudio = statusAudio;
    window.dispatchEvent(
      new CustomEvent('pulse-state-change', {
        detail: {
          currentSongId: currentSongIdRef.current,
          currentTrack,
          isOpen: isVisible,
          isPlaying,
          isPlaylist: currentIsPlaylistRef.current,
          mode,
          playlist: playlistRef.current,
          playlistId: currentCollectionIdRef.current,
        },
      }),
    );
  };

  const setPlaylistState = (nextPlaylist: PulseTrack[]) => {
    playlistRef.current = nextPlaylist;
    setPlaylist(nextPlaylist);
  };

  const setPlaylistIndex = (nextIndex: number) => {
    indexRef.current = nextIndex;
    setIndex(nextIndex);
  };

  const setPlaylistMode = (nextIsPlaylist: boolean, nextPlaylistId: string) => {
    currentIsPlaylistRef.current = nextIsPlaylist;
    currentCollectionIdRef.current = nextPlaylistId;
    setIsPlaylist(nextIsPlaylist);
    setPlaylistId(nextPlaylistId);

    // Сбрасываем режим радио при ручном запуске нового плейлиста/трека
    if (!nextPlaylistId.startsWith('radio_')) {
      isRadioModeRef.current = false;
      setIsRadioMode(false);
      setRadioSeedName('');
      radioSeedNameRef.current = '';
    }
  };

  const updateMediaPositionState = () => {
    const audio = audioRef.current;
    if (!audio || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== 'function') return;

    try {
      navigator.mediaSession.setPositionState({
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
        playbackRate: audio.playbackRate,
        position: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      });
    } catch {
      // ignore unsupported position state errors
    }
  };

  const forceUpdateMediaPositionState = () => {
    lastMediaPositionUpdateRef.current = Date.now();
    updateMediaPositionState();
  };

  const finishSeek = (commit: boolean) => {
    if (!seekingSliderRef.current) return;

    const audio = audioRef.current;
    if (commit && audio) {
      audio.currentTime = seekValue;
    }

    seekingSliderRef.current = null;
    setActiveSeekSlider(null);

    if (commit) {
      setCurrentTime(seekValue);
      forceUpdateMediaPositionState();
    } else if (audio && Number.isFinite(audio.currentTime)) {
      setCurrentTime(audio.currentTime);
      setSeekValue(audio.currentTime);
    }

    syncVisualProgress();
  };

  const clearMediaSession = () => {
    // Cancel any pending debounced metadata update first
    if (mediaSessionDebounceRef.current !== null) {
      clearTimeout(mediaSessionDebounceRef.current);
      mediaSessionDebounceRef.current = null;
    }

    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.playbackState = 'none';
    } catch { }

    try {
      navigator.mediaSession.metadata = null;
    } catch { }

    const actions = [
      'play',
      'pause',
      'previoustrack',
      'nexttrack',
      'stop',
      'seekto',
      'seekbackward',
      'seekforward',
    ] as const;

    actions.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // ignore unsupported action handlers
      }
    });
  };

  const bindMediaSession = () => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', async () => {
        try {
          await audioRef.current?.play();
        } catch {
          // ignore blocked playback
        }
      });
    } catch { }

    try {
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
    } catch { }

    try {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        window.prevplaylisttrack?.();
      });
    } catch { }

    try {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        window.nextplaylisttrack?.();
      });
    } catch { }

    try {
      navigator.mediaSession.setActionHandler('stop', () => {
        window.PlayerClose?.();
      });
    } catch { }

    try {
      navigator.mediaSession.setActionHandler('seekto', (event) => {
        if (!audioRef.current) return;
        if (typeof event.seekTime !== 'number') return;

        audioRef.current.currentTime = event.seekTime;
        setCurrentTime(event.seekTime);
        setSeekValue(event.seekTime);
        syncVisualProgress();
        forceUpdateMediaPositionState();
      });
    } catch { }
  };

  const syncTrackProgress = (options: SyncTrackProgressOptions = {}) => {
    const audio = audioRef.current;
    if (!audio) return;

    const { forceProgressUpdate = false } = options;
    const nextCurrentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;

    if (modeRef.current === 'full' || forceProgressUpdate) {
      setCurrentTime(nextCurrentTime);
      setDuration(nextDuration);

      if (!seekingSliderRef.current) {
        setSeekValue(nextCurrentTime);
      }
    }

    if (
      !listenCounted &&
      listenReportedSessionRef.current !== playbackSessionRef.current &&
      nextCurrentTime >= PLAYER_LISTEN_COUNT_AT_SECONDS &&
      currentSongIdRef.current > 0
    ) {
      listenReportedSessionRef.current = playbackSessionRef.current;
      setListenCounted(true);
      AncialAPI.pulseTrackAction('listened', currentSongIdRef.current).catch(() => {
        // ignore listen counter errors
      });
      AncialAPI.pulseTrackAction('history_add', currentSongIdRef.current).catch(() => {
        // ignore history errors
      });
    }

    if (
      !preloadStartedRef.current &&
      nextDuration > 0 &&
      nextCurrentTime / nextDuration > PRELOAD_PROGRESS_THRESHOLD
    ) {
      const nextTrack = playlistRef.current[indexRef.current + 1];
      if (preloadAudioRef.current && nextTrack && isTrackPlayable(nextTrack, userCountry)) {
        preloadAudioRef.current.src = normalizeTrackSource(nextTrack.src);
        preloadStartedRef.current = true;
      }
    }

    const now = Date.now();
    if (
      forceProgressUpdate ||
      now - lastMediaPositionUpdateRef.current >= PLAYER_MEDIA_POSITION_UPDATE_INTERVAL_MS
    ) {
      forceUpdateMediaPositionState();
    }

    syncVisualProgress();
  };


  const stopProgressLoop = () => {
    if (progressLoopRef.current !== null) {
      window.clearTimeout(progressLoopRef.current);
      progressLoopRef.current = null;
    }
  };

  const startProgressLoop = () => {
    stopProgressLoop();

    const tick = () => {
      syncTrackProgress();

      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
        progressLoopRef.current = window.setTimeout(tick, PLAYER_PROGRESS_LOOP_INTERVAL_MS);
      } else {
        progressLoopRef.current = null;
      }
    };

    progressLoopRef.current = window.setTimeout(tick, PLAYER_PROGRESS_LOOP_INTERVAL_MS);
  };

  const showPlayer = () => {
    if (playerCloseTimerRef.current !== null) {
      window.clearTimeout(playerCloseTimerRef.current);
      playerCloseTimerRef.current = null;
    }

    const savedVolume = readSavedVolume();
    setVolume(savedVolume);
    if (audioRef.current) {
      audioRef.current.volume = savedVolume;
    }

    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const closePlayer = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    }

    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch (e) {
        console.error('Failed to revoke object URL on player close', e);
      }
      activeBlobUrlRef.current = null;
    }

    stopProgressLoop();
    stopVisualProgressLoop();
    setMode('mini');
    setIsPlaying(false);
    setIsVisible(false);

    if (playerCloseTimerRef.current !== null) {
      window.clearTimeout(playerCloseTimerRef.current);
    }

    // Keep the full-player content mounted while its exit transition runs.
    playerCloseTimerRef.current = window.setTimeout(() => {
      playerCloseTimerRef.current = null;
      setStatusAudio('');
      preloadStartedRef.current = false;
      lastMediaPositionUpdateRef.current = 0;
      currentSongIdRef.current = 0;
      setPlaylistState([]);
      setPlaylistIndex(0);
      setPlaylistMode(false, '0');
      seekingSliderRef.current = null;
      setActiveSeekSlider(null);
      setCurrentTime(0);
      setDuration(0);
      setSeekValue(0);
      setListenCounted(false);
      listenReportedSessionRef.current = null;
      setLyricsLines([]);
      setLyricsSource('');
      setIsMounted(false);
      clearMediaSession();
      syncWindowState();
    }, 600);
  };

  const {
    addToPlaylistSongId,
    isAddToPlaylistOpen,
    isPlaylistEditorOpen,
    openAddToPlaylist,
    playlistOptions,
    playlistOptionsLoading,
    setIsAddToPlaylistOpen,
    setIsPlaylistEditorOpen,
    toggleSongInPlaylist,
  } = useAddToPlaylist({ lang, navigate: router.push, notify });

  const [isBlockedTrackModalOpen, setIsBlockedTrackModalOpen] = useState(false);
  const openBlockedTrackModal = useCallback(() => {
    setIsBlockedTrackModalOpen(true);
  }, []);

  const {
    ensureLikedSongsLoaded,
    likedSongIds,
    refreshLikedSongs,
    setLikedSongsState,
    togglePlaylistLike,
    toggleSongLike,
  } = usePulseFavorites({
    isAuthenticated,
    lang,
    navigate: router.push,
    notify,
  });

  const likeCurrentSong = async () => {
    if (!currentSongIdRef.current) return;
    await toggleSongLike(currentSongIdRef.current);
  };

  useEffect(() => {
    likedSongIdsRef.current = likedSongIds;
  }, [likedSongIds]);

  const isPlayingFromFavorites = playlistId === '-5' || currentCollectionIdRef.current === '-5' || currentCollectionIdRef.current === 'playlist_-5';
  const activeLike = currentTrack
    ? (isPlayingFromFavorites || likedSongIds.includes(toNumber(currentTrack.sid)))
    : false;

  const playLoadedTrack = async (track: PulseTrack | null, retryCount = 0): Promise<void> => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    if (!isTrackPlayable(track, userCountry)) {
      notify({
        content: lang?.pulse_track_unavailable || '<b>Трек недоступен или удалён.</b><br> Переходим к следующему...',
        type: 'error',
        time: 5,
        html: true,
      });

      if (currentIsPlaylistRef.current && indexRef.current < playlistRef.current.length - 1) {
        window.nextplaylisttrack?.();
      }
      return;
    }

    const trackId = toNumber(track.sid);
    const trackSource = normalizeTrackSource(track.src);
    let finalSource = trackSource;
    let isFromCache = false;

    // Освобождаем память от старого Blob URL перед загрузкой нового трека
    activeBlobUrlRef.current = releaseObjectUrl(activeBlobUrlRef.current);

    if (trackId > 0) {
      try {
        const localBlobUrl = await getCachedAudioObjectUrl(trackId);
        if (localBlobUrl) {
          activeBlobUrlRef.current = localBlobUrl;
          finalSource = localBlobUrl;
          isFromCache = true;
        }
      } catch (e) {
        console.error('Failed to check audio cache', e);
      }
    }

    if (!finalSource) {
      notify({
        content: lang?.pulse_unknown_song || 'Неизвестная песня...',
        type: 'error',
        time: 5,
      });
      return;
    }

    const isNewTrack = currentSongIdRef.current !== trackId;
    currentSongIdRef.current = trackId;
    if (retryCount === 0) {
      playbackSessionRef.current += 1;
      listenReportedSessionRef.current = null;
      setListenCounted(false);
      preloadStartedRef.current = false;
      if (isNewTrack) {
        setLyricsLines([]);
        setLyricsSource('');
      }
    }
    setStatusAudio('Loading');

    if (isAuthenticated) {
      void ensureLikedSongsLoaded();
    }

    if (audio.src !== finalSource) {
      audio.src = finalSource;
      audio.load();
    }

    // Если трек играет из сети, запускаем фоновое асинхронное кэширование с передачей метаданных
    if (!isFromCache && trackId > 0 && trackSource) {
      cacheCurrentTrackInBackground(track);
    }

    showPlayer();

    try {
      await audio.play();
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'AbortError' || error.name === 'NotAllowedError')
      ) {
        return;
      }

      if (retryCount < 2 && playlistRef.current[indexRef.current]?.sid === track.sid) {
        window.setTimeout(() => {
          void playLoadedTrack(track, retryCount + 1);
        }, 1500);
        return;
      }

      console.error('Pulse player playback error', error);
    }
  };

  const fetchTrackCollection = async (kind: PulseCollectionKind, id: number | string) => {
    const resolvedId = normalizeText(String(id));
    if (!resolvedId) return [];

    // Виртуальная коллекция «Сохранённые» — целиком из IndexedDB, работает и офлайн
    if (kind === 'downloads') {
      try {
        return mapDownloadedAudioToTracks(await getDownloadedAudioTracks());
      } catch (e) {
        console.error('Failed to read downloaded tracks list', e);
        return [];
      }
    }

    // Ключ для кэша треков коллекции
    const collectionCacheKey = `pulse_collection_${kind}_${resolvedId}`;

    try {
      const result = await AncialAPI.pulseGetPlaylist<PulseTrack[]>({
        id: kind === 'playlist' ? resolvedId : undefined,
        gid: kind === 'genlist' ? String(resolvedId) : undefined,
        aid: kind === 'artist' ? String(resolvedId) : undefined,
        tid: kind === 'track' ? String(resolvedId) : undefined,
      });
      const tracks = Array.isArray(result) ? result : [];

      // Сохраняем треки плейлиста в localStorage для офлайн-воспроизведения
      if (tracks.length > 0 && (kind === 'playlist' || kind === 'genlist' || kind === 'artist')) {
        try {
          cache.set(collectionCacheKey, tracks, { category: 'pulse', subcategory: 'tracks' });
        } catch (e) {
          console.error('Failed to cache collection tracks', e);
        }

        // Если это плейлист Избранное (-5) — сразу обновляем и кэшируем ID лайкнутых треков в плеере
        if (kind === 'playlist' && resolvedId === '-5') {
          const favIds = tracks.map((t) => toNumber(t.sid)).filter(Boolean);
          if (favIds.length > 0) {
            const current = likedSongIdsRef.current || [];
            const merged = Array.from(new Set([...current, ...favIds]));
            setLikedSongsState(merged);
          }
        }
      }

      return tracks;
    } catch {
      // При сетевой ошибке (офлайн) — пробуем прочитать кэш
      if (kind === 'playlist' || kind === 'genlist' || kind === 'artist') {
        try {
          // 1. Сначала пытаемся прочитать кэш самого плеера
          let cached = cache.get<PulseTrack[]>(collectionCacheKey, { category: 'pulse', subcategory: 'tracks' });

          // 2. Если его нет — пытаемся прочитать UI-кэш страницы плейлиста
          if (!cached || cached.length === 0) {
            const uiCacheKey = kind === 'playlist'
              ? `playlist_tracks_${resolvedId}`
              : kind === 'genlist'
                ? `playlist_tracks_gid_${resolvedId}`
                : `playlist_tracks_aid_${resolvedId}`;
            cached = cache.get<PulseTrack[]>(uiCacheKey, { category: 'pulse' });
          }

          if (cached && cached.length > 0) {
            console.log(`[Pulse] Offline: playing collection from cache (${kind}:${resolvedId})`);
            return cached;
          }

          // 3. Запасной выбор при офлайне: возвращаем список всех скачанных в IndexedDB треков
          const downloadedTracks = await getDownloadedAudioTracks();
          if (downloadedTracks.length > 0) {
            console.log(`[Pulse] Offline: playing downloaded tracks from IndexedDB (${downloadedTracks.length} tracks)`);
            return mapDownloadedAudioToTracks(downloadedTracks);
          }
        } catch (e) {
          console.error('Failed to read collection cache', e);
        }
      } else if (kind === 'track') {
        // Если это одиночный трек — попробуем проверить метаданные в IndexedDB
        try {
          const downloadedTracks = await getDownloadedAudioTracks();
          const offlineTrack = downloadedTracks.find(t => String(t.id) === resolvedId);
          if (offlineTrack) {
            console.log(`[Pulse] Offline: playing single track from IndexedDB cache (${resolvedId})`);
            return mapDownloadedAudioToTracks([offlineTrack]);
          }
        } catch (e) {
          console.error('Failed to read audio cache metadata for single track', e);
        }
      }
      return [];
    }
  };

  const playCollection = async (
    kind: PulseCollectionKind,
    id: number | string,
    forceReload = false,
    shuffle = 0,
    startIndex = 0,
    expectedSongId?: number | string | null,
  ) => {
    const resolvedId = normalizeText(String(id));
    const playId = kind === 'artist' ? `artist_${resolvedId}` : resolvedId;
    const shouldForceReload = forceReload === true;
    const expectedTrackId = toNumber(expectedSongId);

    if (
      kind !== 'track' &&
      currentIsPlaylistRef.current &&
      currentCollectionIdRef.current === playId &&
      playlistRef.current.length > 0
    ) {
      if (!shouldForceReload) {
        if (audioRef.current?.paused) {
          try {
            await audioRef.current.play();
          } catch {
            // ignore blocked autoplay
          }
        } else {
          audioRef.current?.pause();
        }
        return;
      }

      if (Number(shuffle) === 0 && startIndex >= 0 && startIndex < playlistRef.current.length) {
        const cachedTrack = playlistRef.current[startIndex];
        if (!expectedTrackId || toNumber(cachedTrack?.sid) === expectedTrackId) {
          setPlaylistIndex(startIndex);
          await playLoadedTrack(cachedTrack);
          showPlayer();
          return;
        }
      }
    }

    collectionRequestIdRef.current += 1;
    const requestId = collectionRequestIdRef.current;
    const nextTracks = await fetchTrackCollection(kind, resolvedId);

    if (requestId !== collectionRequestIdRef.current || !nextTracks.length) {
      return;
    }

    const preparedTracks =
      kind !== 'track' && Number(shuffle) === 1
        ? nextTracks.slice().sort(() => 0.5 - Math.random())
        : nextTracks.slice();
    const nextIndex = kind === 'track'
      ? 0
      : clamp(startIndex, 0, Math.max(preparedTracks.length - 1, 0));
    const nextTrack = preparedTracks[nextIndex] ?? null;

    if (kind === 'track' && !isTrackPlayable(nextTrack, userCountry)) {
      setIsBlockedTrackModalOpen(true);
      return;
    }

    setPlaylistState(preparedTracks);
    setPlaylistIndex(nextIndex);
    setPlaylistMode(kind !== 'track', kind !== 'track' ? playId : '0');
    await playLoadedTrack(nextTrack);
    showPlayer();

    if (kind === 'playlist') {
      AncialAPI.pulsePlaylistAction('history_add', { id: resolvedId }).catch(() => {
        // ignore history failures
      });
    }
  };

  const playTrack = async (trackId: number | string) => {
    await playCollection('track', trackId, true, 0, 0);
  };

  const playPlaylist = async (
    nextPlaylistId: number | string,
    forceReload = false,
    shuffle = 0,
    startIndex = 0,
    expectedSongId?: number | string | null,
  ) => {
    await playCollection('playlist', nextPlaylistId, forceReload, shuffle, startIndex, expectedSongId);
  };

  const playGenlist = async (
    nextPlaylistId: number | string,
    forceReload = false,
    shuffle = 0,
    startIndex = 0,
    expectedSongId?: number | string | null,
  ) => {
    await playCollection('genlist', nextPlaylistId, forceReload, shuffle, startIndex, expectedSongId);
  };

  const playArtistPlaylist = async (
    artistId: number | string,
    forceReload = false,
    shuffle = 0,
    startIndex = 0,
    expectedSongId?: number | string | null,
  ) => {
    await playCollection('artist', artistId, forceReload, shuffle, startIndex, expectedSongId);
  };

  const playDownloadedTracks = async (forceReload = false, shuffle = 0, startIndex = 0) => {
    await playCollection('downloads', DOWNLOADS_COLLECTION_ID, forceReload, shuffle, startIndex);
  };

  const prevTrack = async () => {
    if (!currentIsPlaylistRef.current || !playlistRef.current.length) return;

    const nextIndex = indexRef.current > 0 ? indexRef.current - 1 : 0;
    setPlaylistIndex(nextIndex);
    await playLoadedTrack(playlistRef.current[nextIndex] ?? null);
  };

  /**
   * Загружает следующую порцию похожих треков для режима радио
   * и добавляет их в конец текущего плейлиста.
   */
  const fillRadioWave = async () => {
    if (radioLoadingRef.current) return;
    radioLoadingRef.current = true;

    const seedId = radioSeedTrackIdRef.current;
    if (!seedId) {
      radioLoadingRef.current = false;
      return;
    }

    try {
      // Передаём уже воспроизведённые треки, чтобы сервер их исключил
      const excludeIds = Array.from(radioPlayedIdsRef.current);
      const wave = await AncialAPI.pulseGetRadioWave<PulseTrack[]>(seedId, excludeIds);

      if (!Array.isArray(wave) || wave.length === 0) {
        // Если похожих больше нет — сбрасываем список исключений и пробуем снова
        radioPlayedIdsRef.current.clear();
        radioPlayedIdsRef.current.add(seedId);
        const waveRetry = await AncialAPI.pulseGetRadioWave<PulseTrack[]>(seedId, [seedId]);
        if (!Array.isArray(waveRetry) || waveRetry.length === 0) {
          radioLoadingRef.current = false;
          return;
        }
        const updated = [...playlistRef.current, ...waveRetry];
        setPlaylistState(updated);
        const nextIndex = indexRef.current + 1;
        setPlaylistIndex(nextIndex);
        await playLoadedTrack(updated[nextIndex] ?? null);
      } else {
        const updated = [...playlistRef.current, ...wave];
        setPlaylistState(updated);
        const nextIndex = indexRef.current + 1;
        setPlaylistIndex(nextIndex);
        await playLoadedTrack(updated[nextIndex] ?? null);
      }
    } catch (e) {
      console.error('[Radio] Failed to fetch wave', e);
    } finally {
      radioLoadingRef.current = false;
    }
  };

  const nextTrack = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentIsPlaylistRef.current || !playlistRef.current.length) {
      // Одиночный трек — запускаем радио на его основе
      const sid = currentSongIdRef.current;
      if (sid > 0) {
        isRadioModeRef.current = true;
        setIsRadioMode(true);
        setRadioSeedName(playerTitle);
        radioSeedNameRef.current = playerTitle;
        radioSeedTrackIdRef.current = sid;
        radioPlayedIdsRef.current = new Set([sid]);
        // Переводим плеер в playlist-режим, чтобы очередь работала
        setPlaylistMode(true, `radio_${sid}`);
        await fillRadioWave();
      } else {
        audio.currentTime = 0;
        audio.pause();
      }
      return;
    }

    if (indexRef.current < playlistRef.current.length - 1) {
      const nextIndex = indexRef.current + 1;
      // Запоминаем воспроизведённый трек для радио
      if (isRadioModeRef.current) {
        const playedSid = toNumber(playlistRef.current[indexRef.current]?.sid);
        if (playedSid) radioPlayedIdsRef.current.add(playedSid);
      }
      setPlaylistIndex(nextIndex);
      await playLoadedTrack(playlistRef.current[nextIndex] ?? null);
      return;
    }

    // Конец плейлиста
    const lastSid = toNumber(playlistRef.current[indexRef.current]?.sid);
    if (lastSid) radioPlayedIdsRef.current.add(lastSid);

    if (isRadioModeRef.current) {
      // В режиме радио — подгружаем следующую волну
      await fillRadioWave();
      return;
    }

    // Плейлист кончился — автоматически включаем радио на основе последнего трека
    if (lastSid > 0) {
      isRadioModeRef.current = true;
      setIsRadioMode(true);

      const lastTrack = playlistRef.current[indexRef.current];
      const seedName = lastTrack ? getTrackDisplayTitle(lastTrack, lang) : playerTitle;
      setRadioSeedName(seedName);
      radioSeedNameRef.current = seedName;

      radioSeedTrackIdRef.current = lastSid;
      radioPlayedIdsRef.current = new Set(
        playlistRef.current.map(t => toNumber(t.sid)).filter(Boolean) as number[]
      );
      await fillRadioWave();
      return;
    }

    audio.currentTime = 0;
    audio.pause();
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().catch(() => {
        // ignore blocked autoplay
      });
    } else {
      audio.pause();
    }
  };

  const changeVolume = useCallback((nextVolume: number | string) => {
    const resolvedVolume = clamp(Number.parseFloat(String(nextVolume)), 0, 1);
    setVolume(resolvedVolume);

    if (audioRef.current) {
      audioRef.current.volume = resolvedVolume;
    }

    cache.set('pulse-volume', String(resolvedVolume), { category: 'pulse' });
  }, []);

  useEffect(() => {
    const slider = volumeSliderRef.current;
    if (!slider) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      changeVolume(Number.parseFloat(slider.value) + (event.deltaY < 0 ? 0.025 : -0.025));
    };

    slider.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      slider.removeEventListener('wheel', handleWheel);
    };
  }, [changeVolume, effectivePlayerVisible]);

  const queueTrackNext = async (trackId: number | string) => {
    if (!currentIsPlaylistRef.current || !playlistRef.current.length) {
      notify({
        content:
          lang?.pulse_queue_rule ||
          'Включите любой трек из плейлиста, чтобы ставить треки в очередь',
        type: 'info',
        time: 5,
      });
      return;
    }

    const nextTracks = await fetchTrackCollection('track', trackId);
    const nextTrack = nextTracks[0];

    if (!nextTrack) return;

    const updatedPlaylist = playlistRef.current.slice();
    updatedPlaylist.splice(indexRef.current + 1, 0, nextTrack);
    setPlaylistState(updatedPlaylist);

    notify({
      content: lang?.pulse_will_play_next || 'Будет играть следующим',
      type: 'success',
      time: 5,
    });
  };

  const toggleRepeatMode = useCallback(() => {
    const currentMode = repeatModeRef.current;
    const nextMode: RepeatMode =
      currentMode === 'none' ? 'all' : currentMode === 'all' ? 'one' : 'none';
    repeatModeRef.current = nextMode;
    setRepeatMode(nextMode);
  }, []);

  const removeQueueTrack = useCallback((targetIndex: number) => {
    const currentList = playlistRef.current;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const newPlaylist = currentList.filter((_, i) => i !== targetIndex);
    if (newPlaylist.length === 0) {
      setPlaylistState([]);
      setPlaylistIndex(0);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      notify({
        content: lang?.pulse_queue_empty || 'Очередь воспроизведения пуста',
        type: 'info',
        time: 3,
      });
      return;
    }

    setPlaylistState(newPlaylist);

    if (targetIndex === indexRef.current) {
      const nextIdx = Math.min(targetIndex, newPlaylist.length - 1);
      setPlaylistIndex(nextIdx);
      void playLoadedTrack(newPlaylist[nextIdx] ?? null);
    } else if (targetIndex < indexRef.current) {
      setPlaylistIndex(indexRef.current - 1);
    }

    notify({
      content: lang?.pulse_track_removed_from_queue || 'Трек удалён из очереди',
      type: 'success',
      time: 3,
    });
  }, [lang, notify]);

  const moveQueueTrack = useCallback((fromIndex: number, toIndex: number) => {
    const list = playlistRef.current.slice();
    if (
      fromIndex < 0 ||
      fromIndex >= list.length ||
      toIndex < 0 ||
      toIndex >= list.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const [movedTrack] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, movedTrack);

    let newCurrentIndex = indexRef.current;
    if (fromIndex === indexRef.current) {
      newCurrentIndex = toIndex;
    } else if (fromIndex < indexRef.current && toIndex >= indexRef.current) {
      newCurrentIndex = indexRef.current - 1;
    } else if (fromIndex > indexRef.current && toIndex <= indexRef.current) {
      newCurrentIndex = indexRef.current + 1;
    }

    setPlaylistState(list);
    setPlaylistIndex(newCurrentIndex);
  }, []);

  const playQueueTrack = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= playlistRef.current.length) return;
    const targetTrack = playlistRef.current[targetIndex] ?? null;
    if (targetTrack && !isTrackPlayable(targetTrack, userCountry)) {
      setIsBlockedTrackModalOpen(true);
      return;
    }
    setPlaylistIndex(targetIndex);
    void playLoadedTrack(targetTrack);
  }, [userCountry]);


  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    currentIsPlaylistRef.current = isPlaylist;
  }, [isPlaylist]);

  useEffect(() => {
    currentCollectionIdRef.current = playlistId;
  }, [playlistId]);

  useEffect(() => {
    likedSongIdsRef.current = likedSongIds;
  }, [likedSongIds]);

  useEffect(() => {
    if (!currentTrack) {
      currentSongIdRef.current = 0;
      return;
    }

    currentSongIdRef.current = toNumber(currentTrack.sid);
  }, [currentTrack]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.body.classList.toggle('pulse-player-visible', effectivePlayerVisible);
    document.body.classList.toggle('pulse-player-full', effectivePlayerVisible && mode === 'full');

    return () => {
      document.body.classList.remove('pulse-player-visible');
      document.body.classList.remove('pulse-player-full');
    };
  }, [effectivePlayerVisible, mode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = clamp(volume, 0, 1);
  }, [volume]);

  useEffect(() => {
    preloadAudioRef.current = new Audio();
    preloadAudioRef.current.preload = 'auto';

    return () => {
      stopVisualProgressLoop();
      stopProgressLoop();
      preloadAudioRef.current = null;
    };
  }, [stopVisualProgressLoop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleLoadStart = () => {
      setStatusAudio('Loading');
    };

    const handleCanPlay = () => {
      setStatusAudio('Ready');
    };

    const handlePlay = () => {
      setIsPlaying(true);
      initWebAudio();
      resumeWebAudio();
      bindMediaSession();
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch { }
      }
      startProgressLoop();
      startVisualProgressLoop();
      syncTrackProgress({ forceProgressUpdate: true });
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch { }
      }
      stopProgressLoop();
      stopVisualProgressLoop();
      syncTrackProgress({ forceProgressUpdate: true });
    };

    const handleEnded = () => {
      stopProgressLoop();
      stopVisualProgressLoop();

      if (repeatModeRef.current === 'one') {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          void audioRef.current.play().catch(() => {});
        }
        return;
      }

      if (
        repeatModeRef.current === 'all' &&
        !isRadioModeRef.current &&
        playlistRef.current.length > 0 &&
        indexRef.current >= playlistRef.current.length - 1
      ) {
        setPlaylistIndex(0);
        void playLoadedTrack(playlistRef.current[0] ?? null);
        return;
      }

      void nextTrack();
    };

    const handleLoadedMetadata = () => {
      syncTrackProgress({ forceProgressUpdate: true });
    };

    const handleTimeUpdate = () => {
      syncTrackProgress();
    };

    const handleError = () => {
      setIsPlaying(false);
      setStatusAudio('Ready');
      stopProgressLoop();
      stopVisualProgressLoop();

      const track = playlistRef.current[indexRef.current] ?? null;
      if (track) {
        setIsBlockedTrackModalOpen(true);
      }
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    };
    // We intentionally keep this subscription stable and read live player state from refs/events,
    // otherwise adding every helper here would re-bind audio listeners on frequent progress updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTrack, userCountry]);

  useEffect(() => {
    if (!currentSongId || !currentTrack) {
      setLyricsLines([]);
      setLyricsSource('');
      clearMediaSession();
      syncWindowState();
      return;
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      // Debounce MediaSession metadata updates to avoid a race condition in Chrome for Android:
      // rapid consecutive setMetadata() calls cause Chrome to recycle bitmaps mid-flight,
      // resulting in a fatal native crash ("cannot use a recycled source in createBitmap").
      // This is especially triggered when the equalizer restarts the AudioContext on track change.
      if (mediaSessionDebounceRef.current !== null) {
        clearTimeout(mediaSessionDebounceRef.current);
      }
      const capturedTrack = currentTrack;
      const capturedArtist = playerArtist;
      const capturedTitle = playerTitle;
      mediaSessionDebounceRef.current = setTimeout(() => {
        mediaSessionDebounceRef.current = null;
        try {
          if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
            navigator.mediaSession.metadata = new MediaMetadata({
              album: normalizeText(capturedTrack.album) || 'Zypo',
              artist: capturedArtist,
              artwork: buildMediaArtwork(capturedTrack),
              title: capturedTitle,
            });
          }
        } catch {
          // ignore MediaMetadata errors
        }
      }, 300);
    }

    let cancelled = false;
    const controller = new AbortController();
    const capturedTrack = currentTrack;

    // Immediately clear lyrics for the old track so it never bleeds onto the new one
    setLyricsLines([]);
    setLyricsSource('');

    if (!isFullPlayerActive) {
      syncWindowState();
      return () => {
        controller.abort();
        if (mediaSessionDebounceRef.current !== null) {
          clearTimeout(mediaSessionDebounceRef.current);
          mediaSessionDebounceRef.current = null;
        }
      };
    }

    void (async () => {
      try {
        const lyricsData = await loadPulseLyrics(capturedTrack, controller.signal);
        if (cancelled) return;

        setLyricsLines(lyricsData.lines);
        setLyricsSource(lyricsData.source);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Failed to load lyrics', e);
        }
      }
    })();

    syncWindowState();

    return () => {
      cancelled = true;
      controller.abort();
      // Also cancel any pending debounced metadata update so stale artwork
      // from the previous track is never applied after the track changes.
      if (mediaSessionDebounceRef.current !== null) {
        clearTimeout(mediaSessionDebounceRef.current);
        mediaSessionDebounceRef.current = null;
      }
    };
    // Depend on currentSongId (primitive ID) rather than currentTrack (object reference)
    // so that background re-renders don't cancel in-flight lyric loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSongId, isFullPlayerActive]);

  useEffect(() => {
    // Only run 60 FPS smooth lyrics progress updates when player is in full mode, playing, and has lyrics.
    // When minimized, paused, or closed, this effect cancels the animation loop immediately (0% CPU load).
    if (!isFullPlayerActive || !isPlaying || lyricsLines.length === 0) {
      return undefined;
    }

    let animationFrameId: number | null = null;

    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && Number.isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isFullPlayerActive, isPlaying, lyricsLines.length]);

  useEffect(() => {
    syncWindowState();
    // syncWindowState closes over live refs/state; depending on it would make this fire every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, isPlaying, isVisible, listenCounted, mode, playlistId, statusAudio]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const compatWindow = window;

    compatWindow.audio = audioRef.current;
    compatWindow.PlayerClose = closePlayer;
    compatWindow.PlayerMode = (nextMode) => {
      setMode(nextMode === 'full' ? 'full' : 'mini');
    };
    compatWindow.PlayerShow = showPlayer;
    compatWindow.changevolume = changeVolume;
    compatWindow.likeplaylist = (nextPlaylistId) => {
      void togglePlaylistLike(nextPlaylistId);
    };
    compatWindow.likesong = (songId, type, nextPlaylistId) => {
      void toggleSongLike(songId, {
        playlistId: nextPlaylistId,
        triggerPlaylistRedirect: Number(type) === 3,
      });
    };
    compatWindow.nextplaylisttrack = () => {
      void nextTrack();
    };
    compatWindow.openAddToPlaylist = openAddToPlaylist;
    compatWindow.play = togglePlay;
    compatWindow.playGenlist = (nextPlaylistId, forceReload, shuffle, startIndex, expectedSongId) => {
      void playGenlist(nextPlaylistId, Boolean(forceReload), Number(shuffle ?? 0), Number(startIndex ?? 0), expectedSongId);
    };
    compatWindow.playNext = (trackId) => {
      void queueTrackNext(trackId);
    };
    compatWindow.playerLikeSong = () => {
      void likeCurrentSong();
    };
    compatWindow.playlist = (nextPlaylistId, forceReload, shuffle, startIndex, expectedSongId) => {
      void playPlaylist(nextPlaylistId, Boolean(forceReload), Number(shuffle ?? 0), Number(startIndex ?? 0), expectedSongId);
    };
    compatWindow.playtrack = (trackId) => {
      void playTrack(trackId);
    };
    compatWindow.playtrackfromartist = (artistId, trackNumber, expectedSongId) => {
      void playArtistPlaylist(artistId, true, 0, Number(trackNumber ?? 1) - 1, expectedSongId);
    };
    compatWindow.playtrackfromgenlist = (nextPlaylistId, trackNumber, expectedSongId) => {
      void playGenlist(nextPlaylistId, true, 0, Number(trackNumber ?? 1) - 1, expectedSongId);
    };
    compatWindow.playtrackfromplaylist = (nextPlaylistId, trackNumber, expectedSongId) => {
      void playPlaylist(nextPlaylistId, true, 0, Number(trackNumber ?? 1) - 1, expectedSongId);
    };
    compatWindow.prevplaylisttrack = () => {
      void prevTrack();
    };
    compatWindow.trackP = (trackId) => {
      void playTrack(trackId);
    };
    compatWindow.artistPlaylist = (artistId, forceReload, shuffle, startIndex, expectedSongId) => {
      void playArtistPlaylist(artistId, Boolean(forceReload), Number(shuffle ?? 0), Number(startIndex ?? 0), expectedSongId);
    };
    compatWindow.updatePlayerLikeBtn = (songId) => {
      void ensureLikedSongsLoaded().then(() => {
        syncWindowState();
        if (toNumber(songId) === currentSongIdRef.current) {
          refreshLikedSongs();
        }
      });
    };

    return () => {
      delete compatWindow.PlayerClose;
      delete compatWindow.PlayerMode;
      delete compatWindow.PlayerShow;
      delete compatWindow.PlayerState;
      delete compatWindow._pulseLikedSongs;
      delete compatWindow.artistPlaylist;
      delete compatWindow.audio;
      delete compatWindow.changevolume;
      delete compatWindow.likeplaylist;
      delete compatWindow.likesong;
      delete compatWindow.nextplaylisttrack;
      delete compatWindow.openAddToPlaylist;
      delete compatWindow.play;
      delete compatWindow.playGenlist;
      delete compatWindow.playNext;
      delete compatWindow.playerLikeSong;
      delete compatWindow.playlist;
      delete compatWindow.playtrack;
      delete compatWindow.playtrackfromartist;
      delete compatWindow.playtrackfromgenlist;
      delete compatWindow.playtrackfromplaylist;
      delete compatWindow.prevplaylisttrack;
      delete compatWindow.statusAudio;
      delete compatWindow.trackP;
      delete compatWindow.updatePlayerLikeBtn;
    };
    // Global bridge methods are reinstalled only when their public behavior changes, not on every syncWindowState update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeVolume, closePlayer, ensureLikedSongsLoaded, likeCurrentSong, nextTrack, openAddToPlaylist, playArtistPlaylist, playGenlist, playPlaylist, playTrack, prevTrack, queueTrackNext, showPlayer, togglePlay, togglePlaylistLike, toggleSongLike]);

  const contextValue: PulsePlayerContextValue = {
    closePlayer,
    currentCollectionId: playlistId,
    currentSongId,
    currentTrackObj: currentTrack || null,
    isOpen: isVisible,
    isPlaying,
    mode,
    openAddToPlaylist,
    openBlockedTrackModal,
    playArtistPlaylist,
    playDownloadedTracks,
    playGenlist,
    playNextTrack: queueTrackNext,
    playPlaylist,
    playTrack,
    setMode,
    togglePlay,
    repeatMode,
    toggleRepeatMode,
    playlist,
    currentIndex: index,
    playQueueTrack,
    removeQueueTrack,
    moveQueueTrack,
  };

  const isFullMode = mode === 'full';

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const isFullActive = effectivePlayerVisible && isFullMode;
    document.documentElement.classList.toggle('pulse-player-full', isFullActive);
    document.body.classList.toggle('pulse-player-full', isFullActive);

    if (isFullActive) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.documentElement.classList.remove('pulse-player-full');
      document.body.classList.remove('pulse-player-full');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [effectivePlayerVisible, isFullMode]);

  return (
    <PulsePlayerContext.Provider value={contextValue}>
      {children}

      <audio ref={audioRef} id="htmlaudio" className="hidden" crossOrigin="anonymous" />

      {effectivePlayerVisible ? (
        <div
          id="NAVP"
          className="pointer-events-none fixed inset-0 z-[1500]"
        >
          <style>{`
            @keyframes animate-opacity-fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes animate-smooth-appear {
              from { opacity: 0; transform: translateY(8px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-opacity-fade-in {
              animation: animate-opacity-fade-in 0.6s cubic-bezier(0.32,0.72,0,1) forwards;
            }
            .animate-smooth-appear {
              animation: animate-smooth-appear 0.6s cubic-bezier(0.32,0.72,0,1) forwards;
            }
          `}</style>

          {isMounted ? (
            <PulsePlayerFull
            Icon={PlayerIcon}
            mobileCurrentTimeLabelRef={mobileCurrentTimeLabelRef}
            mobileSeekInputRef={mobileSeekInputRef}

            playerTitle={playerTitle}
            playerArtist={playerArtist}
            playerArtwork={playerArtwork}
            prevArtwork={prevArtwork}
            nextArtwork={nextArtwork}
            prevTrackObj={prevTrackObj}
            nextTrackObj={nextTrackObj}
            currentTrack={currentTrack}
            trackKey={String(currentSongId)}

            repeatMode={repeatMode}
            playlist={playlist}
            currentIndex={index}
            isRadioMode={isRadioMode}
            radioSeedName={radioSeedName}

            onToggleRepeat={toggleRepeatMode}
            onPlayQueueTrack={playQueueTrack}
            onRemoveQueueTrack={removeQueueTrack}
            onMoveQueueTrack={moveQueueTrack}

            swipeX={swipeX}
            isSwiping={isSwiping}
            touchStartXRef={touchStartXRef}

            displayedCurrentTime={displayedCurrentTime}
            duration={duration}
            currentTime={currentTime}

            isPlaying={isPlaying}
            isVisible={isFullMode && isPlayerAnimatingIn}

            activeLike={activeLike}
            isAuthenticated={isAuthenticated}

            lyricsLines={isFullPlayerActive ? lyricsLines : []}
            lyricsSource={lyricsSource}
            activeLyricState={activeLyricState}
            mobileLyric={mobileLyric}

            albumLabel={isRadioMode && radioSeedName
              ? `${lang?.pulse_radio_by || 'Радио по'} «${radioSeedName}»`
              : normalizeText(currentTrack?.album) || (lang?.pulse_playing_now || 'Сейчас играет')}
            canOpenAlbum={Boolean(normalizeText(String(currentTrack?.albumid ?? '')))}

            canUseEqualizer={canUseEqualizer}
            isMobileDevice={isMobileDevice}
            offlineSaveStatus={offlineSaveStatus}
            lang={lang}

            onClose={closePlayer}
            onMinimize={() => setMode('mini')}
            onOpenAlbum={() => {
              const albumId = normalizeText(String(currentTrack?.albumid ?? ''));
              if (!albumId) return;
              router.push(`/pulse/playlist/${albumId}`);
              setMode('mini');
            }}

            onTouchStartCover={(e) => {
              touchStartXRef.current = e.touches[0].clientX;
              setIsSwiping(false);
            }}
            onTouchMoveCover={(e) => {
              if (touchStartXRef.current !== null) {
                const delta = e.touches[0].clientX - touchStartXRef.current;
                setSwipeX(delta);
              }
            }}
            onTouchEndCover={() => {
              if (touchStartXRef.current !== null) {
                const threshold = 60;
                const delta = swipeX;
                touchStartXRef.current = null;

                const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
                // Distance to move incoming cover image exactly to center (0px) is (screenWidth - 12)
                const slideDistance = screenWidth - 12;

                if (delta < -threshold) {
                  setIsSwiping(true);
                  setSwipeX(-slideDistance);
                  setTimeout(() => {
                    void nextTrack();
                    setIsSwiping(false);
                    setSwipeX(0);
                  }, 250);
                } else if (delta > threshold) {
                  setIsSwiping(true);
                  setSwipeX(slideDistance);
                  setTimeout(() => {
                    void prevTrack();
                    setIsSwiping(false);
                    setSwipeX(0);
                  }, 250);
                } else {
                  setIsSwiping(true);
                  setSwipeX(0);
                  setTimeout(() => {
                    setIsSwiping(false);
                  }, 250);
                }
              }
            }}

            onTouchStartFull={(e) => {
              if (window.innerWidth >= 1024) return;
              touchStartFullRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchEndFull={(e) => {
              if (touchStartFullRef.current && window.innerWidth < 1024) {
                const navpFull = e.currentTarget;
                const deltaY = e.changedTouches[0].clientY - touchStartFullRef.current.y;
                const deltaX = e.changedTouches[0].clientX - touchStartFullRef.current.x;
                if (deltaY > 50 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && navpFull.scrollTop <= 0) {
                  setMode('mini');
                }
                touchStartFullRef.current = null;
              }
            }}

            onSeekCancel={() => finishSeek(false)}
            onSeekChange={setSeekValue}
            onSeekStart={() => {
              seekingSliderRef.current = 'mobile';
              setActiveSeekSlider('mobile');
              setSeekValue(currentTime);
            }}
            onSeekSubmit={() => finishSeek(true)}

            onAddToPlaylist={() => openAddToPlaylist(currentSongId)}
            onDownload={() => {
              const track = currentTrack;
              if (!track?.src) return;
              const trackSource = normalizeTrackSource(track.src);
              if (!trackSource) return;
              const link = document.createElement('a');
              link.href = trackSource;
              link.download = `${playerArtist ? `${playerArtist} - ` : ''}${playerTitle || 'track'}.mp3`;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            onLike={() => { void likeCurrentSong(); }}
            onNext={() => { void nextTrack(); }}
            onOpenEqualizer={() => setIsEqualizerOpen(true)}
            onPrev={() => { void prevTrack(); }}
            onSaveOffline={async () => {
              if (offlineSaveStatus === 'already') {
                // Track is already cached — delete it
                const result = await deleteOfflineTrack(currentTrack);
                if (result === 'deleted') {
                  notify({ content: lang?.pulse_removed_offline || 'Трек удалён из офлайна', type: 'info', time: 3 });
                } else if (result === 'failed') {
                  notify({ content: lang?.pulse_save_offline_error || 'Не удалось удалить трек', type: 'error', time: 4 });
                }
                return;
              }
              const result = await saveCurrentTrack(currentTrack);
              if (result === 'saved') {
                notify({ content: lang?.pulse_saved_offline || 'Сохранено!', type: 'success', time: 3 });
              } else if (result === 'failed') {
                notify({ content: lang?.pulse_save_offline_error || 'Не удалось сохранить трек', type: 'error', time: 4 });
              }
            }}
            onTogglePlay={togglePlay}

            onLyricsSeek={(nextTime) => {
              if (!audioRef.current) return;
              audioRef.current.currentTime = nextTime;
              setCurrentTime(nextTime);
              setSeekValue(nextTime);
              forceUpdateMediaPositionState();
            }}
            />
          ) : null}

          <PulsePlayerMini
            Icon={PlayerIcon}
            activeSeekSlider={activeSeekSlider}
            currentTime={currentTime}
            desktopCurrentTimeLabelRef={desktopCurrentTimeLabelRef}
            desktopSeekInputRef={desktopSeekInputRef}
            duration={duration}
            isPlaying={isPlaying}
            isVisible={!isFullMode && isPlayerAnimatingIn}
            lang={lang}
            onChangeVolume={changeVolume}
            onDesktopSeekCancel={() => finishSeek(false)}
            onDesktopSeekChange={setSeekValue}
            onDesktopSeekStart={() => {
              seekingSliderRef.current = 'desktop';
              setActiveSeekSlider('desktop');
              setSeekValue(currentTime);
            }}
            onDesktopSeekSubmit={() => finishSeek(true)}
            onNextTrack={() => { void nextTrack(); }}
            onOpenFull={() => setMode('full')}
            onPrevTrack={() => { void prevTrack(); }}
            onTouchStart={(event) => {
              if (window.innerWidth >= 1024) return;
              touchStartMiniRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            }}
            onTouchEnd={(event) => {
              if (touchStartMiniRef.current && window.innerWidth < 1024) {
                const deltaY = event.changedTouches[0].clientY - touchStartMiniRef.current.y;
                const deltaX = event.changedTouches[0].clientX - touchStartMiniRef.current.x;
                if (deltaY < -50 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) setMode('full');
                touchStartMiniRef.current = null;
              }
            }}
            onTogglePlay={togglePlay}
            playerArtist={playerArtist}
            playerArtwork={playerArtwork}
            playerTitle={playerTitle}
            seekValue={seekValue}
            volume={volume}
            volumeSliderRef={volumeSliderRef}
          />
        </div>
      ) : null}

      <PulsePlayerModals
        Icon={PlayerIcon}
        addToPlaylistSongId={addToPlaylistSongId}
        canUseEqualizer={canUseEqualizer}
        changeEqGain={changeEqGain}
        eqGains={eqGains}
        isAddToPlaylistOpen={isAddToPlaylistOpen}
        isBlockedTrackModalOpen={isBlockedTrackModalOpen}
        isEqualizerOpen={isEqualizerOpen}
        isPlaylistEditorOpen={isPlaylistEditorOpen}
        lang={lang}
        notify={notify}
        onOpenAddToPlaylist={openAddToPlaylist}
        onResetEqualizer={resetEqGains}
        playlistOptions={playlistOptions}
        playlistOptionsLoading={playlistOptionsLoading}
        setIsAddToPlaylistOpen={setIsAddToPlaylistOpen}
        setIsBlockedTrackModalOpen={setIsBlockedTrackModalOpen}
        setIsEqualizerOpen={setIsEqualizerOpen}
        setIsPlaylistEditorOpen={setIsPlaylistEditorOpen}
        toggleSongInPlaylist={toggleSongInPlaylist}
      />
    </PulsePlayerContext.Provider>
  );
}

export function usePulsePlayer() {
  const context = useContext(PulsePlayerContext);
  if (!context) {
    throw new Error('usePulsePlayer must be used within PulsePlayerProvider');
  }
  return context;
}
