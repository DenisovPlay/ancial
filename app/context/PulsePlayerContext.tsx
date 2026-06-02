'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { AncialAPI } from '../lib/api-v2';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse/pulse-image';
import PulsePlaylistEditorModal from '../pulse/pulse-playlist-editor-modal';
import { PulseModal } from '../pulse/pulse-modal';
import { Dropdown, DropdownItem } from '../components/navigation';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

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
};

type PulseCollectionKind = 'artist' | 'genlist' | 'playlist' | 'track';

type PulseLyricsLine = {
  text: string;
  time: number;
};

type PulsePlayerMode = 'full' | 'mini';

type PulsePlayerState = {
  currentSongId: number;
  isPlaylist: boolean;
  listenCounted: boolean;
  listenedCounted: boolean;
  playlistId: string;
};

type PulsePlaylistManageItem = {
  id?: number | string | null;
  img?: string | null;
  name?: string | null;
  songs?: string | null;
};

type PulsePlaylistOption = {
  hasSong: boolean;
  id: string;
  image: string;
  name: string;
  songs: number[];
};

type PulsePlayerContextValue = {
  closePlayer: () => void;
  currentCollectionId: string;
  currentSongId: number;
  isOpen: boolean;
  isPlaying: boolean;
  mode: PulsePlayerMode;
  openAddToPlaylist: (songId: number | string) => void;
  playArtistPlaylist: (artistId: number | string, forceReload?: boolean, shuffle?: number, startIndex?: number, expectedSongId?: number | string | null) => Promise<void>;
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function toNumber(value: number | string | null | undefined) {
  const nextValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatPlaybackTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(value);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getTrackDisplayTitle(track: PulseTrack | null, lang: LangMap) {
  if (!track) return lang?.pulse_loading_dots || 'Загрузка';

  const title = normalizeText(track.title) || (lang?.pulse_unknown_track || 'Неизвестный трек');
  return String(track.explicit) === '1' || track.explicit === true ? `${title} \u{1F174}` : title;
}

function getTrackArtist(track: PulseTrack | null, lang: LangMap) {
  if (!track) return 'Pulse';
  return normalizeText(track.artist) || (lang?.pulse_unknown_artist || 'Неизвестный исполнитель');
}

function getTrackArtwork(track: PulseTrack | null) {
  const artwork = Array.isArray(track?.artwork) ? track?.artwork : [];
  const nextArtwork = artwork.find((item) => normalizeText(item?.src));
  return normalizeText(nextArtwork?.src) || FALLBACK_TRACK_IMAGE;
}

function normalizeTrackSource(trackSource: string | null | undefined) {
  const nextSource = normalizeText(trackSource);
  if (!nextSource) return '';

  return nextSource
    .replace('hb.ru-msk.vkcs.cloud', 'hb.bizmrg.com')
    .replace('https://anci.hb.bizmrg.com/music/', 'https://pulse.ancial.ru/track/');
}

function isTrackPlayable(track: PulseTrack | null, userCountry: string) {
  if (!track) return false;
  if (String(track.status ?? '0') !== '1') return false;

  const blockedValue = track.blockedin;
  if (Array.isArray(blockedValue)) {
    return !blockedValue.includes(userCountry);
  }

  const blockedCountries = normalizeText(String(blockedValue ?? ''));
  return blockedCountries ? !blockedCountries.includes(userCountry) : true;
}

function buildMediaArtwork(track: PulseTrack | null) {
  const trackImage = getTrackArtwork(track);
  const artwork = Array.isArray(track?.artwork) ? track.artwork : [];
  const validArtwork = artwork.filter((item) => normalizeText(item?.src));

  if (validArtwork.length && validArtwork[0]?.sizes) {
    return validArtwork.map((item) => ({
      sizes: normalizeText(item.sizes),
      src: normalizeText(item.src),
      type: normalizeText(item.type) || 'image/png',
    }));
  }

  return [
    { src: trackImage, sizes: '96x96', type: 'image/png' },
    { src: trackImage, sizes: '128x128', type: 'image/png' },
    { src: trackImage, sizes: '192x192', type: 'image/png' },
    { src: trackImage, sizes: '256x256', type: 'image/png' },
    { src: trackImage, sizes: '384x384', type: 'image/png' },
    { src: trackImage, sizes: '512x512', type: 'image/png' },
  ];
}

function readSavedVolume() {
  if (typeof window === 'undefined') return 0.7;

  const savedVolume = Number.parseFloat(window.localStorage.getItem('pulse-volume') || '');
  if (!Number.isFinite(savedVolume)) return 0.7;
  return clamp(savedVolume, 0, 1);
}

function parseLyricsText(value: string) {
  const lines: PulseLyricsLine[] = [];
  const rawLines = value.split(/\r\n|\n/);
  const lyricPattern = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

  rawLines.forEach((line) => {
    const match = line.match(lyricPattern);
    if (!match) return;

    const time = Number.parseInt(match[1], 10) * 60 + Number.parseFloat(match[2]);
    const text = normalizeText(match[3]);
    if (!text) return;

    lines.push({ text, time });
  });

  lines.sort((left, right) => left.time - right.time);

  if (lines.length > 0 && lines[0].time > 0.5) {
    lines.unshift({ text: '♪', time: 0 });
  }

  return lines;
}

function getActiveLyricState(lines: PulseLyricsLine[], currentTime: number) {
  let activeIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].time <= currentTime + 0.2) {
      activeIndex = index;
      continue;
    }
    break;
  }

  if (activeIndex === -1) {
    return {
      activeIndex: -1,
      progress: 0,
    };
  }

  const currentLine = lines[activeIndex];
  const nextLine = lines[activeIndex + 1];
  const duration = Math.max(0.1, (nextLine?.time ?? currentLine.time + 4) - currentLine.time - 0.5);
  const progress = clamp((currentTime - currentLine.time) / duration, 0, 1);

  return {
    activeIndex,
    progress,
  };
}

function splitLyricText(text: string) {
  let backText = '';
  const mainText = text.replace(/\(([^)]*)\)/g, (_, value: string) => {
    backText += `${value} `;
    return '';
  }).trim();

  return {
    backText: normalizeText(backText),
    mainText: normalizeText(mainText) || '♪',
  };
}

function normalizeSongIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toNumber(item as number | string | null | undefined)).filter(Boolean);
}

function parsePlaylistSongs(value: string | null | undefined) {
  return String(value ?? '')
    .split('|')
    .map((item) => toNumber(item))
    .filter(Boolean);
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

function renderLyricWords(text: string, progress: number, isActive: boolean) {
  const words = text.split(' ').filter(Boolean);
  if (!words.length) {
    return <span>{text}</span>;
  }

  const currentWordProgress = progress * words.length;

  return words.map((word, wordIndex) => {
    let fill = 0;

    if (isActive) {
      if (wordIndex < currentWordProgress - 1) {
        fill = 100;
      } else if (wordIndex > currentWordProgress) {
        fill = 0;
      } else {
        fill = clamp((currentWordProgress - wordIndex) * 100, 0, 100);
      }
    }

    const isCurrentWordFill = isActive && fill > 0 && fill < 100;
    const style = isActive
      ? ({
          transition: isCurrentWordFill ? `--pulse-lyric-fill ${PLAYER_LYRIC_FILL_TRANSITION_MS}ms linear` : 'none',
          '--pulse-lyric-fill': `${fill}%`,
          backgroundImage: 'linear-gradient(90deg, #ffffff var(--pulse-lyric-fill), rgba(255,255,255,0.4) var(--pulse-lyric-fill))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        } as CSSProperties)
      : undefined;

    return (
      <React.Fragment key={`${word}:${wordIndex}`}>
        <span style={style}>{word}</span>
        {wordIndex < words.length - 1 ? ' ' : null}
      </React.Fragment>
    );
  });
}

type PulseMobileLyricEntry = {
  activeIndex: number;
  backText: string;
  key: number;
  mainText: string;
  progress: number;
};

function PulseLyricsMobile({
  activeIndex,
  lyric,
  progress,
  source,
}: {
  activeIndex: number;
  lyric: ReturnType<typeof splitLyricText> | null;
  progress: number;
  source: string;
}) {
  const [displayEntry, setDisplayEntry] = useState<PulseMobileLyricEntry | null>(null);
  const [outgoingEntry, setOutgoingEntry] = useState<PulseMobileLyricEntry | null>(null);
  const [displayPhase, setDisplayPhase] = useState<'enter' | 'exit' | 'idle'>('idle');
  const animationFrameRef = useRef<number | null>(null);
  const displayedEntryRef = useRef<PulseMobileLyricEntry | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const latestEntryRef = useRef<PulseMobileLyricEntry | null>(null);
  const motionKeyRef = useRef(0);

  const mainText = lyric?.mainText || '♪';
  const backText = lyric?.backText || '';

  useEffect(() => {
    latestEntryRef.current = activeIndex >= 0
      ? {
          activeIndex,
          backText,
          key: motionKeyRef.current,
          mainText,
          progress,
        }
      : null;
  }, [activeIndex, backText, mainText, progress]);

  useEffect(() => {
    if (!displayedEntryRef.current || displayedEntryRef.current.activeIndex !== activeIndex) {
      return;
    }

    displayedEntryRef.current = {
      ...displayedEntryRef.current,
      backText,
      mainText,
      progress,
    };
  }, [activeIndex, backText, mainText, progress]);

  useEffect(() => {
    const clearPendingAnimations = () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
        enterTimerRef.current = null;
      }
    };

    const queueStateSync = (callback: () => void) => {
      clearPendingAnimations();
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        callback();
      });
    };

    const nextEntry = latestEntryRef.current;
    const previousEntry = displayedEntryRef.current;
    const lineChanged = !!nextEntry && (
      !previousEntry
      || previousEntry.activeIndex !== nextEntry.activeIndex
      || previousEntry.mainText !== nextEntry.mainText
      || previousEntry.backText !== nextEntry.backText
    );

    if (!nextEntry) {
      displayedEntryRef.current = null;
      queueStateSync(() => {
        setDisplayEntry(null);
        setOutgoingEntry(null);
        setDisplayPhase('idle');
      });
      return clearPendingAnimations;
    }

    if (!lineChanged) {
      return clearPendingAnimations;
    }

    motionKeyRef.current += 1;
    const enteringEntry: PulseMobileLyricEntry = {
      ...nextEntry,
      key: motionKeyRef.current,
    };

    if (!previousEntry) {
      displayedEntryRef.current = enteringEntry;
      queueStateSync(() => {
        setOutgoingEntry(null);
        setDisplayEntry(enteringEntry);
        setDisplayPhase('enter');
        enterTimerRef.current = window.setTimeout(() => {
          setDisplayPhase('idle');
          enterTimerRef.current = null;
        }, 420);
      });
      return clearPendingAnimations;
    }

    const frozenOutgoingEntry: PulseMobileLyricEntry = {
      ...previousEntry,
      progress: previousEntry.progress,
    };

    queueStateSync(() => {
      setDisplayEntry(null);
      setOutgoingEntry(frozenOutgoingEntry);
      setDisplayPhase('exit');

      exitTimerRef.current = window.setTimeout(() => {
        displayedEntryRef.current = enteringEntry;
        setOutgoingEntry(null);
        setDisplayEntry(enteringEntry);
        setDisplayPhase('enter');
        exitTimerRef.current = null;

        enterTimerRef.current = window.setTimeout(() => {
          setDisplayPhase('idle');
          enterTimerRef.current = null;
        }, 420);
      }, 320);
    });

    return clearPendingAnimations;
  }, [activeIndex, backText, mainText]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
      }
    };
  }, []);

  const visibleEntry = displayEntry;
  const visibleProgress = visibleEntry?.activeIndex === activeIndex ? progress : (visibleEntry?.progress ?? 0);

  return (
    <div className="animate-opacity-fade-in absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-zinc-900/70 p-3 backdrop-blur-sm backdrop-saturate-200 lg:hidden">
      <div className="relative flex h-[180px] w-full items-center justify-center overflow-hidden text-center text-zinc-100 drop-shadow-lg">
        {outgoingEntry ? (
          <div
            key={`mobile-lyric-out-${outgoingEntry.key}-${outgoingEntry.activeIndex}`}
            className="pulse-mobile-lyric-exit absolute inset-x-0 flex flex-col items-center justify-center px-2"
          >
            <span className="block text-2xl font-bold">
              {renderLyricWords(outgoingEntry.mainText, outgoingEntry.progress, true)}
            </span>
            {outgoingEntry.backText ? (
              <span className="mt-1 block text-sm font-semibold text-white/60">
                ({outgoingEntry.backText})
              </span>
            ) : null}
          </div>
        ) : null}

        {visibleEntry ? (
          <div
            key={`mobile-lyric-in-${visibleEntry.key}-${visibleEntry.activeIndex}`}
            className={
              displayPhase === 'enter'
                ? 'pulse-mobile-lyric-enter absolute inset-x-0 flex flex-col items-center justify-center px-2'
                : 'absolute inset-x-0 flex flex-col items-center justify-center px-2'
            }
          >
            <span className="block text-2xl font-bold">
              {renderLyricWords(visibleEntry.mainText, visibleProgress, true)}
            </span>
            {visibleEntry.backText ? (
              <span className="mt-1 block text-sm font-semibold text-white/60">
                ({visibleEntry.backText})
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {source ? (
        <span className="absolute inset-x-0 bottom-0 text-center text-xs text-zinc-500">
          Источник: {source}
        </span>
      ) : null}
    </div>
  );
}

const PulseLyricLineDesktop = React.memo(
  React.forwardRef<HTMLButtonElement, {
    isActive: boolean;
    line: PulseLyricsLine;
    onSeek: (time: number) => void;
    progress: number;
  }>(function PulseLyricLineDesktop({ isActive, line, onSeek, progress }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onSeek(line.time)}
        className={cn(
          'block cursor-pointer py-1 text-center text-white/40 duration-300',
          isActive && 'pointer-events-none scale-[1.03] text-white',
          !isActive && 'hover:text-white/70',
        )}
        style={{
          textShadow: isActive ? '0 0 18px rgba(255,255,255,0.2)' : undefined,
          transformOrigin: 'center',
        }}
      >
        {renderLyricWords(line.text, isActive ? progress : 0, isActive)}
      </button>
    );
  }),
  (prevProps, nextProps) => {
    return (
      prevProps.isActive === nextProps.isActive &&
      prevProps.progress === nextProps.progress &&
      prevProps.line === nextProps.line
    );
  }
);

function PulseLyricsDesktop({
  activeIndex,
  lines,
  onSeek,
  progress,
}: {
  activeIndex: number;
  lines: PulseLyricsLine[];
  onSeek: (time: number) => void;
  progress: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || !activeLineRef.current || userScrollingRef.current) return;

    const container = containerRef.current;
    const activeLine = activeLineRef.current;
    const targetTop = activeLine.offsetTop - container.clientHeight / 2 + activeLine.clientHeight / 2;

    container.scrollTo({
      behavior: 'smooth',
      top: Math.max(0, targetTop),
    });
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleUserScroll = () => {
    userScrollingRef.current = true;

    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      userScrollingRef.current = false;
      scrollTimeoutRef.current = null;
    }, 3000);
  };

  return (
    <div className="animate-opacity-fade-in hidden h-full lg:flex lg:pl-12 xl:pl-24 2xl:pl-32">
      <div className="relative h-full max-w-screen-sm">
        <div
          ref={containerRef}
          onWheel={handleUserScroll}
          onTouchMove={handleUserScroll}
          className="viewport flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden viewport px-3 py-32 text-center text-3xl font-bold"
        >
          {lines.map((line, lineIndex) => {
            const isActive = lineIndex === activeIndex;
            const nextProgress = isActive ? progress : 0;

            return (
              <PulseLyricLineDesktop
                key={`${line.time}:${lineIndex}`}
                ref={isActive ? activeLineRef : null}
                isActive={isActive}
                line={line}
                onSeek={onSeek}
                progress={nextProgress}
              />
            );
          })}
          <div className="h-[45vh] shrink-0"></div>
        </div>
      </div>
    </div>
  );
}

const EQ_BANDS = [60, 230, 910, 3600, 14000];

function readSavedEqGains() {
  if (typeof window === 'undefined') return [0, 0, 0, 0, 0];
  try {
    const saved = window.localStorage.getItem('pulse-eq-bands');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 5) return parsed;
    }
  } catch {}
  return [0, 0, 0, 0, 0];
}

const PulseEqualizerModal = ({ isOpen, onClose, eqGains, onGainChange, onReset }: {
  isOpen: boolean;
  onClose: () => void;
  eqGains: number[];
  onGainChange: (index: number, gain: number) => void;
  onReset: () => void;
}) => {
  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Эквалайзер"
    >
      <div className="flex flex-col gap-4 py-4 px-2">
          <div className="flex justify-around items-center h-48 w-full">
              {EQ_BANDS.map((freq, index) => (
                  <div key={freq} className="flex flex-col items-center justify-between h-full w-10">
                      <span className="text-xs text-zinc-400 font-medium h-4">
                          {eqGains[index] > 0 ? '+' : ''}{eqGains[index]}
                      </span>
                      <div className="flex-grow flex items-center justify-center w-full relative my-2">
                          <input
                              type="range"
                              min="-12"
                              max="12"
                              step="1"
                              value={eqGains[index]}
                              onChange={(e) => onGainChange(index, Number(e.target.value))}
                              className="w-40 appearance-none h-1.5 rounded-full bg-zinc-800 accent-purple-500 absolute origin-center -rotate-90"
                          />
                      </div>
                      <span className="text-xs text-zinc-400 font-medium h-4">
                         {freq >= 1000 ? `${(freq / 1000).toFixed(1).replace('.0', '')}k` : freq}
                      </span>
                  </div>
              ))}
          </div>
          <button
              onClick={onReset}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-zinc-300 duration-300 hover:bg-zinc-700 hover:text-white active:scale-95"
          >
              <span>Сбросить настройки</span>
          </button>
      </div>
    </PulseModal>
  );
};

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
  const likedSongIdsRef = useRef<number[] | null>(null);
  const seekingSliderRef = useRef<'desktop' | 'mobile' | null>(null);
  const visualProgressFrameRef = useRef<number | null>(null);
  const mobileSeekInputRef = useRef<HTMLInputElement | null>(null);
  const desktopSeekInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCurrentTimeLabelRef = useRef<HTMLDivElement | null>(null);
  const desktopCurrentTimeLabelRef = useRef<HTMLDivElement | null>(null);
  const volumeSliderRef = useRef<HTMLInputElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const [eqGains, setEqGains] = useState<number[]>(() => readSavedEqGains());
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const eqGainsRef = useRef<number[]>(eqGains);

  useEffect(() => {
    eqGainsRef.current = eqGains;
  }, [eqGains]);

  const initWebAudio = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      const filters = EQ_BANDS.map((freq, index) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = index === 0 ? 'lowshelf' : index === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = eqGainsRef.current[index];
        if (filter.type === 'peaking') {
          filter.Q.value = 1;
        }
        return filter;
      });

      eqFiltersRef.current = filters;

      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(audioCtx.destination);
    } catch (err) {
      console.warn("Failed to initialize Web Audio API", err);
    }
  }, []);

  const changeEqGain = useCallback((index: number, nextGain: number) => {
    setEqGains(prev => {
      const newGains = [...prev];
      newGains[index] = nextGain;
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('pulse-eq-bands', JSON.stringify(newGains));
      }
      return newGains;
    });

    if (eqFiltersRef.current[index]) {
      eqFiltersRef.current[index].gain.value = nextGain;
    }
  }, []);

  const resetEqGains = useCallback(() => {
    const newGains = [0, 0, 0, 0, 0];
    setEqGains(newGains);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pulse-eq-bands', JSON.stringify(newGains));
    }
    eqFiltersRef.current.forEach((filter) => {
      filter.gain.value = 0;
    });
  }, []);

  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<PulsePlayerMode>('mini');
  const [playlist, setPlaylist] = useState<PulseTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [playlistId, setPlaylistId] = useState('0');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => readSavedVolume());
  const [likedSongIds, setLikedSongIds] = useState<number[] | null>(null);
  const [lyricsLines, setLyricsLines] = useState<PulseLyricsLine[]>([]);
  const [lyricsSource, setLyricsSource] = useState('');
  const [seekValue, setSeekValue] = useState(0);
  const [activeSeekSlider, setActiveSeekSlider] = useState<'desktop' | 'mobile' | null>(null);
  const [listenCounted, setListenCounted] = useState(false);
  const [statusAudio, setStatusAudio] = useState('');
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [isPlaylistEditorOpen, setIsPlaylistEditorOpen] = useState(false);
  const [addToPlaylistSongId, setAddToPlaylistSongId] = useState(0);
  const [playlistOptions, setPlaylistOptions] = useState<PulsePlaylistOption[]>([]);
  const [playlistOptionsLoading, setPlaylistOptionsLoading] = useState(false);
  const [swipeX, setSwipeX] = useState(0);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartFullRef = useRef<{x: number, y: number} | null>(null);
  const touchStartMiniRef = useRef<{x: number, y: number} | null>(null);
  
  const currentTrack = playlist[index] ?? null;
  const prevTrackObj = playlist[index - 1] ?? null;
  const nextTrackObj = playlist[index + 1] ?? null;
  const currentSongId = toNumber(currentTrack?.sid);
  const userCountry = normalizeText(user?.country) || 'RU';
  const playerTitle = getTrackDisplayTitle(currentTrack, lang);
  const playerArtist = getTrackArtist(currentTrack, lang);
  const playerArtwork = getTrackArtwork(currentTrack);
  const prevArtwork = getTrackArtwork(prevTrackObj);
  const nextArtwork = getTrackArtwork(nextTrackObj);
  const hiddenByMessagesDialog = Boolean(pathname && pathname.startsWith('/messages/'));
  const effectivePlayerVisible = isMounted && !hiddenByMessagesDialog;
  const isPlayerAnimatingIn = isVisible && isMounted;
  const activeLike = currentTrack ? likedSongIds?.includes(toNumber(currentTrack.sid)) === true : false;
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

  const clearMediaSession = () => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.playbackState = 'none';
    } catch {}

    try {
      navigator.mediaSession.metadata = null;
    } catch {}

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
    } catch {}

    try {
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
    } catch {}

    try {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        window.prevplaylisttrack?.();
      });
    } catch {}

    try {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        window.nextplaylisttrack?.();
      });
    } catch {}

    try {
      navigator.mediaSession.setActionHandler('stop', () => {
        window.PlayerClose?.();
      });
    } catch {}

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
    } catch {}
  };

  const syncTrackProgress = (options: SyncTrackProgressOptions = {}) => {
    const audio = audioRef.current;
    if (!audio) return;

    const { forceProgressUpdate = false } = options;
    const nextCurrentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    setCurrentTime(nextCurrentTime);
    setDuration(nextDuration);

    if (!seekingSliderRef.current) {
      setSeekValue(nextCurrentTime);
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

  const syncVisualProgress = () => {
    const audio = audioRef.current;
    if (!audio || seekingSliderRef.current) return;

    const nextCurrentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const nextValue = String(nextCurrentTime);
    const nextMax = String(nextDuration || 0);

    [mobileSeekInputRef.current, desktopSeekInputRef.current].forEach((slider) => {
      if (!slider) return;

      slider.max = nextMax;
      slider.value = nextValue;
    });

    const formattedTime = formatPlaybackTime(nextCurrentTime);
    if (mobileCurrentTimeLabelRef.current) {
      mobileCurrentTimeLabelRef.current.textContent = formattedTime;
    }
    if (desktopCurrentTimeLabelRef.current) {
      desktopCurrentTimeLabelRef.current.textContent = formattedTime;
    }
  };

  const stopVisualProgressLoop = () => {
    if (visualProgressFrameRef.current !== null) {
      window.cancelAnimationFrame(visualProgressFrameRef.current);
      visualProgressFrameRef.current = null;
    }
  };

  const startVisualProgressLoop = () => {
    stopVisualProgressLoop();

    const tick = () => {
      syncVisualProgress();

      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
        visualProgressFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        visualProgressFrameRef.current = null;
      }
    };

    visualProgressFrameRef.current = window.requestAnimationFrame(tick);
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

  const openAddToPlaylist = (songId: number | string) => {
    const resolvedSongId = toNumber(songId);
    if (!resolvedSongId) return;

    setAddToPlaylistSongId(resolvedSongId);
    setIsAddToPlaylistOpen(true);
    setPlaylistOptions([]);
    setPlaylistOptionsLoading(true);

    void (async () => {
      try {
        const result = await AncialAPI.pulsePlaylistAction<{ data?: PulsePlaylistManageItem[]; error?: string }>('list', {});
        if (!result || !Array.isArray(result.data)) {
          notify({
            content: result.error || (lang?.pulse_error_happened || 'Произошла ошибка =('),
            type: 'error',
            time: 5,
          });
          setPlaylistOptions([]);
          return;
        }

        const nextOptions = Array.isArray(result.data)
          ? result.data.map((item) => {
            const parsedSongs = parsePlaylistSongs(item.songs);
            const playlistId = normalizeText(String(item.id ?? ''));
              return {
                hasSong: parsedSongs.includes(resolvedSongId),
                id: playlistId,
                image: normalizeText(item.img),
                name: normalizeText(item.name) || (lang?.pulse_unknown_playlist || 'Без названия'),
                songs: parsedSongs,
              } satisfies PulsePlaylistOption;
            }).filter((item) => item.id)
          : [];

        setPlaylistOptions(nextOptions);
      } catch {
        notify({
          content: lang?.pulse_error_happened || 'Произошла ошибка =(',
          type: 'error',
          time: 5,
        });
        setPlaylistOptions([]);
      } finally {
        setPlaylistOptionsLoading(false);
      }
    })();
  };

  const toggleSongInPlaylist = async (playlistId: string, hasSong: boolean) => {
    if (!playlistId || !addToPlaylistSongId) return;

    const option = playlistOptions.find((o) => o.id === playlistId);
    if (!option) return;

    let updatedSongs = [...option.songs];
    if (hasSong) {
      updatedSongs = updatedSongs.filter((id) => id !== addToPlaylistSongId);
    } else {
      updatedSongs.push(addToPlaylistSongId);
    }

    try {
      await AncialAPI.pulsePlaylistAction('update', {
        id: playlistId,
        songs: updatedSongs.join('|'),
      });

      setPlaylistOptions((currentOptions) =>
        currentOptions.map((item) =>
              item.id === playlistId
            ? {
                ...item,
                hasSong: !hasSong,
                songs: updatedSongs,
              }
            : item,
        ),
      );

      notify({
        content: hasSong
          ? lang?.pulse_removed_from_playlist || 'Удалено из плейлиста'
          : lang?.pulse_added_to_playlist || 'Добавлено в плейлист',
        type: 'success',
        time: 2,
      });

      if (window._pagePlaylistConf?.type === 2 && normalizeText(String(window._pagePlaylistConf.id ?? '')) === playlistId) {
        window.setTimeout(() => {
          setIsAddToPlaylistOpen(false);
          router.push(`/pulse/playlist/${playlistId}`);
        }, 400);
      }
    } catch {
      notify({
        content: lang?.pulse_error_happened || 'Произошла ошибка =(',
        type: 'error',
        time: 5,
      });
    }
  };

  const ensureLikedSongsLoaded = async () => {
    if (!isAuthenticated) {
      likedSongIdsRef.current = [];
      setLikedSongIds([]);
      return [];
    }

    if (likedSongIdsRef.current !== null) {
      return likedSongIdsRef.current;
    }

    try {
      const result = await AncialAPI.pulseGetLibrary<{ ids?: unknown }>('favorites');
      const nextIds = normalizeSongIds(result.ids);
      likedSongIdsRef.current = nextIds;
      setLikedSongIds(nextIds);
      return nextIds;
    } catch {
      likedSongIdsRef.current = [];
      setLikedSongIds([]);
      return [];
    }
  };

  useEffect(() => {
    const handleLikesUpdated = (e: CustomEvent) => {
      likedSongIdsRef.current = e.detail;
      setLikedSongIds(e.detail);
      if (typeof window !== 'undefined') {
        window._pulseLikedSongs = e.detail;
      }
    };
    window.addEventListener('pulse-likes-updated', handleLikesUpdated as EventListener);
    return () => window.removeEventListener('pulse-likes-updated', handleLikesUpdated as EventListener);
  }, []);

  const setLikedSongsState = (nextIds: number[]) => {
    likedSongIdsRef.current = nextIds;
    setLikedSongIds(nextIds);
    if (typeof window !== 'undefined') {
      window._pulseLikedSongs = nextIds;
      window.dispatchEvent(new CustomEvent('pulse-likes-updated', { detail: nextIds }));
    }
  };

  const toggleSongLike = async (
    songId: number | string,
    options?: {
      playlistId?: number | string | null;
      triggerPlaylistRedirect?: boolean;
    },
  ) => {
    const resolvedSongId = toNumber(songId);
    if (!resolvedSongId) return;

    try {
      const response = await AncialAPI.pulseTrackAction<{ message?: string }>('add_favorite', resolvedSongId);
      const result = response.message || '';
      const currentIds = await ensureLikedSongsLoaded();

      if (result === 'ADDED' || result === 'CREATED_ADDED') {
        const nextIds = currentIds.includes(resolvedSongId)
          ? currentIds
          : [...currentIds, resolvedSongId];
        setLikedSongsState(nextIds);

        notify({
          content:
            result === 'CREATED_ADDED'
              ? lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан, трек добавлен'
              : lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!',
          type: 'success',
          time: 5,
        });

        if (options?.triggerPlaylistRedirect && options.playlistId) {
          router.push(`/pulse/playlist/${options.playlistId}`);
        }
      } else if (result === 'REMOVED') {
        const nextIds = currentIds.filter((id) => id !== resolvedSongId);
        setLikedSongsState(nextIds);

        notify({
          content: lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!',
          type: 'success',
          time: 5,
        });

        if (options?.triggerPlaylistRedirect && options.playlistId) {
          router.push(`/pulse/playlist/${options.playlistId}`);
        }
      } else if (result === 'UND_SONG') {
        notify({
          content: lang?.pulse_unknown_song || 'Неизвестная песня...',
          type: 'error',
          time: 5,
        });
      }
    } catch {
      notify({
        content: lang?.pulse_error_happened || 'Произошла ошибка =(',
        type: 'error',
        time: 5,
      });
    }
  };

  const likeCurrentSong = async () => {
    if (!currentSongIdRef.current) return;
    await toggleSongLike(currentSongIdRef.current);
  };

  const togglePlaylistLike = async (nextPlaylistId: number | string) => {
    const resolvedPlaylistId = normalizeText(String(nextPlaylistId));
    if (!resolvedPlaylistId) return;

    try {
      const response = await AncialAPI.pulsePlaylistAction<{ message?: string }>('like', { id: resolvedPlaylistId });
      const result = response.message || '';

      window.dispatchEvent(
        new CustomEvent('pulse:playlist-like-changed', {
          detail: {
            liked: result === 'like',
            playlistId: resolvedPlaylistId,
          },
        }),
      );
    } catch {
      notify({
        content: lang?.pulse_error_happened || 'Произошла ошибка =(',
        type: 'error',
        time: 5,
      });
    }
  };

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

    const trackSource = normalizeTrackSource(track.src);
    if (!trackSource) {
      notify({
        content: lang?.pulse_unknown_song || 'Неизвестная песня...',
        type: 'error',
        time: 5,
      });
      return;
    }

    currentSongIdRef.current = toNumber(track.sid);
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

    if (audio.src !== trackSource) {
      audio.src = trackSource;
      audio.load();
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

    try {
      const result = await AncialAPI.pulseGetPlaylist<PulseTrack[]>({
        id: kind === 'playlist' ? resolvedId : undefined,
        gid: kind === 'genlist' ? String(resolvedId) : undefined,
        aid: kind === 'artist' ? String(resolvedId) : undefined,
        tid: kind === 'track' ? String(resolvedId) : undefined,
      });
      return Array.isArray(result) ? result : [];
    } catch {
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

  const prevTrack = async () => {
    if (!currentIsPlaylistRef.current || !playlistRef.current.length) return;

    const nextIndex = indexRef.current > 0 ? indexRef.current - 1 : 0;
    setPlaylistIndex(nextIndex);
    await playLoadedTrack(playlistRef.current[nextIndex] ?? null);
  };

  const nextTrack = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentIsPlaylistRef.current || !playlistRef.current.length) {
      audio.currentTime = 0;
      audio.pause();
      return;
    }

    if (indexRef.current < playlistRef.current.length - 1) {
      const nextIndex = indexRef.current + 1;
      setPlaylistIndex(nextIndex);
      await playLoadedTrack(playlistRef.current[nextIndex] ?? null);
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

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pulse-volume', String(resolvedVolume));
    }
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

  const fetchLyricsData = async (track: PulseTrack | null) => {
    if (!track) {
      return {
        lines: [] as PulseLyricsLine[],
        source: '',
      };
    }

    const title = normalizeText(track.title)
      .replace('(Remix)', '')
      .replace('(Sped Up Version)', '');
    const artist = normalizeText(track.artist).split(',')[0];

    if (!title || !artist) {
      return {
        lines: [] as PulseLyricsLine[],
        source: '',
      };
    }

    try {
      const response = await fetch(
        `https://pulse-lyrics.ancial.ru/UniLyrics.php?a=${encodeURIComponent(artist)}&t=${encodeURIComponent(title)}&d=0&type=alternative`,
        {
          cache: 'no-store',
        },
      );
      const result = await response.text();
      const nextLyrics = parseLyricsText(result);

      if (!nextLyrics.length) {
        return {
          lines: [] as PulseLyricsLine[],
          source: '',
        };
      }

      return {
        lines: nextLyrics,
        source: 'Pulse',
      };
    } catch {
      return {
        lines: [] as PulseLyricsLine[],
        source: '',
      };
    }
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
  }, []);

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
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      bindMediaSession();
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch {}
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
        } catch {}
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
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          album: normalizeText(currentTrack.album) || 'Ancial',
          artist: playerArtist,
          artwork: buildMediaArtwork(currentTrack),
          title: playerTitle,
        });
      } catch {
        // ignore MediaMetadata errors
      }
    }

    let cancelled = false;

    void (async () => {
      const lyricsData = await fetchLyricsData(currentTrack);
      if (cancelled) return;

      setLyricsLines(lyricsData.lines);
      setLyricsSource(lyricsData.source);
    })();

    syncWindowState();

    return () => {
      cancelled = true;
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
          setLikedSongIds([...(likedSongIdsRef.current ?? [])]);
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
    isOpen: isVisible,
    isPlaying,
    mode,
    openAddToPlaylist,
    playArtistPlaylist,
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
              className="pulse-player-full-shell flex h-dvh w-full flex-col items-center justify-center gap-1 overflow-y-auto overflow-x-hidden rounded-none bg-zinc-900/80 p-1 shadow md:h-full md:gap-3"
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
              <div className="absolute top-3 z-[20] flex w-full items-center px-3">
                <button
                  type="button"
                  onClick={closePlayer}
                  className="cursor-pointer duration-300 active:scale-95"
                >
                  <PlayerIcon name="IC-times" className="h-10 w-10 fill-white" />
                </button>

                <div className="flex flex-grow flex-col items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const albumId = normalizeText(String(currentTrack?.albumid ?? ''));
                      if (!albumId) return;

                      router.push(`/pulse/playlist/${albumId}`);
                      setMode('mini');
                    }}
                    className={cn(
                      'text-center text-sm text-white duration-300 lg:text-base',
                      normalizeText(String(currentTrack?.albumid ?? '')) && 'cursor-pointer active:scale-95 hover:text-zinc-300',
                    )}
                  >
                    {normalizeText(currentTrack?.album) || (lang?.pulse_playing_now || 'Сейчас играет')}
                  </button>
                  <img alt="Pulse Logo" className="w-24 shrink-0 backdrop-shadow-lg" src="/img/branding/pulse.svg"></img>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('mini')}
                  className="cursor-pointer duration-300 hover:fill-zinc-300 active:scale-95"
                >
                  <PlayerIcon name="IC-chevron-down" className="h-10 w-10 fill-white" />
                </button>
              </div>

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

                  <div className="mt-3 flex w-full max-w-sm flex-col items-center justify-center gap-1 duration-300">
                    <input
                      min={0}
                      max={duration || 0}
                      step="0.01"
                      type="range"
                      value={displayedCurrentTime}
                      onPointerDown={() => {
                        seekingSliderRef.current = 'mobile';
                        setActiveSeekSlider('mobile');
                        setSeekValue(currentTime);
                      }}
                      onPointerUp={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = seekValue;
                        }
                        seekingSliderRef.current = null;
                        setActiveSeekSlider(null);
                        setCurrentTime(seekValue);
                        syncVisualProgress();
                        forceUpdateMediaPositionState();
                      }}
                      onChange={(event) => {
                        setSeekValue(Number(event.target.value));
                      }}
                      className="h-3 w-full appearance-none rounded-full bg-zinc-800 accent-purple-500"
                      ref={mobileSeekInputRef}
                    />
                    <div className="flex w-full text-xs text-zinc-300 duration-300 lg:text-sm">
                      <div ref={mobileCurrentTimeLabelRef} className="flex-grow">{formatPlaybackTime(displayedCurrentTime)}</div>
                      <div>{formatPlaybackTime(duration)}</div>
                    </div>
                  </div>

                  <div className="flex w-full max-w-sm items-center justify-center">
                    <div className="mt-3 flex items-center gap-3 duration-300 lg:gap-6">
                      <div className="mr-6">
                        <Dropdown
                          position="top"
                          align="start"
                          triggerSize="sm"
                          triggerNode={<PlayerIcon name="IC-more" className="h-9 w-9 fill-white duration-300 hover:fill-zinc-300" />}
                          triggerClassName="cursor-pointer duration-300 active:scale-95 block !w-auto !h-auto !p-0 !bg-transparent hover:!bg-transparent"
                        >
                          {isAuthenticated && (
                            <DropdownItem onClick={() => openAddToPlaylist(currentSongId)} icon="IC-plus">
                              В плейлист
                            </DropdownItem>
                          )}
                          <DropdownItem onClick={() => setIsEqualizerOpen(true)} icon="IC-equalizer">
                            Эквалайзер
                          </DropdownItem>
                        </Dropdown>
                      </div>

                      <button type="button" onClick={() => { void prevTrack(); }}>
                        <PlayerIcon name="IC-moveback" className="h-10 w-10 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
                      </button>

                      <button
                        type="button"
                        onClick={togglePlay}
                        className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95"
                      >
                        <PlayerIcon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-12 w-12 fill-white" />
                      </button>

                      <button type="button" onClick={() => { void nextTrack(); }}>
                        <PlayerIcon name="IC-moveforward" className="h-10 w-10 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
                      </button>

                      {isAuthenticated ? (
                        <button
                          id="player_likebutton"
                          type="button"
                          onClick={() => {
                            void likeCurrentSong();
                          }}
                          className="ml-6 cursor-pointer duration-300 active:scale-95"
                        >
                          <PlayerIcon
                            name={activeLike ? 'IC-heart-filled' : 'IC-heart'}
                            className={cn(
                              'h-9 w-9 duration-300 hover:fill-zinc-300',
                              activeLike ? 'fill-pink-400' : 'fill-white',
                            )}
                          />
                        </button>
                      ) : null}
                    </div>
                  </div>
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

          <div
            className={cn(
              'absolute inset-x-0 bottom-16 flex justify-center px-1.5 pb-2.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:bottom-1.5 md:justify-end md:pb-1.5 z-[60]',
              !isFullMode && isPlayerAnimatingIn
                ? 'pointer-events-auto translate-y-0'
                : 'pointer-events-none translate-y-[200%]',
            )}
          >
            <div
              id="NAVPmini"
              className="pulse-player-mini-shell flex items-center gap-1 rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 shadow backdrop-blur-md backdrop-saturate-200 duration-300 w-full"
              onTouchStart={(e) => {
                if (window.innerWidth >= 1024) return;
                touchStartMiniRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }}
              onTouchEnd={(e) => {
                if (touchStartMiniRef.current && window.innerWidth < 1024) {
                  const deltaY = e.changedTouches[0].clientY - touchStartMiniRef.current.y;
                  const deltaX = e.changedTouches[0].clientX - touchStartMiniRef.current.x;
                  if (deltaY < -50 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
                    setMode('full');
                  }
                  touchStartMiniRef.current = null;
                }
              }}
            >
              <button
                type="button"
                onClick={() => setMode('full')}
                className="group relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-full bg-zinc-800 shadow duration-300 active:scale-95 lg:h-16 lg:w-16"
              >
                <PulseCoverImage
                  alt={playerTitle}
                  className="rounded-full"
                  sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer}
                  src={playerArtwork}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 opacity-0 duration-300 group-hover:opacity-100">
                  <PlayerIcon name="IC-full-mode" className="h-10 w-10 fill-white" />
                </div>
              </button>

              <div className="flex w-40 shrink-0 flex-col lg:w-64">
                <span className="w-full truncate text-sm text-white lg:text-base">{playerTitle}</span>
                <span className="w-full truncate text-xs text-zinc-300 lg:text-sm">{playerArtist}</span>
              </div>

              <div className="flex-grow"></div>

              <div className="hidden flex-grow flex-col items-center justify-center gap-1 lg:flex">
                <input
                  min={0}
                  max={duration || 0}
                  step="0.01"
                  type="range"
                  value={activeSeekSlider === 'desktop' ? seekValue : currentTime}
                  onPointerDown={() => {
                    seekingSliderRef.current = 'desktop';
                    setActiveSeekSlider('desktop');
                    setSeekValue(currentTime);
                  }}
                  onPointerUp={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = seekValue;
                    }
                    seekingSliderRef.current = null;
                    setActiveSeekSlider(null);
                    setCurrentTime(seekValue);
                    syncVisualProgress();
                    forceUpdateMediaPositionState();
                  }}
                  onChange={(event) => {
                    setSeekValue(Number(event.target.value));
                  }}
                  className="h-3 w-full max-w-sm appearance-none rounded-full bg-zinc-800 accent-purple-500"
                  ref={desktopSeekInputRef}
                />
                <div className="flex w-full max-w-sm text-xs text-zinc-300 lg:text-sm">
                  <div ref={desktopCurrentTimeLabelRef} className="flex-grow">{formatPlaybackTime(activeSeekSlider === 'desktop' ? seekValue : currentTime)}</div>
                  <div>{formatPlaybackTime(duration)}</div>
                </div>
              </div>

              <div className="hidden flex-grow lg:block"></div>

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
                    onChange={(event) => {
                      changeVolume(event.target.value);
                    }}
                    className="h-3 w-full appearance-none rounded-full bg-zinc-800 accent-purple-500"
                  />
                </div>

                <button type="button" onClick={() => { void prevTrack(); }}>
                  <PlayerIcon name="IC-moveback" className="h-8 w-8 shrink-0 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95"
                >
                  <PlayerIcon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-10 w-10 fill-white" />
                </button>

                <button type="button" onClick={() => { void nextTrack(); }}>
                  <PlayerIcon name="IC-moveforward" className="h-8 w-8 shrink-0 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PulseModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => {
          setIsAddToPlaylistOpen(false);
        }}
        scrollable
        title={lang?.pulse_add_to_playlist || 'В плейлист'}
      >
        <div className="flex flex-col gap-1">
          {playlistOptionsLoading ? (
            <div className="py-6 text-center text-sm text-zinc-400">
              {lang?.loading || 'Загрузка...'}
            </div>
          ) : null}

          {!playlistOptionsLoading && !playlistOptions.length ? (
            <div className="py-6 text-center text-sm text-zinc-500">
              {lang?.pulse_no_playlists || 'Нет плейлистов. Создайте новый!'}
            </div>
          ) : null}

          {!playlistOptionsLoading
            ? playlistOptions.map((playlistOption) => (
                <button
                  key={playlistOption.id}
                  type="button"
                  onClick={() => {
                    void toggleSongInPlaylist(playlistOption.id, playlistOption.hasSong);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left duration-300 hover:bg-zinc-800/60 hover:pr-3 active:scale-95"
                >
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                    {playlistOption.image ? (
                      <PulseCoverImage
                        alt={playlistOption.name}
                        className="rounded-xl"
                        sizes={PULSE_COVER_IMAGE_SIZES.modal}
                        src={playlistOption.image}
                      />
                    ) : (
                      <PlayerIcon name="IC-music" className="h-7 w-7 fill-zinc-600" />
                    )}
                  </div>

                  <span className="flex-grow text-sm font-medium text-zinc-100">
                    {playlistOption.name}
                  </span>

                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 duration-300',
                      playlistOption.hasSong
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-zinc-600',
                    )}
                  >
                    {playlistOption.hasSong ? (
                      <PlayerIcon name="IC-check" className="h-3 w-3 fill-white" />
                    ) : null}
                  </span>
                </button>
              ))
            : null}

          <button
            type="button"
            onClick={() => {
              setIsAddToPlaylistOpen(false);
              setIsPlaylistEditorOpen(true);
            }}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-zinc-300 duration-300 hover:bg-zinc-700 hover:text-white active:scale-95"
          >
            <PlayerIcon name="IC-plus" className="h-4 w-4 fill-current" />
            <span>{lang?.pulse_create_playlist || 'Создать новый плейлист'}</span>
          </button>
        </div>
      </PulseModal>

      <PulsePlaylistEditorModal
        isOpen={isPlaylistEditorOpen}
        onClose={() => {
          setIsPlaylistEditorOpen(false);
          if (addToPlaylistSongId) {
            setIsAddToPlaylistOpen(true);
          }
        }}
        onSaved={() => {
          if (addToPlaylistSongId) {
            openAddToPlaylist(addToPlaylistSongId);
          }
        }}
        showNote={(content, type = 'info', time = 4) => {
          notify({ content, type, time });
        }}
      />
      <PulseEqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        eqGains={eqGains}
        onGainChange={changeEqGain}
        onReset={resetEqGains}
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
