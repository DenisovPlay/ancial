'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';

import { AncialAPI } from '../lib/api-v2';
import { cache } from '../lib/cache.ts';
import { useStableCallbacks } from '../lib/use-stable-callbacks';
import { shouldDisableWebAudioForDevice, useEqualizer } from '../pulse/player/use-equalizer';
import { usePulseFavorites } from '../pulse/player/use-pulse-favorites';
import { useAddToPlaylist } from '../pulse/player/use-add-to-playlist';
import { loadPulseLyrics } from '../pulse/player/lyrics-service';
import {
  getServerLyricsEnabled,
  readLyricsEnabled,
  setLyricsEnabled,
  subscribeLyricsEnabled,
} from '../pulse/player/lyrics-preference';
import { useOfflineAudioSave } from '../pulse/player/use-offline-audio-save';
import { useVisualAudioProgress, VISUAL_PROGRESS_STEP_MS } from '../pulse/player/use-visual-audio-progress';
import type { RepeatMode } from '../pulse/player/pulse-player-full-controls';
import type { PulsePlayerFullProps } from '../pulse/player/pulse-player-full';
import { PulsePlayerModals } from '../pulse/player/pulse-player-modals';
import { PulsePlayerMini } from '../pulse/player/pulse-player-mini';
import { useMiniPlayerSlot } from '../pulse/player/mini-player-slot';
import {
  getCatchUpRate,
  getListenAlongSnapshot,
  getServerListenAlongSnapshot,
  getTargetPositionMs,
  closeListenAlongRoom,
  joinListenAlong,
  LISTEN_JOIN_TIMEOUT_MS,
  leaveListenAlong,
  resumeListenAlong,
  LISTEN_HARD_SEEK_MS,
  LISTEN_STATE_INTERVAL_MS,
  sendListenState,
  setHostSyncRequestHandler,
  setListenClosedHandler,
  subscribeListenAlong,
  type ListenAlongListener,
} from '../pulse/player/listen-along';
import {
  announceDevice,
  claimActiveDevice,
  DEVICE_STATE_INTERVAL_MS,
  getRemoteDevicesSnapshot,
  getRemotePositionMs,
  getServerRemoteDevicesSnapshot,
  hasOtherDevices as hasOtherDevicesNow,
  isRemotePlayback,
  releaseActiveDevice,
  remotePlaybackClockRef,
  sendDeviceCommand,
  sendDeviceQueue,
  sendDeviceState,
  setDeviceCommandHandler,
  setDeviceQueueHandler,
  setDeviceLocalPlaybackProbe,
  setDeviceReleasedHandler,
  setDeviceStopHandler,
  setDeviceSyncHandler,
  setDeviceUnreachableHandler,
  subscribeRemoteDevices,
  type RemoteCommand,
  type RemoteQueue,
} from '../pulse/player/remote-devices';

/**
 * Индекс трека в очереди: по ID, если он известен (порядок очереди и списка на странице может различаться),
 * иначе по индексу. -1 — нужного трека в списке нет.
 */
function findTrackIndex(tracks: PulseTrack[], expectedTrackId: number, fallbackIndex: number) {
  if (expectedTrackId) {
    if (toNumber(tracks[fallbackIndex]?.sid) === expectedTrackId) return fallbackIndex;
    return tracks.findIndex((track) => toNumber(track.sid) === expectedTrackId);
  }
  return fallbackIndex >= 0 && fallbackIndex < tracks.length ? fallbackIndex : -1;
}

// Длительность переезда мини-плеера снизу в шапку чата (совпадает с duration-500 в pulse-player-mini).
const MINI_PLAYER_HANDOFF_MS = 500;
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
import { type PulseLyricsLine } from '../pulse/player/pulse-lyrics';

import {
  buildMediaArtwork,
  clamp,
  cn,
  formatPlaybackTime,
  getTrackArtist,
  getPlayerTrackArtwork,
  getTrackDisplayTitle,
  isTrackPlayable,
  normalizeSongIds,
  normalizeText,
  normalizeTrackSource,
  parsePlaylistSongs,
  toNumber,
} from '../pulse/player/player-utils';


// Типы и константы плеера вынесены в pulse-player-types.ts (реэкспорт сохраняет публичный API).
import type {
  PulseArtwork,
  PulseCollectionKind,
  PulsePlayerMode,
  PulsePlayerState,
  PulseTrack,
} from '../pulse/player/pulse-player-types';
import { DOWNLOADS_COLLECTION_ID } from '../pulse/player/pulse-player-types';
export type { PulseTrack, PulsePlayerMode };
export { DOWNLOADS_COLLECTION_ID };

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
  /** Совместное прослушивание: чьё повторяем (0 — своё), кто слушает вместе, вход и выход. */
  listenAlongHostId: number;
  listenAlongListeners: ListenAlongListener[];
  joinListenAlong: (hostId: number | string) => void;
  leaveListenAlong: () => void;
  /** Забрать звук с другого устройства аккаунта на это. */
  transferPlaybackHere: () => void;
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

const PRELOAD_PROGRESS_THRESHOLD = 0.5;
const PLAYER_LISTEN_COUNT_AT_SECONDS = 30;
const PLAYER_PROGRESS_LOOP_INTERVAL_MS = VISUAL_PROGRESS_STEP_MS;
/** Свёрнутый полный плеер держим в памяти ещё столько — хватает доиграть анимацию ухода (500 мс). */
const FULL_PLAYER_UNMOUNT_DELAY_MS = 1000;

/**
 * Полный плеер (обложки, текст песни, очередь) — отдельный чанк: до первого раскрытия он не нужен
 * ни на одной странице. Грузим его заранее, когда появляется мини-плеер. Без next/dynamic:
 * тот рендерит через Suspense, а React придерживает показ после Suspense до 300 мс — раскрытие
 * заметно запаздывало бы даже с уже загруженным кодом.
 */
type PulsePlayerFullComponent = ComponentType<PulsePlayerFullProps>;
let pulsePlayerFullPromise: Promise<PulsePlayerFullComponent> | null = null;
const loadPulsePlayerFull = () => {
  pulsePlayerFullPromise ??= import('../pulse/player/pulse-player-full')
    .then((module) => module.PulsePlayerFull)
    .catch((error: unknown) => {
      // Не загрузился (сеть) — следующая попытка начнёт заново.
      pulsePlayerFullPromise = null;
      throw error;
    });
  return pulsePlayerFullPromise;
};
const PLAYER_MEDIA_POSITION_UPDATE_INTERVAL_MS = 1000;
/** Сервис текстов иногда просто не отвечает: без повтора трек доигрывал бы без текста до перезагрузки. */
const PULSE_COLLECTION_KINDS: PulseCollectionKind[] = ['artist', 'downloads', 'genlist', 'playlist', 'track'];
const LYRICS_RETRY_LIMIT = 2;
const LYRICS_RETRY_DELAY_MS = 2000;

type SyncTrackProgressOptions = {
  forceProgressUpdate?: boolean;
};

function readSavedVolume() {
  if (typeof window === 'undefined') return 0.7;

  // Ключ постоянный, поэтому хранится сырой строкой и читается уже числом: тишина (0) —
  // валидное значение, и отбрасывать её как «пусто» нельзя, иначе звук сам прыгал на 70%.
  const rawVolume = cache.get<number | string>('pulse-volume');
  const savedVolume = typeof rawVolume === 'number' ? rawVolume : Number.parseFloat(String(rawVolume ?? ''));
  if (!Number.isFinite(savedVolume)) return 0.7;
  return clamp(savedVolume, 0, 1);
}

export function PulsePlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, lang } = useAuth();
  const { showNote } = useNotification();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressLoopRef = useRef<number | null>(null);
  const lastMediaPositionUpdateRef = useRef(0);
  const collectionRequestIdRef = useRef(0);
  const preloadStartedRef = useRef(false);
  // Предрезолвленный источник следующего трека (blob:/http) — готовится заранее,
  // пока играет текущий, чтобы переход по ended на iOS был полностью синхронным.
  const preloadedNextRef = useRef<{ trackId: number; src: string; isBlobUrl: boolean } | null>(null);
  const playbackSessionRef = useRef(0);
  const listenReportedSessionRef = useRef<number | null>(null);
  const currentSongIdRef = useRef(0);
  /** Счётчик авто-ретраев при сбое ЗАГРУЗКИ трека (сеть/таймаут), чтобы не путать с регион-блоком. */
  const loadErrorRetryRef = useRef(0);
  const currentCollectionIdRef = useRef('0');
  const currentIsPlaylistRef = useRef(false);
  const playlistRef = useRef<PulseTrack[]>([]);
  const indexRef = useRef(0);
  const seekingSliderRef = useRef<'desktop' | 'mobile' | null>(null);

  const volumeSliderRef = useRef<HTMLInputElement | null>(null);
  const ghostMiniSeekInputRef = useRef<HTMLInputElement | null>(null);
  const ghostMiniTimeLabelRef = useRef<HTMLDivElement | null>(null);
  const ghostMiniVolumeSliderRef = useRef<HTMLInputElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const mediaSessionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerCloseTimerRef = useRef<number | null>(null);
  const {
    desktopCurrentTimeLabelRef,
    desktopSeekInputRef,
    mobileCurrentTimeLabelRef,
    mobileSeekInputRef,
    syncVisualProgress,
  } = useVisualAudioProgress(audioRef, seekingSliderRef);

  const { changeEqGain, eqGains, hasActiveEq, initWebAudio, resetEqGains, resumeWebAudio } = useEqualizer(audioRef);
  const likedSongIdsRef = useRef<number[]>([]);
  /** Лайкнут ли играющий трек (по рефам — безопасно из обработчиков, привязанных при монтировании). */
  const isCurrentTrackLiked = () => {
    const collection = currentCollectionIdRef.current;
    return collection === '-5' || collection === 'playlist_-5' || likedSongIdsRef.current.includes(currentSongIdRef.current);
  };
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [canUseEqualizer, setCanUseEqualizer] = useState(false);

  useEffect(() => () => {
    if (playerCloseTimerRef.current !== null) {
      window.clearTimeout(playerCloseTimerRef.current);
    }
  }, []);

  useEffect(() => {
    // Определение устройства при монтировании: сеттлеры здесь — источник правды
    // (navigator недоступен на сервере, начальный useState(false) не знает платформу).
    if (typeof navigator !== 'undefined') {
      const isMobile = shouldDisableWebAudioForDevice();
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  // Живая громкость для обработчиков, привязанных один раз (ended → nextTrack → showPlayer):
  // их замыкание держит громкость с момента загрузки страницы.
  const volumeRef = useRef(volume);
  const [lyricsLines, setLyricsLines] = useState<PulseLyricsLine[]>([]);
  const [lyricsSource, setLyricsSource] = useState('');
  const lyricsEnabled = useSyncExternalStore(
    subscribeLyricsEnabled,
    () => readLyricsEnabled(),
    getServerLyricsEnabled,
  );
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
  // Ширина пилюли мини-плеера: замеряется на touchstart для расчёта доката карусели.
  // State, а не ref: значение читается при рендере (проп в PulsePlayerMini).
  const [miniShellWidth, setMiniShellWidth] = useState(370);
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
  const playerArtwork = getPlayerTrackArtwork(currentTrack);
  const prevArtwork = getPlayerTrackArtwork(prevTrackObj);
  const nextArtwork = getPlayerTrackArtwork(nextTrackObj);
  const isCinema = Boolean(pathname?.startsWith('/cinema'));
  // Открытый чат забирает мини-плеер к себе в шапку. Нижний при этом ещё полсекунды остаётся
  // смонтированным и уезжает вниз, пока плеер в шапке выезжает сверху.
  const miniPlayerSlot = useMiniPlayerSlot();
  const [prevMiniPlayerSlot, setPrevMiniPlayerSlot] = useState<HTMLElement | null>(null);
  const [bottomMiniLeaving, setBottomMiniLeaving] = useState(false);
  if (miniPlayerSlot !== prevMiniPlayerSlot) {
    setPrevMiniPlayerSlot(miniPlayerSlot);
    setBottomMiniLeaving(Boolean(miniPlayerSlot && !prevMiniPlayerSlot));
  }
  const showBottomMiniPlayer = !miniPlayerSlot || bottomMiniLeaving;

  // Совместное прослушивание: с кем слушаем, кто слушает вместе и последнее состояние хоста.
  const listenAlong = useSyncExternalStore(subscribeListenAlong, getListenAlongSnapshot, getServerListenAlongSnapshot);
  // Устройства аккаунта: звук всегда только на одном, остальные работают пультами.
  const remoteDevices = useSyncExternalStore(subscribeRemoteDevices, getRemoteDevicesSnapshot, getServerRemoteDevicesSnapshot);
  const isRemoteDevice = remoteDevices.isRemote;
  const isActiveDevice = remoteDevices.isActiveSelf;
  // Соседняя вкладка — такой же получатель состояния, хотя устройство то же самое.
  const hasOtherDevices = remoteDevices.connections > 1 || remoteDevices.devices.length > 1;
  const remoteState = remoteDevices.state;
  const [remoteTime, setRemoteTime] = useState(0);
  const followingHostId = listenAlong.followingHostId;
  useEffect(() => {
    if (!bottomMiniLeaving) return;
    const timer = window.setTimeout(() => setBottomMiniLeaving(false), MINI_PLAYER_HANDOFF_MS);
    return () => window.clearTimeout(timer);
  }, [bottomMiniLeaving]);
  const effectivePlayerVisible = isMounted && !isCinema;

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
  // На пульте плеер показывает чужое воспроизведение: своё аудио здесь пустое.
  const effectiveIsPlaying = isRemoteDevice ? Boolean(remoteState?.playing) : isPlaying;
  const effectiveDuration = isRemoteDevice ? (remoteState?.durationMs ?? 0) / 1000 : duration;
  const effectiveCurrentTime = isRemoteDevice ? remoteTime : currentTime;
  const displayedCurrentTime = activeSeekSlider ? seekValue : effectiveCurrentTime;

  const notify = useCallback(({
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
  }, [showNote]);

  // lang для использования внутри статичного audio-эффекта (там прямое замыкание было бы устаревшим).
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

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

  // Ведомый не управляет воспроизведением: проверки читают ref, чтобы не пересоздавать обработчики.
  const followingHostIdRef = useRef(0);
  const hasListenersRef = useRef(false);
  /** true, пока трек включает сама синхронизация: такой запуск из комнаты не выкидывает. */
  const followDrivenPlayRef = useRef(false);
  /** Слушатель сам поставил паузу: она переживает смену трека, пока он не нажмёт плей. */
  const followerPausedRef = useRef(false);
  /** Играет ли сейчас хост — чтобы отличать свою паузу от паузы хоста. */
  const hostPlayingRef = useRef(false);

  /** Вид и «чистый» идентификатор коллекции — по ним пульт соберёт ту же очередь у себя. */
  const currentCollectionKindRef = useRef<PulseCollectionKind | ''>('');
  const currentCollectionRawIdRef = useRef('');
  /** Что мы попросили включить на активном устройстве — на случай, если оно окажется недоступно. */
  const pendingRemotePlayRef = useRef<{ kind: PulseCollectionKind; id: number | string; forceReload: boolean; shuffle: number; startIndex: number; expectedSongId: number | string | null | undefined; at: number } | null>(null);
  /** Очередь разошлась с коллекцией (перемешивание, правки, радио, «Сохранённые») — шлём её целиком. */
  const queueDirtyRef = useRef(false);
  /** Позиция, на которую надо встать сразу после загрузки трека (перенос с другого устройства). */
  const pendingSeekMsRef = useRef(0);

  /**
   * Подключаемся к чужому прослушиванию: свою музыку сразу останавливаем, иначе она продолжала бы
   * играть, пока едет первый трек хоста, а контролы уже вели бы себя как у ведомого.
   */
  const handleJoinListenAlong = (hostId: number | string) => {
    // Слушаем чужое здесь — значит, звук аккаунта переезжает на это устройство.
    claimActiveDevice();
    audioRef.current?.pause();
    followerPausedRef.current = false;
    joinListenAlong(hostId);
  };

  /** Слушатель включил свою музыку — управление только у хоста, поэтому выходим из комнаты. */
  const leaveRoomOnOwnPlayback = () => {
    if (followingHostIdRef.current > 0 && !followDrivenPlayRef.current) {
      leaveListenAlong();
    }
  };

  /**
   * Хост отдаёт слушателям трек, позицию и признак «играет». Без слушателей молчим.
   * force — когда сервер сам просит состояние для только что подключившегося: признак «есть слушатели»
   * к этому моменту ещё не обновился эффектом, и обычная отправка потерялась бы.
   */
  const emitPlaybackState = useCallback((force = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    const playing = !audio.paused && !audio.ended;
    const positionMs = Math.round((Number.isFinite(audio.currentTime) ? audio.currentTime : 0) * 1000);

    // Пультам — трек, позиция и место в очереди. Пульт сам ничего не вещает: звук не у него.
    if (!isRemotePlayback() && (force || hasOtherDevicesNow())) {
      sendDeviceState({
        durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0,
        index: indexRef.current,
        playing,
        positionMs,
        trackId: currentSongIdRef.current,
      });
    }

    if (isRemotePlayback()) return;
    if (!force && !hasListenersRef.current) return;

    sendListenState({ playing, positionMs, trackId: currentSongIdRef.current });
  }, []);

  const finishSeek = (commit: boolean) => {
    if (!seekingSliderRef.current) return;

    // Перемотка ведомому запрещена: позицию задаёт хост. Проверяем до пульта,
    // иначе с пульта можно было бы перемотать чужое совместное прослушивание.
    if (followingHostIdRef.current > 0) {
      seekingSliderRef.current = null;
      setActiveSeekSlider(null);
      return;
    }

    // Пульт перематывает чужой звук — командой, своё аудио не трогаем.
    if (isRemotePlayback()) {
      if (commit) sendDeviceCommand('seek', Math.round(seekValue * 1000));
      seekingSliderRef.current = null;
      setActiveSeekSlider(null);
      return;
    }

    const audio = audioRef.current;
    if (commit && audio) {
      audio.currentTime = seekValue;
    }

    seekingSliderRef.current = null;
    setActiveSeekSlider(null);

    if (commit) {
      setCurrentTime(seekValue);
      forceUpdateMediaPositionState();
      emitPlaybackState();
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
      // Режим «лайкнутые»: трек сохраняется офлайн, только когда он прослушан и лайкнут.
      if (cache.audio.getAutoSaveMode() === 'liked' && isCurrentTrackLiked()) {
        cacheCurrentTrackInBackground(playlistRef.current[indexRef.current] ?? null);
      }
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
        preloadStartedRef.current = true;

        // Резолвим источник следующего трека заранее: IndexedDB → blob:, иначе сеть.
        // Пока текущий трек играет, JS жив — все await безопасны. К моменту ended
        // источник уже готов, и переключение происходит синхронно (важно для iOS PWA:
        // после ended WebKit замораживает страницу, async-переход обрывается).
        const nextTrackId = toNumber(nextTrack.sid);
        const nextSource = normalizeTrackSource(nextTrack.src);
        void (async () => {
          try {
            let resolved = nextSource;
            let isBlobUrl = false;
            if (nextTrackId > 0) {
              const localBlobUrl = await getCachedAudioObjectUrl(nextTrackId);
              if (localBlobUrl) {
                resolved = localBlobUrl;
                isBlobUrl = true;
              }
            }
            preloadedNextRef.current = { trackId: nextTrackId, src: resolved, isBlobUrl };
            // Прогреваем сетевой источник в отдельном аудио-элементе,
            // чтобы при переходе данные уже были в HTTP-кэше WebKit.
            if (!isBlobUrl && preloadAudioRef.current) {
              preloadAudioRef.current.src = resolved;
            }
          } catch (e) {
            console.error('Failed to preload next track source', e);
          }
        })();
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

    // Громкость уже живёт в состоянии плеера — перечитывать хранилище на каждом открытии нельзя:
    // плеер открывается и при смене трека, и при синхронизации с другим устройством.
    if (audioRef.current) {
      audioRef.current.volume = volumeRef.current;
    }

    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const closePlayer = () => {
    // Крестик на пульте закрывает воспроизведение, а не только своё окно: музыка на аккаунте одна,
    // и оставлять её играть на другом устройстве после закрытия было бы странно.
    if (isRemotePlayback()) sendDeviceCommand('close');

    // Закрыли плеер — выходим из чужой комнаты, а свою распускаем: слушать больше нечего.
    // На пульте комната чужая только на вид: её ведёт то устройство, где идёт звук.
    if (followingHostIdRef.current > 0) {
      leaveListenAlong();
    } else if (hasListenersRef.current && !isRemotePlayback()) {
      closeListenAlongRoom();
    }
    // Звука на аккаунте больше нет — пультам показывать нечего.
    releaseActiveDevice();

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
      // Сбрасывая предрезолв, освобождаем и его blob (если был из IndexedDB)
      if (preloadedNextRef.current?.isBlobUrl) {
        releaseObjectUrl(preloadedNextRef.current.src);
      }
      preloadedNextRef.current = null;
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
    const likedNow = await toggleSongLike(currentSongIdRef.current);
    // Лайк уже после засчитанного прослушивания — в режиме «лайкнутые» сохраняем сразу.
    if (likedNow && listenCounted && cache.audio.getAutoSaveMode() === 'liked') {
      cacheCurrentTrackInBackground(playlistRef.current[indexRef.current] ?? null);
    }
  };

  useEffect(() => {
    likedSongIdsRef.current = likedSongIds;
  }, [likedSongIds]);

  const isPlayingFromFavorites = playlistId === '-5' || playlistId === 'playlist_-5';
  const activeLike = currentTrack
    ? (isPlayingFromFavorites || likedSongIds.includes(toNumber(currentTrack.sid)))
    : false;

  const playLoadedTrack = async (track: PulseTrack | null, retryCount = 0): Promise<void> => {
    // Осознанное локальное воспроизведение — забираем звук на это устройство ДО события play,
    // чтобы гейт в handlePlay не принял его за случайное возобновление на пульте.
    if (track) claimActiveDevice();
    const audio = audioRef.current;
    if (!audio || !track) return;

    if (!isTrackPlayable(track, userCountry)) {
      notify({
        content: lang?.pulse_track_unavailable || '<b>Трек недоступен или удалён.</b><br> Переходим к следующему...',
        type: 'error',
        time: 5,
        html: true,
      });

      // Ведомый не листает сам: трек недоступен в его стране — ждём следующий от хоста.
      if (followingHostIdRef.current > 0) return;

      if (currentIsPlaylistRef.current && indexRef.current < playlistRef.current.length - 1) {
        window.nextplaylisttrack?.();
      }
      return;
    }

    const trackId = toNumber(track.sid);
    const trackSource = normalizeTrackSource(track.src);
    let finalSource = trackSource;
    let isFromCache = false;

    // iOS PWA fast-path: если источник этого трека был предрезолвлен заранее
    // (пока играл предыдущий), переключаемся синхронно — без await к IndexedDB.
    // После ended аудио-сессия WebKit гаснет и замораживает JS: любой await здесь
    // может не возобновиться, и трек «не прогружается», пока не откроешь PWA.
    const preloadedNext = preloadedNextRef.current;
    if (preloadedNext && preloadedNext.trackId === trackId && trackId > 0) {
      preloadedNextRef.current = null;
      activeBlobUrlRef.current = releaseObjectUrl(activeBlobUrlRef.current);
      if (preloadedNext.isBlobUrl) {
        activeBlobUrlRef.current = preloadedNext.src;
        finalSource = preloadedNext.src;
        isFromCache = true;
      } else {
        finalSource = preloadedNext.src;
      }
      void applyResolvedSource(track, finalSource, isFromCache, trackSource);
      return;
    }

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

    // Источник известен — применяем его синхронно (общий путь для обычной загрузки
    // и iOS fast-path с предрезолвом).
    void applyResolvedSource(track, finalSource, isFromCache, trackSource);
  };

  /**
   * Синхронная часть запуска трека: источник уже резолвлен.
   * Никаких await до audio.play() — критично для перехода по ended на iOS PWA.
   */
  const applyResolvedSource = (
    track: PulseTrack,
    resolvedSource: string,
    resolvedFromCache: boolean,
    trackSource: string,
    retryCount = 0,
  ): void => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    const trackId = toNumber(track.sid);
    const isNewTrack = currentSongIdRef.current !== trackId;
    currentSongIdRef.current = trackId;
    if (retryCount === 0) {
      playbackSessionRef.current += 1;
      listenReportedSessionRef.current = null;
      setListenCounted(false);
      preloadStartedRef.current = false;
      // Предрезолв остаётся валидным только если он для этого же трека
      // (быстрый переход вперёд-назад), иначе сбрасываем с освобождением blob.
      const pendingPreload = preloadedNextRef.current;
      if (pendingPreload && pendingPreload.trackId !== trackId) {
        if (pendingPreload.isBlobUrl) {
          releaseObjectUrl(pendingPreload.src);
        }
        preloadedNextRef.current = null;
      }
      if (isNewTrack) {
        setLyricsLines([]);
        setLyricsSource('');
      }
    }
    setStatusAudio('Loading');

    if (isAuthenticated) {
      void ensureLikedSongsLoaded();
    }

    if (audio.src !== resolvedSource) {
      audio.src = resolvedSource;
      audio.load();
    }

    // Режим «прослушиваемые»: трек из сети сохраняется офлайн в фоне сразу при запуске.
    if (!resolvedFromCache && trackId > 0 && trackSource && cache.audio.getAutoSaveMode() === 'listened') {
      cacheCurrentTrackInBackground(track);
    }

    showPlayer();

    try {
      void audio.play().catch((error: unknown) => {
        if (
          error instanceof DOMException &&
          (error.name === 'AbortError' || error.name === 'NotAllowedError')
        ) {
          return;
        }

        if (retryCount < 2 && playlistRef.current[indexRef.current]?.sid === track.sid) {
          window.setTimeout(() => {
            applyResolvedSource(track, resolvedSource, resolvedFromCache, trackSource, retryCount + 1);
          }, 1500);
          return;
        }

        console.error('Pulse player playback error', error);
      });
    } catch (error) {
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
    // Пульт включает музыку не у себя, а там, где она уже идёт — как в Spotify.
    // «Сохранённые» исключение: это офлайн-файлы конкретного устройства, у другого их нет.
    if (isRemotePlayback() && kind !== 'downloads') {
      // Запоминаем интент: если активное устройство недоступно, включим здесь (см. unreachable-обработчик).
      pendingRemotePlayRef.current = { kind, id, forceReload: forceReload === true, shuffle: Number(shuffle) || 0, startIndex: Number(startIndex) || 0, expectedSongId, at: Date.now() };
      sendDeviceCommand('play_collection', 0, {
        expected_song_id: expectedSongId ?? null,
        force_reload: forceReload === true,
        id: String(id),
        kind,
        shuffle: Number(shuffle) || 0,
        start_index: Number(startIndex) || 0,
      });
      return;
    }

    leaveRoomOnOwnPlayback();
    const resolvedId = normalizeText(String(id));
    const playId = kind === 'artist' ? `artist_${resolvedId}` : resolvedId;
    // «Сохранённые» на пульте: своей копии коллекции здесь нет, поэтому грузим заново.
    const shouldForceReload = forceReload === true || isRemotePlayback();
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

      if (Number(shuffle) === 0) {
        // Порядок очереди может не совпадать со списком на странице — ищем трек по ID, индекс лишь подсказка.
        const cachedIndex = findTrackIndex(playlistRef.current, expectedTrackId, startIndex);
        if (cachedIndex >= 0) {
          setPlaylistIndex(cachedIndex);
          await playLoadedTrack(playlistRef.current[cachedIndex]);
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
    // Страница передаёт индекс в СВОЁМ списке (например popular_tracks артиста), а коллекция с сервера
    // бывает отсортирована иначе — поэтому сначала ID трека, по которому кликнули, и только потом индекс.
    const matchedIndex = kind === 'track' ? 0 : findTrackIndex(preparedTracks, expectedTrackId, startIndex);
    const nextIndex = matchedIndex >= 0 ? matchedIndex : clamp(startIndex, 0, Math.max(preparedTracks.length - 1, 0));
    const nextTrack = preparedTracks[nextIndex] ?? null;

    if (kind === 'track' && !isTrackPlayable(nextTrack, userCountry)) {
      setIsBlockedTrackModalOpen(true);
      return;
    }

    // Пульт соберёт ту же очередь сам — по виду коллекции и её идентификатору.
    currentCollectionKindRef.current = kind;
    currentCollectionRawIdRef.current = resolvedId;
    // «Сохранённые» лежат в IndexedDB каждого устройства, перемешанный порядок не повторить.
    queueDirtyRef.current = kind === 'downloads' || Number(shuffle) === 1;

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
    // Ведомый не листает вообще: треки переключает хост. Кнопки у него выключены,
    // но есть ещё свайп по мини-плееру и кнопки на наушниках — их закрываем здесь.
    if (followingHostIdRef.current > 0) return;
    if (isRemotePlayback()) {
      sendDeviceCommand('prev');
      return;
    }
    if (followingHostIdRef.current > 0) return;
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
    // Трек кончился или его пролистнули — у ведомого следующий всё равно придёт от хоста.
    if (followingHostIdRef.current > 0) return;
    if (isRemotePlayback()) {
      sendDeviceCommand('next');
      return;
    }
    // Листать нельзя: ведомый идёт за хостом, следующий трек придёт от него.
    if (followingHostIdRef.current > 0) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Имя трека — из рефов, а не из замыкания: в конце песни сюда приходит обработчик ended,
    // привязанный при монтировании, и в его замыкании трека ещё нет («Загрузка...»).
    const liveTitle = getTrackDisplayTitle(playlistRef.current[indexRef.current] ?? null, langRef.current);

    if (!currentIsPlaylistRef.current || !playlistRef.current.length) {
      // Одиночный трек — запускаем радио на его основе
      const sid = currentSongIdRef.current;
      if (sid > 0) {
        isRadioModeRef.current = true;
        setIsRadioMode(true);
        setRadioSeedName(liveTitle);
        radioSeedNameRef.current = liveTitle;
        radioSeedTrackIdRef.current = sid;
        radioPlayedIdsRef.current = new Set([sid]);
        // Переводим плеер в playlist-режим, чтобы очередь работала
        setPlaylistMode(true, `radio_${sid}`);
        // Волна собирается на лету: повторить её по идентификатору коллекции нельзя.
        queueDirtyRef.current = true;
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
      const seedName = lastTrack ? getTrackDisplayTitle(lastTrack, langRef.current) : liveTitle;
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
    // Пульт: звук на другом устройстве, здесь только команда.
    if (isRemotePlayback()) {
      sendDeviceCommand(getRemoteDevicesSnapshot().state?.playing ? 'pause' : 'play');
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      // Слушатель вернулся к прослушиванию — снимаем свою паузу и дальше идём за хостом.
      followerPausedRef.current = false;
      void audio.play().catch(() => {
        // ignore blocked autoplay
      });
    } else {
      audio.pause();
    }
  };

  /** Громкость до выключения звука — чтобы кнопка вернула ровно её, а не значение по умолчанию. */
  const preMuteVolumeRef = useRef(0.7);

  const changeVolume = useCallback((nextVolume: number | string) => {
    const resolvedVolume = clamp(Number.parseFloat(String(nextVolume)), 0, 1);
    setVolume(resolvedVolume);

    if (audioRef.current) {
      audioRef.current.volume = resolvedVolume;
    }

    cache.set('pulse-volume', String(resolvedVolume), { category: 'pulse' });
  }, []);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const toggleMute = useCallback(() => {
    if (volumeRef.current > 0) {
      preMuteVolumeRef.current = volumeRef.current;
      changeVolume(0);
      return;
    }
    changeVolume(preMuteVolumeRef.current > 0 ? preMuteVolumeRef.current : 0.7);
  }, [changeVolume]);

  const queueTrackNext = async (trackId: number | string) => {
    if (isRemotePlayback()) {
      sendDeviceCommand('queue_next', 0, { track_id: String(trackId) });
      notify({ content: lang?.pulse_will_play_next || 'Будет играть следующим', type: 'success', time: 3 });
      return;
    }
    queueDirtyRef.current = true;
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

  // latest-ref: колбэки ниже всегда вызывают актуальную версию playLoadedTrack,
  // оставаясь стабильными между рендерами (поведение идентично прямому вызову).
  const playLoadedTrackRef = useRef(playLoadedTrack);
  useEffect(() => {
    playLoadedTrackRef.current = playLoadedTrack;
  });

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
    if (isRemotePlayback()) {
      sendDeviceCommand('queue_remove', targetIndex);
      return;
    }
    // Очередь правили руками — пультам её теперь придётся слать списком.
    queueDirtyRef.current = true;

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
      void playLoadedTrackRef.current(newPlaylist[nextIdx] ?? null);
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
    if (isRemotePlayback()) {
      sendDeviceCommand('queue_move', 0, { from: fromIndex, to: toIndex });
      return;
    }
    queueDirtyRef.current = true;
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
    if (isRemotePlayback()) {
      sendDeviceCommand('queue_index', targetIndex);
      return;
    }
    const targetTrack = playlistRef.current[targetIndex] ?? null;
    if (targetTrack && !isTrackPlayable(targetTrack, userCountry)) {
      setIsBlockedTrackModalOpen(true);
      return;
    }
    // Очередь запускает трек в обход playCollection — выходим из комнаты здесь же.
    if (followingHostIdRef.current > 0) leaveListenAlong();
    setPlaylistIndex(targetIndex);
    void playLoadedTrackRef.current(targetTrack);
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
      stopProgressLoop();
      preloadAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleLoadStart = () => {
      setStatusAudio('Loading');
    };

    const handleCanPlay = () => {
      setStatusAudio('Ready');
      // Трек догрузился — сбрасываем счётчик сетевых ретраев.
      loadErrorRetryRef.current = 0;
    };

    const handlePlay = () => {
      // Пульт: локального звука быть не должно. Частый случай — ОС возобновила старый трек
      // после сна ноутбука, пока играющим стало другое устройство. Глушим и не «крадём» звук.
      if (isRemotePlayback()) {
        audioRef.current?.pause();
        return;
      }
      setIsPlaying(true);
      // Заиграло здесь — значит, звук аккаунта теперь тут, остальные устройства становятся пультами.
      claimActiveDevice();
      // Граф поднимаем только если эквалайзер реально что-то делает — иначе звук
      // не должен зависеть от живучести WebAudio-контекста.
      if (hasActiveEq()) {
        initWebAudio();
        resumeWebAudio();
      }
      bindMediaSession();
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch { }
      }
      startProgressLoop();
      syncTrackProgress({ forceProgressUpdate: true });
      emitPlaybackState();

      // Следующий трек от хоста не должен снимать паузу, которую поставил сам слушатель.
      if (followingHostIdRef.current > 0 && followerPausedRef.current) {
        audioRef.current?.pause();
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch { }
      }
      stopProgressLoop();
      syncTrackProgress({ forceProgressUpdate: true });
      emitPlaybackState();

      // Пауза хоста — общая, её запоминать не нужно; своя пауза слушателя переживает смену трека.
      if (followingHostIdRef.current > 0 && hostPlayingRef.current) {
        followerPausedRef.current = true;
      }
    };

    const handleEnded = () => {
      stopProgressLoop();

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
      // Перенос с другого устройства: встаём на ту же секунду, а не в начало трека.
      if (pendingSeekMsRef.current > 0 && audioRef.current) {
        audioRef.current.currentTime = pendingSeekMsRef.current / 1000;
        pendingSeekMsRef.current = 0;
      }
      syncTrackProgress({ forceProgressUpdate: true });
      // Трек сменился — слушателям нужна новая опорная точка.
      emitPlaybackState();
    };

    const handleTimeUpdate = () => {
      // Во время воспроизведения на экране прогресс ведёт таймер (4 раза в секунду) — timeupdate его
      // только дублировал бы. В фоне таймеры браузер душит, а события аудио нет: там (и на паузе,
      // при перемотке) предзагрузку следующего трека и позицию для медиасессии ведёт timeupdate.
      if (progressLoopRef.current !== null && !document.hidden) return;
      syncTrackProgress();
    };

    const handleError = () => {
      setIsPlaying(false);
      setStatusAudio('Ready');
      stopProgressLoop();

      const audio = audioRef.current;
      const track = playlistRef.current[indexRef.current] ?? null;
      if (!audio || !track) return;

      // Сами прервали загрузку (смена трека/сброс src) — это не сбой.
      if (audio.error && audio.error.code === MediaError.MEDIA_ERR_ABORTED) return;
      if (!audio.src && !audio.currentSrc) return;

      // ВАЖНО: регион-блок известен заранее (isTrackPlayable до воспроизведения). Сюда попадают
      // ТОЛЬКО сбои загрузки/сети/декодирования — их НЕ показываем как «недоступен в регионе».
      // Ретраим несколько раз с бэкоффом, перезагружая источник.
      if (loadErrorRetryRef.current < 3) {
        loadErrorRetryRef.current += 1;
        const attempt = loadErrorRetryRef.current;
        window.setTimeout(() => {
          const current = playlistRef.current[indexRef.current] ?? null;
          const el = audioRef.current;
          if (el && current && toNumber(current.sid) === toNumber(track.sid)) {
            try {
              el.load();
              void el.play().catch(() => {});
            } catch {
              // повторный сбой придёт новым error-событием
            }
          }
        }, 1200 * attempt);
        return;
      }

      // Ретраи исчерпаны — это сеть/таймаут, а не регион. Оставляем трек заряженным: можно нажать play.
      loadErrorRetryRef.current = 0;
      notify({
        content: langRef.current?.pulse_track_load_error || 'Не удалось загрузить трек. Проверьте соединение и попробуйте снова.',
        type: 'error',
        time: 5,
      });
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
  }, []);

  useEffect(() => {
    if (!currentSongId || !currentTrack) {
      // Сброс лирики для пустого трека — терминальное состояние, сеттлер здесь источник правды.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // Текст выключен настройкой — не тратим запрос, и rAF-цикл прогресса тоже не стартует.
    if (!isFullPlayerActive || !lyricsEnabled) {
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
      for (let attempt = 0; attempt <= LYRICS_RETRY_LIMIT; attempt += 1) {
        try {
          const lyricsData = await loadPulseLyrics(capturedTrack, controller.signal);
          if (cancelled) return;

          // Текста нет — так и есть. Сервис не ответил — пробуем ещё раз, а не ждём перезагрузки.
          if (!lyricsData.failed || attempt === LYRICS_RETRY_LIMIT) {
            setLyricsLines(lyricsData.lines);
            setLyricsSource(lyricsData.source);
            return;
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return;
          console.error('Failed to load lyrics', e);
          if (attempt === LYRICS_RETRY_LIMIT) return;
        }

        const waited = await new Promise<boolean>((resolve) => {
          const timer = window.setTimeout(() => resolve(true), LYRICS_RETRY_DELAY_MS);
          controller.signal.addEventListener('abort', () => {
            window.clearTimeout(timer);
            resolve(false);
          }, { once: true });
        });
        if (!waited || cancelled) return;
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
  }, [currentSongId, isFullPlayerActive, lyricsEnabled]);

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
    // Global bridge methods are installed once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** «Перенести сюда»: звук уходит с другого устройства на это, с той же секунды. */
  const transferPlaybackHere = useCallback(() => {
    const snapshot = getRemoteDevicesSnapshot();
    if (!snapshot.isRemote) return;

    const targetIndex = snapshot.state ? Math.min(snapshot.state.index, playlistRef.current.length - 1) : indexRef.current;
    const targetTrack = playlistRef.current[targetIndex] ?? null;
    if (!targetTrack) return;

    // Слушаем вместе с кем-то: входим в комнату и этим соединением, иначе после ухода прежнего
    // устройства аккаунт остался бы в ней только на бумаге. Свою паузу при переносе снимаем.
    if (followingHostIdRef.current > 0) {
      followerPausedRef.current = false;
      joinListenAlong(followingHostIdRef.current);
    }

    pendingSeekMsRef.current = snapshot.state ? getRemotePositionMs(snapshot.state) : 0;
    setPlaylistIndex(targetIndex);
    // Звук забираем не «по заявке», а когда он здесь реально пошёл: иначе при заблокированном
    // автозапуске музыка замолчала бы у обоих устройств.
    void playLoadedTrackRef.current(targetTrack);
  }, []);

  // Функции — постоянные ссылки на свежие версии, а само значение меняется только вместе с данными.
  // Без этого каждый тик прогресса перерисовывал бы всех потребителей (чат, списки треков, превью).
  const playerActions = useStableCallbacks({
    closePlayer,
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
    toggleRepeatMode,
    playQueueTrack,
    removeQueueTrack,
    moveQueueTrack,
    joinListenAlong: handleJoinListenAlong,
    transferPlaybackHere,
    leaveListenAlong,
  });

  const listenAlongListeners = listenAlong.listeners;
  const contextValue = useMemo<PulsePlayerContextValue>(() => ({
    ...playerActions,
    currentCollectionId: playlistId,
    currentSongId,
    currentTrackObj: currentTrack || null,
    isOpen: isVisible,
    isPlaying: effectiveIsPlaying,
    mode,
    repeatMode,
    playlist,
    currentIndex: index,
    listenAlongHostId: followingHostId,
    listenAlongListeners,
  }), [
    currentSongId,
    currentTrack,
    effectiveIsPlaying,
    followingHostId,
    index,
    isVisible,
    listenAlongListeners,
    mode,
    playerActions,
    playlist,
    playlistId,
    repeatMode,
  ]);

  // --- Совместное прослушивание ---------------------------------------------------------------

  useEffect(() => {
    followingHostIdRef.current = followingHostId;
    if (followingHostId === 0) followerPausedRef.current = false;
  }, [followingHostId]);

  useEffect(() => {
    hostPlayingRef.current = Boolean(listenAlong.state?.playing);
  }, [listenAlong.state?.playing]);

  useEffect(() => {
    hasListenersRef.current = listenAlong.listeners.length > 0 && followingHostId === 0;
  }, [followingHostId, listenAlong.listeners.length]);

  // Подключился новый слушатель — сервер просит хоста отдать состояние немедленно.
  useEffect(() => {
    setHostSyncRequestHandler(() => {
      // Слушатель уже в комнате: помечаем это сразу, иначе первая отправка уйдёт в никуда,
      // и человек ждал бы следующей опорной точки (до 10 секунд).
      hasListenersRef.current = true;
      emitPlaybackState(true);
    });
    return () => setHostSyncRequestHandler(null);
  }, [emitPlaybackState]);

  // Хост ушёл или закрыл плеер: музыка у слушателя продолжает играть, но об окончании надо сказать.
  useEffect(() => {
    setListenClosedHandler(({ reason, wasFollowing }) => {
      // Отключение по кнопке приходит всем устройствам аккаунта: это не уход хоста.
      if (!wasFollowing || reason === 'self_leave') return;

      if (reason === 'listen_host_busy' || reason === 'access_denied') {
        notify({
          content: reason === 'listen_host_busy'
            ? lang?.listen_along_busy || 'Этот человек сам слушает вместе с кем-то'
            : lang?.listen_along_denied || 'Этот человек не разрешает слушать вместе',
          type: 'error',
          time: 5,
        });
        return;
      }

      notify({
        content: lang?.listen_along_closed || 'Совместное прослушивание завершено: хост отключился',
        type: 'info',
        time: 5,
      });
    });
    return () => setListenClosedHandler(null);
  }, [lang?.listen_along_busy, lang?.listen_along_closed, lang?.listen_along_denied, notify]);

  // Опорная точка раз в 10 секунд: без неё ведомый копил бы расхождение между событиями.
  useEffect(() => {
    if (followingHostId > 0 || listenAlong.listeners.length === 0) return;
    const timer = window.setInterval(emitPlaybackState, LISTEN_STATE_INTERVAL_MS);

    // Хост вернулся из фона: слушатели ждут свежую опорную точку, таймер там стоял.
    const handleVisible = () => {
      if (document.hidden) return;
      resumeListenAlong();
      emitPlaybackState();
    };
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [emitPlaybackState, followingHostId, listenAlong.listeners.length]);

  // Хост не ответил: не оставляем человека в вечном «подключаемся».
  useEffect(() => {
    if (followingHostId <= 0 || listenAlong.state || isRemoteDevice) return;
    const timer = window.setTimeout(() => {
      leaveListenAlong();
      notify({
        content: lang?.listen_along_failed || 'Не удалось подключиться: хост не отвечает',
        type: 'error',
        time: 5,
      });
    }, LISTEN_JOIN_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [followingHostId, isRemoteDevice, lang?.listen_along_failed, listenAlong.state, notify]);

  // Ведомый: включаем тот же трек, что у хоста.
  const followedTrackId = listenAlong.state?.trackId || '';
  useEffect(() => {
    if (followingHostId <= 0 || !followedTrackId) return;
    // Трек за хостом включает только то устройство, которому принадлежит звук аккаунта.
    // Пульту нельзя: иначе после ухода игравшего устройства он заиграл бы сам.
    if (!isActiveDevice) return;
    if (String(currentSongIdRef.current) === followedTrackId) return;

    // Это переключение пришло от хоста, а не от человека — из комнаты не выходим.
    followDrivenPlayRef.current = true;
    void playTrack(followedTrackId).finally(() => {
      followDrivenPlayRef.current = false;
    });
  }, [followedTrackId, followingHostId, isActiveDevice, playTrack]);

  // Ведомый: держим позицию. Сами звук не включаем — это и политика браузеров про автозапуск,
  // и правило «поставил паузу — стоишь, пока не подключишься обратно».
  const followedState = listenAlong.state;
  useEffect(() => {
    if (followingHostId <= 0 || !followedState || !isActiveDevice) return;

    const align = () => {
      // Звук мог уехать на другое устройство прямо между тиками: иначе поймали бы два источника.
      if (!getRemoteDevicesSnapshot().isActiveSelf) return;
      const audio = audioRef.current;
      if (!audio || String(currentSongIdRef.current) !== followedState.trackId) return;

      if (!followedState.playing) {
        if (!audio.paused) audio.pause();
        return;
      }

      // Хост играет: сами возобновляем, только если слушатель не ставил паузу вручную.
      if (audio.paused) {
        if (followerPausedRef.current) return;
        void audio.play().catch(() => {
          // автозапуск заблокирован — слушатель нажмёт плей сам
        });
        return;
      }

      const driftMs = getTargetPositionMs(followedState) - audio.currentTime * 1000;
      if (Math.abs(driftMs) > LISTEN_HARD_SEEK_MS) {
        audio.currentTime = Math.max(0, getTargetPositionMs(followedState) / 1000);
        audio.playbackRate = 1;
        return;
      }
      audio.playbackRate = getCatchUpRate(driftMs);
    };

    align();
    const timer = window.setInterval(align, 1000);

    // В PWA на телефоне таймеры в фоне замораживаются, а звук играет дальше: вернулись — сразу ровняемся.
    const handleVisible = () => {
      if (document.hidden) return;
      resumeListenAlong();
      align();
    };
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisible);
      if (audioRef.current) audioRef.current.playbackRate = 1;
    };
  }, [followedState, followingHostId, isActiveDevice]);

  // --- Устройства аккаунта ---------------------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) return;
    announceDevice();
  }, [isAuthenticated]);

  // Стали пультом (в т.ч. после переподключения, когда device:stop не дошёл) — глушим локальный звук.
  useEffect(() => {
    if (isRemoteDevice) audioRef.current?.pause();
  }, [isRemoteDevice]);

  /**
   * Очередь для пультов. Смена трека сюда не относится: место в очереди едет в состоянии,
   * а лишняя пересборка списка на пульте только сбивала бы перемешанный порядок.
   */
  const publishDeviceQueue = useCallback((full: boolean) => {
    if (isRemotePlayback()) return;
    if (!full && !hasOtherDevicesNow()) return;
    const tracks = playlistRef.current;
    if (!tracks.length) return;

    sendDeviceQueue({
      collectionId: currentCollectionRawIdRef.current,
      collectionKey: currentCollectionIdRef.current,
      index: indexRef.current,
      isPlaylist: currentIsPlaylistRef.current,
      kind: currentCollectionKindRef.current,
      // Пересобрать по коллекции нельзя (перемешали, правили, радио) — значит, треки едут списком.
      // Без вида коллекции пульт тоже ничего не соберёт, поэтому шлём список и в этом случае.
      tracks: queueDirtyRef.current || !currentCollectionKindRef.current ? tracks : null,
    });
  }, []);

  // Играющее устройство: очередь пультам — когда она действительно поменялась.
  useEffect(() => {
    if (isRemoteDevice || !hasOtherDevices) return;
    publishDeviceQueue(false);
  }, [hasOtherDevices, isRemoteDevice, playlist, playlistId, publishDeviceQueue]);

  // Звук только что стал нашим: очередь, ушедшая до этого, сервером отброшена — он принимает её
  // лишь от играющего устройства. Поэтому отдаём всё заново, и пульт показывает плеер сразу.
  useEffect(() => {
    if (!isActiveDevice) return;
    publishDeviceQueue(true);
    emitPlaybackState(true);
  }, [emitPlaybackState, isActiveDevice, publishDeviceQueue]);

  // Опорная точка: без неё позиция на пульте застывала бы между событиями.
  useEffect(() => {
    if (isRemoteDevice || !hasOtherDevices) return;
    const timer = window.setInterval(() => emitPlaybackState(), DEVICE_STATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [emitPlaybackState, hasOtherDevices, isRemoteDevice]);

  // Пульт: позиция едет сама, событий от играющего устройства ждать нечего.
  useEffect(() => {
    if (!isRemoteDevice || !remoteState) return undefined;
    const tick = () => {
      const positionMs = getRemotePositionMs(remoteState);
      setRemoteTime((remoteState.durationMs > 0 ? Math.min(positionMs, remoteState.durationMs) : positionMs) / 1000);
    };
    tick();
    if (!remoteState.playing) return undefined;
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [isRemoteDevice, remoteState]);

  // Пульт: играющее устройство переключило трек — показываем тот же.
  const remoteIndex = remoteState?.index ?? -1;
  const remoteTrackId = remoteState?.trackId ?? '';
  useEffect(() => {
    if (!isRemoteDevice || remoteIndex < 0) return;

    // Очередь могла собраться чуть иначе (коллекция обновилась) — сначала ищем трек по ID.
    const expectedTrackId = toNumber(remoteTrackId);
    const matchedIndex = findTrackIndex(playlistRef.current, expectedTrackId, remoteIndex);
    const nextIndex = matchedIndex >= 0 ? matchedIndex : remoteIndex;
    if (nextIndex === indexRef.current || nextIndex >= playlistRef.current.length) return;
    setPlaylistIndex(nextIndex);
  }, [isRemoteDevice, remoteIndex, remoteTrackId]);

  /** Команда с пульта: исполняет её только то устройство, на котором идёт звук. */
  const handleDeviceCommand = (command: RemoteCommand) => {
    // «Забери звук себе» приходит как раз пульту — он и становится играющим.
    if (command.action === 'takeover') {
      transferPlaybackHere();
      return;
    }
    if (isRemotePlayback()) return;
    const audio = audioRef.current;

    switch (command.action) {
      case 'play':
        followerPausedRef.current = false;
        void audio?.play().catch(() => {
          // автозапуск заблокирован — человек нажмёт плей на самом устройстве
        });
        return;
      case 'pause':
        audio?.pause();
        return;
      case 'next':
        void nextTrack();
        return;
      case 'prev':
        void prevTrack();
        return;
      case 'seek':
        if (audio) {
          audio.currentTime = Math.max(0, command.value / 1000);
          emitPlaybackState();
        }
        return;
      case 'queue_index':
        playQueueTrack(Math.round(command.value));
        return;
      case 'queue_next':
        void queueTrackNext(String(command.params?.track_id ?? ''));
        return;
      case 'queue_remove':
        removeQueueTrack(Math.round(command.value));
        return;
      case 'queue_move':
        moveQueueTrack(Math.round(Number(command.params?.from) || 0), Math.round(Number(command.params?.to) || 0));
        return;
      case 'close':
        closePlayer();
        return;
      case 'play_collection': {
        const params = command.params ?? {};
        const kind = String(params.kind ?? '');
        if (!PULSE_COLLECTION_KINDS.includes(kind as PulseCollectionKind)) return;
        void playCollection(
          kind as PulseCollectionKind,
          String(params.id ?? ''),
          Boolean(params.force_reload),
          Number(params.shuffle) || 0,
          Number(params.start_index) || 0,
          (params.expected_song_id as number | string | null) ?? null,
        );
        return;
      }
      default:
    }
  };

  /** Очередь с играющего устройства: показываем её у себя, звук при этом не трогаем. */
  const applyRemoteQueue = async (queue: RemoteQueue) => {
    if (!isRemotePlayback()) return;

    let tracks = queue.tracks;
    if (!tracks?.length) {
      if (!queue.kind || !queue.collectionId) return;
      tracks = await fetchTrackCollection(queue.kind, queue.collectionId);
    }
    if (!tracks.length || !isRemotePlayback()) return;

    currentCollectionKindRef.current = queue.kind;
    currentCollectionRawIdRef.current = queue.collectionId;
    queueDirtyRef.current = Boolean(queue.tracks?.length);

    setPlaylistState(tracks);
    setPlaylistIndex(Math.min(queue.index, tracks.length - 1));
    setPlaylistMode(queue.isPlaylist, queue.collectionKey || '0');
    showPlayer();
  };

  /**
   * Звук забрало другое устройство: просто замолкаем. Оставаться ли аккаунту в комнате совместного
   * прослушивания, решает то устройство, которое звук забрало: включило своё — выйдет само,
   * подключилось к другу — только что вошло. Выходить отсюда значило бы рушить чужой вход.
   */
  const handleDeviceStop = () => {
    audioRef.current?.pause();
  };

  /** Подключилось новое устройство — отдаём ему очередь и позицию, не дожидаясь опорной точки. */
  const handleDeviceSync = () => {
    if (isRemotePlayback()) return;
    // Список устройств приедет своим событием, а очередь и позиция нужны прямо сейчас.
    publishDeviceQueue(true);
    emitPlaybackState(true);
  };

  // Команда ушла на активное устройство, а оно недоступно. Если мы только что просили включить
  // музыку — включаем здесь же (интент был «играть»), иначе показываем ошибку.
  const handleDeviceUnreachable = () => {
    const intent = pendingRemotePlayRef.current;
    if (intent && Date.now() - intent.at < 8000) {
      pendingRemotePlayRef.current = null;
      claimActiveDevice();
      void playCollection(intent.kind, intent.id, intent.forceReload, intent.shuffle, intent.startIndex, intent.expectedSongId);
      return;
    }
    notify({
      content: lang?.pulse_device_unreachable || 'Устройство недоступно',
      type: 'error',
      time: 4,
    });
  };

  const deviceHandlersRef = useRef({
    command: handleDeviceCommand,
    queue: applyRemoteQueue,
    stop: handleDeviceStop,
    sync: handleDeviceSync,
    unreachable: handleDeviceUnreachable,
    released: closePlayer,
  });
  useEffect(() => {
    deviceHandlersRef.current = {
      command: handleDeviceCommand,
      queue: applyRemoteQueue,
      stop: handleDeviceStop,
      sync: handleDeviceSync,
      unreachable: handleDeviceUnreachable,
      released: closePlayer,
    };
  });

  useEffect(() => {
    setDeviceCommandHandler((command) => deviceHandlersRef.current.command(command));
    setDeviceQueueHandler((queue) => { void deviceHandlersRef.current.queue(queue); });
    setDeviceStopHandler(() => deviceHandlersRef.current.stop());
    setDeviceSyncHandler(() => deviceHandlersRef.current.sync());
    setDeviceUnreachableHandler(() => deviceHandlersRef.current.unreachable());
    // После обрыва сокета звук возвращаем себе, только если он реально играет здесь (см. remote-devices).
    setDeviceLocalPlaybackProbe(() => Boolean(audioRef.current && !audioRef.current.paused && !audioRef.current.ended));
    // Играющее устройство закрыло плеер — пульт закрывает свой (команд никуда не шлёт: он уже не пульт).
    setDeviceReleasedHandler(() => deviceHandlersRef.current.released());
    return () => {
      setDeviceCommandHandler(null);
      setDeviceQueueHandler(null);
      setDeviceStopHandler(null);
      setDeviceSyncHandler(null);
      setDeviceUnreachableHandler(null);
      setDeviceLocalPlaybackProbe(null);
      setDeviceReleasedHandler(null);
    };
  }, []);

  const isFullMode = mode === 'full';
  const isFullPlayerShown = isFullMode && isPlayerAnimatingIn;

  // Полный плеер живёт в DOM, только пока раскрыт (и секунду после — на анимацию ухода):
  // свёрнутый он держал разметку, большие обложки, размытый фон и текст песни.
  const [isFullPlayerMounted, setIsFullPlayerMounted] = useState(false);
  if (isFullPlayerShown && !isFullPlayerMounted) setIsFullPlayerMounted(true);

  useEffect(() => {
    if (isFullPlayerShown || !isFullPlayerMounted) return undefined;
    const timer = window.setTimeout(() => setIsFullPlayerMounted(false), FULL_PLAYER_UNMOUNT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isFullPlayerMounted, isFullPlayerShown]);

  // Мини-плеер появился — в простое подгружаем код полного, чтобы раскрытие не ждало сеть.
  const [PulsePlayerFull, setPulsePlayerFull] = useState<PulsePlayerFullComponent | null>(null);
  const needsFullPlayerCode = !PulsePlayerFull && (effectivePlayerVisible || isFullPlayerMounted);
  useEffect(() => {
    if (!needsFullPlayerCode) return undefined;
    let cancelled = false;
    const prefetch = () => {
      loadPulsePlayerFull()
        .then((component) => {
          if (!cancelled) setPulsePlayerFull(() => component);
        })
        .catch((error: unknown) => {
          console.error('Failed to load full player', error);
        });
    };
    // Уже раскрывают — грузим сразу, не дожидаясь простоя.
    if (isFullPlayerMounted) {
      prefetch();
      return () => {
        cancelled = true;
      };
    }
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 1000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }
    const timer = window.setTimeout(prefetch, 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isFullPlayerMounted, needsFullPlayerCode]);

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

  // Живой мини-плеер — в шапке чата, если она открыта, иначе нижний. Уезжающая копия получает пустые ref'ы,
  // чтобы rAF-цикл перемотки и громкость не писали в уходящий DOM.
  const renderMiniPlayer = (docked: boolean) => {
    const live = docked || !miniPlayerSlot;
    return (
      <PulsePlayerMini
        activeSeekSlider={activeSeekSlider}
        currentTime={effectiveCurrentTime}
        desktopCurrentTimeLabelRef={live ? desktopCurrentTimeLabelRef : ghostMiniTimeLabelRef}
        desktopSeekInputRef={live ? desktopSeekInputRef : ghostMiniSeekInputRef}
        docked={docked}
        duration={effectiveDuration}
        isPlaying={effectiveIsPlaying}
        isSwiping={isSwiping}
        isVisible={live && !isFullMode && isPlayerAnimatingIn}
        lang={lang}
        onChangeVolume={changeVolume}
        onToggleMute={toggleMute}
        onDesktopSeekCancel={() => finishSeek(false)}
        onDesktopSeekChange={setSeekValue}
        onDesktopSeekStart={() => {
          seekingSliderRef.current = 'desktop';
          setActiveSeekSlider('desktop');
          setSeekValue(effectiveCurrentTime);
        }}
        onDesktopSeekSubmit={() => finishSeek(true)}
        onNextTrack={() => { void nextTrack(); }} /* eslint-disable-line react-hooks/refs -- обработчик клика: nextTrack/prevTrack/setMode вызываются по событию, а не в рендере; ложное срабатывание react-compiler (finishSeek с тем же телом и этот же вызов ниже по дереву не флагаются) */
        onOpenFull={() => setMode('full')} /* eslint-disable-line react-hooks/refs -- обработчик клика: nextTrack/prevTrack/setMode вызываются по событию, а не в рендере; ложное срабатывание react-compiler (finishSeek с тем же телом и этот же вызов ниже по дереву не флагаются) */
        onPrevTrack={() => { void prevTrack(); }} /* eslint-disable-line react-hooks/refs -- обработчик клика: nextTrack/prevTrack/setMode вызываются по событию, а не в рендере; ложное срабатывание react-compiler (finishSeek с тем же телом и этот же вызов ниже по дереву не флагаются) */
        onTouchStart={(event) => {
          if (window.innerWidth >= 1024) return;
          touchStartMiniRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          const shell = document.getElementById('NAVPmini');
          const width = shell?.clientWidth ?? 0;
          if (width > 0) setMiniShellWidth(width);
          setIsSwiping(false);
        }}
        onTouchMove={(event) => {
          // Живое перелистывание: сдвигаем содержимое пилюли за пальцем (только горизонталь).
          // Вертикальный жест остаётся «свайпом вверх для full» и не двигает контент.
          const start = touchStartMiniRef.current;
          if (!start || window.innerWidth >= 1024) return;
          const deltaX = event.touches[0].clientX - start.x;
          const deltaY = event.touches[0].clientY - start.y;
          if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
            if ((deltaX > 0 && !prevTrackObj) || (deltaX < 0 && !nextTrackObj && !isRadioModeRef.current)) {
              setSwipeX(deltaX * 0.3);
            } else {
              setSwipeX(deltaX);
            }
          } else {
            setSwipeX(0);
          }
        }}
        onTouchEnd={(event) => {
          const start = touchStartMiniRef.current;
          if (!start) return;
          touchStartMiniRef.current = null;
          if (window.innerWidth >= 1024) return;

          const deltaY = event.changedTouches[0].clientY - start.y;
          const deltaX = event.changedTouches[0].clientX - start.x;

          // Свайп вверх — открыть полный плеер. В шапке чата жест не работает: плеер уже наверху.
          if (!miniPlayerSlot && deltaY < -50 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
            setSwipeX(0);
            setMode('full');
            return;
          }

          // Горизонтальный свайп — перелистывание трека.
          // Докат на полную ширину пилюли: входящий трек заходит через скругление с одного края
          // и садится в 0px, а уходящий уходит за противоположный край капсулы (clipped overflow-hidden).
          const threshold = 60;
          const slideDistance = Math.max(miniShellWidth || 0, 360);

          if (deltaX < -threshold && (nextTrackObj || isRadioModeRef.current)) {
            flushSync(() => setIsSwiping(true));
            requestAnimationFrame(() => {
              setSwipeX(-slideDistance);
              setTimeout(() => {
                void nextTrack();
                setIsSwiping(false);
                setSwipeX(0);
              }, 250);
            });
          } else if (deltaX > threshold && prevTrackObj) {
            flushSync(() => setIsSwiping(true));
            requestAnimationFrame(() => {
              setSwipeX(slideDistance);
              setTimeout(() => {
                void prevTrack();
                setIsSwiping(false);
                setSwipeX(0);
              }, 250);
            });
          } else {
            // Отмена свайпа: возврат на место с transition
            flushSync(() => setIsSwiping(true));
            requestAnimationFrame(() => {
              setSwipeX(0);
              setTimeout(() => setIsSwiping(false), 250);
            });
          }
        }}
        onTogglePlay={togglePlay}
        playerArtist={playerArtist}
        playerArtwork={playerArtwork}
        playerTitle={playerTitle}
        nextTitle={getTrackDisplayTitle(nextTrackObj, lang)}
        nextArtist={getTrackArtist(nextTrackObj, lang)}
        prevTitle={getTrackDisplayTitle(prevTrackObj, lang)}
        prevArtist={getTrackArtist(prevTrackObj, lang)}
        nextArtwork={nextArtwork}
        prevArtwork={prevArtwork}
        seekValue={seekValue}
        shellWidth={miniShellWidth}
        swipeX={swipeX}
        volume={volume}
        volumeSliderRef={live ? volumeSliderRef : ghostMiniVolumeSliderRef}
      />
    );
  };

  return (
    <PulsePlayerContext.Provider value={contextValue}>
      {children}

      <audio ref={audioRef} id="htmlaudio" className="hidden" crossOrigin="anonymous" />

      {effectivePlayerVisible ? (
        <div
          id="NAVP"
          className="pointer-events-none fixed inset-0 z-[1500]"
        >
          {isMounted && isFullPlayerMounted && PulsePlayerFull ? (
            <PulsePlayerFull
            audioRef={isRemoteDevice ? remotePlaybackClockRef : audioRef}
            mobileCurrentTimeLabelRef={mobileCurrentTimeLabelRef}
            mobileSeekInputRef={mobileSeekInputRef}

            playerTitle={playerTitle}
            playerArtist={playerArtist}
            playerArtwork={playerArtwork}
            prevArtwork={prevArtwork}
            nextArtwork={nextArtwork}
            prevTrackObj={prevTrackObj}
            nextTrackObj={nextTrackObj}
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

            displayedCurrentTime={displayedCurrentTime}
            duration={effectiveDuration}

            isPlaying={effectiveIsPlaying}
            isVisible={isFullPlayerShown}

            activeLike={activeLike}
            isAuthenticated={isAuthenticated}

            lyricsLines={isFullPlayerActive ? lyricsLines : []}
            lyricsEnabled={lyricsEnabled}
            onToggleLyrics={() => setLyricsEnabled(!lyricsEnabled)}

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
            currentTrack={currentTrack}
            onOpenArtist={(artistId) => {
              router.push(`/pulse/artist/${encodeURIComponent(artistId)}`);
              setMode('mini');
            }}
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
              setSeekValue(effectiveCurrentTime);
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
            onOpenEqualizer={() => {
              // Открыли эквалайзер — с этого момента граф нужен.
              initWebAudio();
              resumeWebAudio();
              setIsEqualizerOpen(true);
            }}
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
              // Ведомый позицию не задаёт, а пульт перематывает командой.
              if (followingHostIdRef.current > 0) return;
              if (isRemotePlayback()) {
                sendDeviceCommand('seek', Math.round(nextTime * 1000));
                return;
              }
              if (!audioRef.current) return;
              audioRef.current.currentTime = nextTime;
              setCurrentTime(nextTime);
              setSeekValue(nextTime);
              forceUpdateMediaPositionState();
            }}
            />
          ) : null}

          {showBottomMiniPlayer ? renderMiniPlayer(false) : null}
          {miniPlayerSlot ? createPortal(renderMiniPlayer(true), miniPlayerSlot) : null}
        </div>
      ) : null}

      <PulsePlayerModals
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
