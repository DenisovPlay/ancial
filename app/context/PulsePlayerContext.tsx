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
import PulsePlaylistEditorModal from '../pulse/pulse-playlist-editor-modal';
import { PulseModal } from '../pulse/pulse-modal';
import { PulseEqualizerModal } from '../pulse/player/pulse-equalizer-modal';
import { shouldDisableWebAudioForDevice, useEqualizer } from '../pulse/player/use-equalizer';
import { usePulseFavorites } from '../pulse/player/use-pulse-favorites';
import { useAddToPlaylist } from '../pulse/player/use-add-to-playlist';
import { loadPulseLyrics } from '../pulse/player/lyrics-service';
import { useOfflineAudioSave } from '../pulse/player/use-offline-audio-save';
import { useVisualAudioProgress } from '../pulse/player/use-visual-audio-progress';
import { PulsePlayerFullArtwork } from '../pulse/player/pulse-player-full-artwork';
import { PulsePlayerFullControls } from '../pulse/player/pulse-player-full-controls';
import { PulsePlayerFullHeader } from '../pulse/player/pulse-player-full-header';
import { PulsePlayerModals } from '../pulse/player/pulse-player-modals';
import { PulsePlayerMini } from '../pulse/player/pulse-player-mini';
import {
  getCachedAudioObjectUrl,
  getDownloadedAudioTracks,
  mapDownloadedAudioToTracks,
  releaseObjectUrl,
} from '../pulse/player/offline-audio';
import { Dropdown, DropdownItem } from '../components/navigation';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import {
  getActiveLyricState,
  PulseLyricsDesktop,
  PulseLyricsMobile,
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

type PulseTrack = {
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

type PulsePlayerMode = 'full' | 'mini';

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
  playArtistPlaylist: (artistId: number | string, forceReload?: boolean, shuffle?: number, startIndex?: number, expectedSongId?: number | string | null) => Promise<void>;
  playDownloadedTracks: (forceReload?: boolean, shuffle?: number, startIndex?: number) => Promise<void>;
  playGenlist: (playlistId: number | string, forceReload?: boolean, shuffle?: number, startIndex?: number, expectedSongId?: number | string | null) => Promise<void>;
  playNextTrack: (trackId: number | string) => Promise<void>;
  playPlaylist: (playlistId: number | string, forceReload?: boolean, shuffle?: number, startIndex?: number, expectedSongId?: number | string | null) => Promise<void>;
  playTrack: (trackId: number | string) => Promise<void>;
  setMode: (mode: PulsePlayerMode) => void;
  togglePlay: () => void;
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

const FALLBACK_TRACK_IMAGE = '/includes/img/pulse/track.png';
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

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const isMobile = shouldDisableWebAudioForDevice();
      setIsMobileDevice(isMobile);
      setCanUseEqualizer(!isMobile);
    }
  }, []);

  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<PulsePlayerMode>('mini');
  const modeRef = useRef<PulsePlayerMode>('mini');
  if (modeRef.current !== mode) modeRef.current = mode;

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
  const [isRadioMode, setIsRadioMode] = useState(false);
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
  const { cacheCurrentTrackInBackground, offlineSaveStatus, saveCurrentTrack } = useOfflineAudioSave(currentTrack);
  const userCountry = normalizeText(user?.country) || 'RU';
  const playerTitle = getTrackDisplayTitle(currentTrack, lang);
  const playerArtist = getTrackArtist(currentTrack, lang);
  const playerArtwork = getTrackArtwork(currentTrack);
  const prevArtwork = getTrackArtwork(prevTrackObj);
  const nextArtwork = getTrackArtwork(nextTrackObj);
  const hiddenByMessagesDialog = Boolean(
    pathname?.startsWith('/messages/') && isMobileDevice
  );
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
  const activeLyricState = getActiveLyricState(lyricsLines, currentTime);
  const activeLyricLine = activeLyricState.activeIndex >= 0 ? lyricsLines[activeLyricState.activeIndex] : null;
  const mobileLyric = activeLyricLine ? splitLyricText(activeLyricLine.text) : null;
  const displayedCurrentTime = activeSeekSlider ? seekValue : currentTime;

  const notify = ({
    content,
    time = 3,
    type = 'info',
  }: {
    content: React.ReactNode;
    time?: number;
    type?: 'error' | 'info' | 'success';
  }) => {
    showNote({
      content,
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
    setMode('mini');
    setLyricsLines([]);
    setLyricsSource('');
    setIsPlaying(false);

    setIsVisible(false);
    setTimeout(() => {
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
        content: lang?.pulse_track_unavailable || 'Трек недоступен или удалён. Переходим к следующему...',
        type: 'error',
        time: 5,
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

    currentSongIdRef.current = trackId;
    if (retryCount === 0) {
      playbackSessionRef.current += 1;
      listenReportedSessionRef.current = null;
      setListenCounted(false);
      preloadStartedRef.current = false;
      setLyricsLines([]);
      setLyricsSource('');

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

  const playDownloadedTracks = async (forceReload = true, shuffle = 0, startIndex = 0) => {
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
      void nextTrack();
    };

    const handleLoadedMetadata = () => {
      syncTrackProgress({ forceProgressUpdate: true });
    };

    const handleTimeUpdate = () => {
      syncTrackProgress();
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
    // We intentionally keep this subscription stable and read live player state from refs/events,
    // otherwise adding every helper here would re-bind audio listeners on frequent progress updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTrack, userCountry]);

  useEffect(() => {
    if (!currentTrack) {
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

    void (async () => {
      try {
        const lyricsData = await loadPulseLyrics(currentTrack, controller.signal);
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
    // syncWindowState is intentionally omitted here so lyric loading only reacts to real track changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, playerArtist, playerTitle]);

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
    playArtistPlaylist,
    playDownloadedTracks,
    playGenlist,
    playNextTrack: queueTrackNext,
    playPlaylist,
    playTrack,
    setMode,
    togglePlay,
  };

  const isFullMode = mode === 'full';

  useEffect(() => {
    if (isFullMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullMode]);

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
          <div
            className={cn(
              'absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-[65]',
              isFullMode && isPlayerAnimatingIn
                ? 'pointer-events-auto translate-y-0'
                : 'pointer-events-none translate-y-full',
            )}
            style={{
              transitionDelay: '0ms',
            }}
          >
            <div
              id="NAVPfull"
              className="pulse-player-full-shell flex h-dvh w-full flex-col items-center justify-center gap-1 overflow-y-auto overflow-x-hidden rounded-none bg-zinc-900/80 p-1 shadow lg:h-full lg:gap-3"
              style={{
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                overscrollBehavior: 'none'
              }}
              onTouchStart={(e) => {
                if (window.innerWidth >= 1024) return;
                touchStartFullRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }}
              onTouchEnd={(e) => {
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
            >
              <PulsePlayerFullHeader
                Icon={PlayerIcon}
                albumLabel={isRadioMode && radioSeedName
                  ? `${lang?.pulse_radio_by || 'Радио по'} «${radioSeedName}»`
                  : normalizeText(currentTrack?.album) || (lang?.pulse_playing_now || 'Сейчас играет')}
                canOpenAlbum={Boolean(normalizeText(String(currentTrack?.albumid ?? '')))}
                onClose={closePlayer}
                onMinimize={() => setMode('mini')}
                onOpenAlbum={() => {
                  const albumId = normalizeText(String(currentTrack?.albumid ?? ''));
                  if (!albumId) return;
                  router.push(`/pulse/playlist/${albumId}`);
                  setMode('mini');
                }}
              />

              <div className="flex h-full w-full flex-row items-center justify-center px-3">
                <div className="flex flex-col items-center justify-center lg:items-start shrink-0">
                  <div className="flex flex-col items-center duration-300 lg:items-start">
                    <div className="flex items-center justify-center">
                      <div
                        className="relative flex h-80 w-80 items-center justify-center shrink-0 lg:h-96 lg:w-96"
                        onTouchStart={(e) => {
                          touchStartXRef.current = e.touches[0].clientX;
                          setSwipeX(0);
                        }}
                        onTouchMove={(e) => {
                          if (touchStartXRef.current !== null) {
                            const delta = e.touches[0].clientX - touchStartXRef.current;
                            setSwipeX(delta);
                          }
                        }}
                        onTouchEnd={() => {
                          if (touchStartXRef.current !== null) {
                            if (swipeX > 100) {
                              void prevTrack();
                            } else if (swipeX < -100) {
                              void nextTrack();
                            }
                            touchStartXRef.current = null;
                            setSwipeX(0);
                          }
                        }}
                      >
                        {prevTrackObj ? (
                          <div
                            className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl lg:hidden"
                            style={{
                              transform: `translateX(calc(-100% - 24px + ${swipeX}px))`,
                              transition: touchStartXRef.current === null ? 'transform 0.4s cubic-bezier(0.32,0.72,0,1)' : 'none',
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
                            transform: `translateX(${swipeX}px)`,
                            opacity: 1 - Math.abs(swipeX) / 800,
                            transition: touchStartXRef.current === null ? 'transform 0.4s cubic-bezier(0.32,0.72,0,1), opacity 0.4s' : 'none',
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
                              transform: `translateX(calc(100% + 24px + ${swipeX}px))`,
                              transition: touchStartXRef.current === null ? 'transform 0.4s cubic-bezier(0.32,0.72,0,1)' : 'none',
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

                    <div
                      key={`text-${currentTrack}`}
                      className="animate-smooth-appear mt-3 flex flex-col items-center justify-center gap-0.5"
                    >
                      <span className="w-80 text-center text-base font-bold text-white lg:w-96 lg:text-lg">
                        {playerTitle}
                      </span>
                      <span className="w-80 text-center text-sm text-zinc-300 lg:w-96 lg:text-base">
                        {playerArtist}
                      </span>
                    </div>
                  </div>

                  <PulsePlayerFullArtwork
                    displayedCurrentTime={displayedCurrentTime}
                    duration={duration}
                    mobileCurrentTimeLabelRef={mobileCurrentTimeLabelRef}
                    mobileSeekInputRef={mobileSeekInputRef}
                    onSeekCancel={() => finishSeek(false)}
                    onSeekChange={setSeekValue}
                    onSeekStart={() => {
                      seekingSliderRef.current = 'mobile';
                      setActiveSeekSlider('mobile');
                      setSeekValue(currentTime);
                    }}
                    onSeekSubmit={() => finishSeek(true)}
                  />

                  <PulsePlayerFullControls
                    Icon={PlayerIcon}
                    activeLike={activeLike}
                    canUseEqualizer={canUseEqualizer}
                    isAuthenticated={isAuthenticated}
                    isMobileDevice={isMobileDevice}
                    isPlaying={isPlaying}
                    lang={lang}
                    offlineSaveStatus={offlineSaveStatus}
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
                      const result = await saveCurrentTrack(currentTrack);
                      if (result === 'saved') {
                        notify({ content: lang?.pulse_saved_offline || 'Сохранено!', type: 'success', time: 3 });
                      } else if (result === 'failed') {
                        notify({ content: lang?.pulse_save_offline_error || 'Не удалось сохранить трек', type: 'error', time: 4 });
                      }
                    }}
                    onTogglePlay={togglePlay}
                  />
                </div>

                {lyricsLines.length ? (
                  <PulseLyricsDesktop
                    activeIndex={activeLyricState.activeIndex}
                    lines={lyricsLines}
                    onSeek={(nextTime) => {
                      if (!audioRef.current) return;
                      audioRef.current.currentTime = nextTime;
                      setCurrentTime(nextTime);
                      setSeekValue(nextTime);
                      forceUpdateMediaPositionState();
                    }}
                    progress={activeLyricState.progress}
                  />
                ) : null}
              </div>
            </div>
          </div>

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
        isEqualizerOpen={isEqualizerOpen}
        isPlaylistEditorOpen={isPlaylistEditorOpen}
        lang={lang}
        notify={notify}
        onOpenAddToPlaylist={openAddToPlaylist}
        onResetEqualizer={resetEqGains}
        playlistOptions={playlistOptions}
        playlistOptionsLoading={playlistOptionsLoading}
        setIsAddToPlaylistOpen={setIsAddToPlaylistOpen}
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
