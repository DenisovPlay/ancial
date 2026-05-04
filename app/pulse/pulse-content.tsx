'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dropdown, DropdownItem } from '../components/navigation';
import ShareModal from '../components/share-modal';
import { useAuth, type User } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import { useDragScroll } from '../hooks/useDragScroll';
import { authFetch } from '../lib/auth-fetch';
import { PulseLegalFooter } from './pulse-components';
import { canManagePulseTrack, getPulseTrackDropdownZIndex } from './playlist/playlist-model';
import { getPulseExternalUrl, getPulseNavigationTarget } from './pulse-navigation';
import PulseUploadTrackModal, { PulseDeleteTrackModal } from './pulse-upload-track-modal';

type PulseHomePlaylistCard = {
  creator?: string | null;
  desk?: string | null;
  genlist?: string | null;
  id?: number | string | null;
  img?: string | null;
  name?: string | null;
  type?: number | string | null;
};

type PulseHomeArtist = {
  desk?: string | null;
  id?: number | string | null;
  img?: string | null;
  name?: string | null;
  verify?: number | string | null;
};

type PulseTrackArtwork = {
  src?: string | null;
};

type PulseTrack = {
  album?: string | null;
  albumid?: number | string | null;
  artist?: string | null;
  artists_ids?: string[] | string | null;
  artwork?: PulseTrackArtwork[] | null;
  blockedin?: string[] | string | null;
  explicit?: boolean | number | string | null;
  lang?: string | null;
  listens?: number | string | null;
  sid?: number | string | null;
  src?: string | null;
  status?: number | string | null;
  title?: string | null;
  uploaded_by?: number | string | null;
};

type RecentlyListenedState = PulseHomePlaylistCard[] | 'empty' | null;
type HomeTrackCollectionId = 'New' | 'Top' | 'Your';
type NoteKind = 'error' | 'info' | 'success';

type PulseTrackRowProps = {
  currentSongId: number;
  favoriteIds: number[];
  isAuthenticated: boolean;
  onAddToPlaylist: (trackId: number | string) => void;
  onCopyTrackLink: (trackId: number | string) => Promise<void>;
  onDeleteTrack?: (track: PulseTrack) => void;
  onEditTrack?: (track: PulseTrack) => void;
  onLikeTrack: (track: PulseTrack) => Promise<void>;
  onOpenArtist: (artistId: string) => void;
  onPlayTrack: (track: PulseTrack, index: number) => void;
  onQueueTrackNext: (trackId: number | string) => Promise<void>;
  track: PulseTrack;
  trackIndex: number;
  user: User | null;
  userCountry: string;
};

const HOME_CACHE_KEYS = {
  artists: 'pulse_home_artists',
  fromPulse: 'pulse_home_frompulse',
  listened: 'pulse_home_listened',
  nowListen: 'pulse_home_nowlisten',
  weLike: 'pulse_home_welike',
} as const;

const TRACK_CACHE_KEYS: Record<HomeTrackCollectionId, string> = {
  New: 'playlist_tracks_gid_New',
  Top: 'playlist_tracks_gid_Top',
  Your: 'playlist_tracks_gid_Your',
};

const FAVORITES_CACHE_KEY = 'pulse_fav_ids';
const DEFAULT_TRACK_IMAGE = '/includes/img/pulse/track.png';
const THINKING_IMAGE = '/includes/img/anlite/thinking.webp';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function toNumber(value: number | string | null | undefined) {
  const nextValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function decodeHtmlEntities(value: string | null | undefined) {
  const nextValue = normalizeText(value);
  if (!nextValue || typeof window === 'undefined') {
    return nextValue;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = nextValue;
  return textarea.value;
}

function readJsonCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function writeJsonCache(key: string, value: unknown) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage issues
  }
}

function readListenedCache(): RecentlyListenedState {
  if (typeof window === 'undefined') return null;

  const rawValue = window.localStorage.getItem(HOME_CACHE_KEYS.listened);
  if (!rawValue) return null;
  if (rawValue === 'empty') return 'empty';

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? parsed as PulseHomePlaylistCard[] : null;
  } catch {
    return null;
  }
}

function writeListenedCache(value: RecentlyListenedState) {
  if (typeof window === 'undefined') return;

  try {
    if (value === 'empty') {
      window.localStorage.setItem(HOME_CACHE_KEYS.listened, 'empty');
      return;
    }

    if (Array.isArray(value)) {
      window.localStorage.setItem(HOME_CACHE_KEYS.listened, JSON.stringify(value));
    }
  } catch {
    // ignore storage issues
  }
}

async function fetchJsonData<T>(url: string): Promise<T> {
  const response = await authFetch(url);
  const text = await response.text();
  return JSON.parse(text) as T;
}

function getImageUrl(value: string | null | undefined, fallback = DEFAULT_TRACK_IMAGE) {
  const nextValue = normalizeText(value);
  return nextValue || fallback;
}

function getTrackArtwork(track: PulseTrack) {
  const artwork = Array.isArray(track.artwork) ? track.artwork : [];
  const cover = artwork.find((item) => normalizeText(item?.src));
  return getImageUrl(cover?.src, DEFAULT_TRACK_IMAGE);
}

function isTrackExplicit(track: PulseTrack) {
  return track.explicit === true || String(track.explicit ?? '') === '1';
}

function getBlockedCountries(blockedIn: PulseTrack['blockedin']) {
  if (Array.isArray(blockedIn)) {
    return blockedIn.map((item) => normalizeText(item)).filter(Boolean);
  }

  return normalizeText(String(blockedIn ?? ''))
    .split(/[|,]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function isTrackAvailable(track: PulseTrack, userCountry: string) {
  if (String(track.status ?? '0') !== '1') {
    return false;
  }

  const blockedCountries = getBlockedCountries(track.blockedin);
  if (!blockedCountries.length) {
    return true;
  }

  return !blockedCountries.includes(userCountry);
}

function getArtistIds(track: PulseTrack) {
  if (Array.isArray(track.artists_ids)) {
    return track.artists_ids.map((artistId) => normalizeText(artistId)).filter(Boolean);
  }

  return normalizeText(String(track.artists_ids ?? ''))
    .split(/[|,]/)
    .map((artistId) => normalizeText(artistId))
    .filter(Boolean);
}

function isGenlistCard(card: PulseHomePlaylistCard) {
  return String(card.type ?? '') === '4';
}

function getPlayableCardId(card: PulseHomePlaylistCard) {
  return isGenlistCard(card)
    ? normalizeText(card.genlist)
    : normalizeText(String(card.id ?? ''));
}

function getCardPlaylistPath(card: PulseHomePlaylistCard) {
  return `/pulse/playlist/${encodeURIComponent(normalizeText(String(card.id ?? '0')) || '0')}`;
}

function getArtistPath(artistId: number | string) {
  return `/pulse/artist/${encodeURIComponent(normalizeText(String(artistId)) || '0')}`;
}

function getTrackPath(trackId: number | string) {
  return `/pulse/track/${encodeURIComponent(normalizeText(String(trackId)) || '0')}`;
}

function PulseLogo({ className }: { className?: string }) {
  return (
    <img src="/img/branding/pulse.svg" alt="Pulse Logo" className={cn('shrink-0', className)} />
  );
}

function ActionIcon({ name, className }: { className?: string; name: string }) {
  return (
    <svg className={cn('inline fill-white', className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href={`/icons.svg#${name}`} />
    </svg>
  );
}

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('w-full max-w-screen-2xl px-3 text-2xl font-black cutetext lg:px-0 lg:text-3xl xl:text-4xl', className)}>
      {children}
    </span>
  );
}

function PlaylistCardSkeleton() {
  return (
    <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-zinc-600/30 bg-zinc-800 shadow duration-300 animate-pulse lg:h-48 lg:w-48" />
  );
}

function ArtistCardSkeleton() {
  return (
    <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full border border-zinc-600/30 bg-zinc-800 shadow duration-300 animate-pulse lg:h-48 lg:w-48" />
  );
}

function ListenedPillSkeleton() {
  return (
    <div className="flex w-full items-center gap-1.5 rounded-full border border-zinc-600/30 bg-zinc-900/80 shadow">
      <div className="h-14 w-14 rounded-full bg-zinc-700/80 xl:h-16 xl:w-16 2xl:h-20 2xl:w-20" />
    </div>
  );
}

function TracksPanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-zinc-800" />
          <div className="flex flex-grow flex-col gap-2">
            <div className="h-4 w-2/3 rounded-full bg-zinc-800" />
            <div className="h-3 w-1/3 rounded-full bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PulsePlaylistCard({
  card,
  isPlaying,
  onOpen,
  onPlay,
}: {
  card: PulseHomePlaylistCard;
  isPlaying: boolean;
  onOpen: () => void;
  onPlay: () => void;
}) {
  const coverUrl = getImageUrl(card.img, DEFAULT_TRACK_IMAGE);

  return (
    <div className="group relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-zinc-600/30 shadow duration-300 active:scale-95 lg:h-48 lg:w-48">
      <button type="button" onClick={onOpen} className="h-full w-full cursor-pointer">
        <img src={coverUrl} alt={decodeHtmlEntities(card.name) || 'Playlist cover'} className="h-full w-full object-cover" />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex w-full gap-1 bg-gradient-to-t from-black via-black/90 to-transparent p-1 duration-300 items-end lg:gap-3 lg:p-3 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={onPlay}
          className="shrink-0 cursor-pointer rounded-full border border-zinc-600/30 bg-purple-500/50 p-2 shadow backdrop-blur-md backdrop-saturate-200 duration-300 hover:bg-purple-600 active:scale-95"
          aria-label={isPlaying ? 'Pause playlist' : 'Play playlist'}
        >
          <ActionIcon className="h-6 w-6" name={isPlaying ? 'IC-pause' : 'IC-play'} />
        </button>

        <div className="flex min-w-0 flex-col gap-0 text-left">
          <span className="w-28 truncate text-sm font-medium text-white">{decodeHtmlEntities(card.name) || 'Без названия'}</span>
          <span className="hidden text-xs text-zinc-300 lg:flex">{decodeHtmlEntities(card.desk) || 'Pulse'}</span>
        </div>
      </div>
    </div>
  );
}

function PulseArtistCard({
  artist,
  onOpen,
}: {
  artist: PulseHomeArtist;
  onOpen: () => void;
}) {
  const imageUrl = getImageUrl(artist.img, DEFAULT_TRACK_IMAGE);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col items-center justify-center duration-300 active:scale-95"
    >
      <div className="relative z-[2] h-32 w-32 overflow-hidden rounded-full opacity-0 blur-sm duration-300 group-hover:opacity-100 lg:h-48 lg:w-48">
        <div className="h-full w-full bg-cover bg-center duration-300 group-hover:scale-110" style={{ backgroundImage: `url(${imageUrl})` }} />
      </div>

      <div className="absolute top-0 z-[4] h-32 w-32 overflow-hidden rounded-full border border-zinc-600/30 shadow lg:h-48 lg:w-48">
        <div className="h-full w-full bg-cover bg-center duration-300 group-hover:scale-110" style={{ backgroundImage: `url(${imageUrl})` }} />
      </div>

      <span className="z-[1] flex max-w-32 items-center gap-1 truncate text-sm font-medium text-zinc-100 duration-300 lg:-translate-y-24 lg:group-hover:translate-y-0 lg:max-w-48">
        <span className="truncate">{decodeHtmlEntities(artist.name) || 'Артист'}</span>
      </span>
    </button>
  );
}

function RecentlyListenedPill({
  card,
  isPlaying,
  onOpen,
  onPlay,
}: {
  card: PulseHomePlaylistCard;
  isPlaying: boolean;
  onOpen: () => void;
  onPlay: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-1.5 rounded-full border border-zinc-600/30 bg-zinc-900/80 shadow duration-300 hover:bg-zinc-700 active:scale-95">
      <button type="button" onClick={onPlay} className="relative h-14 w-14 shrink-0 cursor-pointer rounded-full xl:h-16 xl:w-16 2xl:h-20 2xl:w-20">
        <img src={getImageUrl(card.img, DEFAULT_TRACK_IMAGE)} alt={decodeHtmlEntities(card.name) || 'Playlist cover'} className="h-full w-full rounded-full object-cover" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 duration-300 hover:bg-black/20">
          <ActionIcon className="h-7 w-7 opacity-0 duration-300 hover:opacity-100" name={isPlaying ? 'IC-pause' : 'IC-play'} />
        </span>
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 flex-grow cursor-pointer text-left">
        <span className="block truncate text-base font-medium text-white lg:text-lg 2xl:text-xl">
          {decodeHtmlEntities(card.name) || 'Без названия'}
        </span>
      </button>
    </div>
  );
}

function PulseTrackRow({
  currentSongId,
  favoriteIds,
  isAuthenticated,
  onAddToPlaylist,
  onCopyTrackLink,
  onDeleteTrack,
  onEditTrack,
  onLikeTrack,
  onOpenArtist,
  onPlayTrack,
  onQueueTrackNext,
  track,
  trackIndex,
  user,
  userCountry,
}: PulseTrackRowProps) {
  const trackId = toNumber(track.sid);
  const isCurrentSong = currentSongId > 0 && currentSongId === trackId;
  const isOwnTrack = canManagePulseTrack(track, user);
  const isLiked = trackId > 0 && favoriteIds.includes(trackId);
  const isAvailable = isTrackAvailable(track, userCountry);
  const firstArtistId = getArtistIds(track)[0] ?? '';
  const coverUrl = getTrackArtwork(track);
  const title = decodeHtmlEntities(track.title) || 'Без названия';
  const artist = decodeHtmlEntities(track.artist) || 'Неизвестный исполнитель';
  const [isTrackMenuOpen, setIsTrackMenuOpen] = useState(false);
  const trackMenuZIndex = getPulseTrackDropdownZIndex(trackIndex, isTrackMenuOpen);

  return (
    <div className={cn('rounded-2xl flex items-center gap-3 duration-300', isAvailable ? 'group hover:bg-zinc-800 hover:pr-3' : 'opacity-80', isCurrentSong && 'bg-lime-500/10 pr-3')}>
      <button
        type="button"
        onClick={() => onPlayTrack(track, trackIndex)}
        disabled={!isAvailable}
        className={cn('relative h-16 w-16 shrink-0 cursor-pointer', !isAvailable && 'cursor-not-allowed')}
      >
        {isOwnTrack ? (
          <ActionIcon
            className="absolute -left-1.5 -top-1.5 z-10 h-6 w-6 rounded-full border border-zinc-600/30 bg-pink-500/50 stroke-white p-1 backdrop-blur-sm backdrop-saturate-200"
            name="IC-crown"
          />
        ) : null}

        <img src={coverUrl} alt={`${title} cover`} className="h-full w-full rounded-2xl object-cover" />

        {isTrackExplicit(track) ? (
          <div className="absolute -bottom-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-800/70 px-1 text-[10px] font-bold text-white backdrop-blur-sm backdrop-saturate-200">
            18+
          </div>
        ) : null}
      </button>

      <button type="button" onClick={() => onPlayTrack(track, trackIndex)} disabled={!isAvailable} className={cn('min-w-0 flex-grow cursor-pointer text-left', !isAvailable && 'cursor-not-allowed')}>
        <span className="block truncate text-sm font-medium text-white md:text-base lg:text-lg">
          {title}
        </span>
        <span className="block truncate text-xs text-zinc-300 lg:text-sm">
          {isAvailable ? artist : 'Трек недоступен'}
        </span>
      </button>

      {isAuthenticated ? (
        <button type="button" onClick={() => void onLikeTrack(track)} className="cursor-pointer active:scale-95">
          <ActionIcon className={cn('h-6 w-6 duration-300 hover:fill-zinc-300 lg:h-8 lg:w-8', isLiked ? 'fill-white' : 'fill-zinc-100')} name={isLiked ? 'IC-heart-filled' : 'IC-heart'} />
        </button>
      ) : null}

      <Dropdown
        position="bottom"
        align="end"
        triggerSize="sm"
        menuClassName="min-w-[12rem]"
        onOpenChange={setIsTrackMenuOpen}
        open={isTrackMenuOpen}
        wrapperClassName="relative"
        wrapperStyle={{ zIndex: trackMenuZIndex }}
      >
        {isAuthenticated && isOwnTrack && onEditTrack ? (
          <DropdownItem icon="IC-edit" onClick={() => onEditTrack(track)}>
            Изменить
          </DropdownItem>
        ) : null}
        {isAuthenticated && isOwnTrack && onDeleteTrack ? (
          <DropdownItem icon="IC-trash" onClick={() => onDeleteTrack(track)}>
            Удалить
          </DropdownItem>
        ) : null}
        {isAuthenticated ? (
          <DropdownItem icon="IC-chart-hor" onClick={() => void onQueueTrackNext(track.sid ?? 0)}>
            Следующим
          </DropdownItem>
        ) : null}
        {isAuthenticated ? (
          <DropdownItem icon="IC-plus" onClick={() => onAddToPlaylist(track.sid ?? 0)}>
            В плейлист
          </DropdownItem>
        ) : null}
        <DropdownItem icon="IC-download" onClick={() => window.open(normalizeText(track.src), '_blank', 'noopener,noreferrer')}>
          Скачать
        </DropdownItem>
        {firstArtistId ? (
          <DropdownItem icon="IC-me" onClick={() => onOpenArtist(firstArtistId)}>
            Исполнитель
          </DropdownItem>
        ) : null}
        <DropdownItem icon="IC-share" onClick={() => void onCopyTrackLink(track.sid ?? 0)}>
          Поделиться
        </DropdownItem>
      </Dropdown>
    </div>
  );
}

function TrackCollectionPanel({
  buttonVisible = true,
  collectionId,
  currentCollectionId,
  isAuthenticated,
  isLoading,
  isPlaying,
  onOpenCollection,
  onPlayCollection,
  onRenderTrack,
  title,
  tracks,
}: {
  buttonVisible?: boolean;
  collectionId: HomeTrackCollectionId;
  currentCollectionId: string;
  isAuthenticated?: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  onOpenCollection: () => void;
  onPlayCollection: () => void;
  onRenderTrack: (track: PulseTrack, index: number) => React.ReactNode;
  title: React.ReactNode;
  tracks: PulseTrack[] | null;
}) {
  const panelIsActive = currentCollectionId === collectionId && isPlaying;

  return (
    <div className="flex flex-col justify-center gap-3 rounded-2xl shadow">
      <div className="flex items-center gap-3 px-3 lg:px-0">
        <button type="button" onClick={onOpenCollection} className="flex-grow cursor-pointer text-left text-2xl font-black cutetext duration-300 hover:text-zinc-300 active:scale-95 lg:text-3xl xl:text-4xl">
          {title}
        </button>
        {buttonVisible && isAuthenticated !== false ? (
          <button
            type="button"
            onClick={onPlayCollection}
            className={cn(
              'shrink-0 cursor-pointer rounded-full border border-zinc-600/30 bg-purple-500 p-3 shadow duration-300 hover:bg-purple-600 active:scale-95',
              panelIsActive && 'bg-purple-600',
            )}
            aria-label={panelIsActive ? `Pause ${collectionId}` : `Play ${collectionId}`}
          >
            <ActionIcon className="h-6 w-6" name={panelIsActive ? 'IC-pause' : 'IC-play'} />
          </button>
        ) : null}
      </div>

      <div className="relative h-full rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 duration-300">
        {isLoading ? <TracksPanelSkeleton /> : null}
        {!isLoading && tracks?.length ? (
          <div className="flex flex-col gap-3">
            {tracks.slice(0, 5).map((track, index) => (
              <React.Fragment key={`${collectionId}-${track.sid ?? index}`}>
                {onRenderTrack(track, index)}
              </React.Fragment>
            ))}
          </div>
        ) : null}
        {!isLoading && !tracks?.length ? (
          <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 text-center text-zinc-300">
            <ActionIcon className="h-12 w-12 fill-white" name="IC-music" />
            <span className="text-sm text-zinc-400">Пока пусто</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PulseContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, lang, user } = useAuth();
  const { showNote } = useNotification();
  const {
    currentCollectionId,
    currentSongId,
    isPlaying,
    openAddToPlaylist,
    playGenlist,
    playNextTrack,
    playPlaylist,
  } = usePulsePlayer();

  const fromPulseScrollRef = useDragScroll({ speed: 2 });
  const artistsScrollRef = useDragScroll({ speed: 2 });
  const weLikeScrollRef = useDragScroll({ speed: 2 });
  const nowListenScrollRef = useDragScroll({ speed: 2 });

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [trackToDelete, setTrackToDelete] = useState<PulseTrack | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<PulseTrack | null>(null);
  const [tracksReloadToken, setTracksReloadToken] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    const cachedFavoriteIds = readJsonCache<number[]>(FAVORITES_CACHE_KEY);
    return Array.isArray(cachedFavoriteIds)
      ? cachedFavoriteIds.map((id) => toNumber(id)).filter(Boolean)
      : [];
  });
  const [listened, setListened] = useState<RecentlyListenedState>(() => readListenedCache());
  const [fromPulse, setFromPulse] = useState<PulseHomePlaylistCard[] | null>(() => readJsonCache<PulseHomePlaylistCard[]>(HOME_CACHE_KEYS.fromPulse));
  const [artists, setArtists] = useState<PulseHomeArtist[] | null>(() => readJsonCache<PulseHomeArtist[]>(HOME_CACHE_KEYS.artists));
  const [weLike, setWeLike] = useState<PulseHomePlaylistCard[] | null>(() => readJsonCache<PulseHomePlaylistCard[]>(HOME_CACHE_KEYS.weLike));
  const [nowListen, setNowListen] = useState<PulseHomePlaylistCard[] | null>(() => readJsonCache<PulseHomePlaylistCard[]>(HOME_CACHE_KEYS.nowListen));
  const [topTracks, setTopTracks] = useState<PulseTrack[] | null>(() => readJsonCache<PulseTrack[]>(TRACK_CACHE_KEYS.Top));
  const [newTracks, setNewTracks] = useState<PulseTrack[] | null>(() => readJsonCache<PulseTrack[]>(TRACK_CACHE_KEYS.New));
  const [yourTracks, setYourTracks] = useState<PulseTrack[] | null>(() => readJsonCache<PulseTrack[]>(TRACK_CACHE_KEYS.Your));

  const guestYourPulseMessage = 'Я не знаю кто ты... Создашь аккаунт?';
  const userCountry = useMemo(() => {
    const nextCountry = normalizeText(
      typeof window !== 'undefined'
        ? String((window as Window & { userCountry?: string }).userCountry ?? user?.country ?? '')
        : String(user?.country ?? ''),
    );

    return nextCountry || 'RU';
  }, [user?.country]);

  const updateFavoriteIds = useCallback((updater: (currentIds: number[]) => number[]) => {
    setFavoriteIds((currentIds) => {
      const nextIds = updater(currentIds);
      writeJsonCache(FAVORITES_CACHE_KEY, nextIds);
      return nextIds;
    });
  }, []);

  const showPulseNote = useCallback((content: string, type: NoteKind = 'info', time = 4) => {
    showNote({
      content,
      time,
      type,
    });
  }, [showNote]);

  const openPulseSubpage = useCallback((path: string) => {
    const target = getPulseNavigationTarget(path);

    if (target.type === 'internal') {
      router.push(target.href);
      return;
    }

    window.location.assign(target.href);
  }, [router]);

  const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openPulseSubpage(`/pulse/search?q=${encodeURIComponent(searchValue)}`);
  }, [openPulseSubpage, searchValue]);

  const playPlaylistCard = useCallback((card: PulseHomePlaylistCard) => {
    const playableId = getPlayableCardId(card);
    if (!playableId) return;

    if (isGenlistCard(card)) {
      void playGenlist(playableId);
      return;
    }

    void playPlaylist(playableId);
  }, [playGenlist, playPlaylist]);

  const openPlaylistCard = useCallback((card: PulseHomePlaylistCard) => {
    openPulseSubpage(getCardPlaylistPath(card));
  }, [openPulseSubpage]);

  const openArtistPage = useCallback((artistId: number | string) => {
    openPulseSubpage(getArtistPath(artistId));
  }, [openPulseSubpage]);

  const copyTrackLink = useCallback(async (trackId: number | string) => {
    const resolvedTrackId = toNumber(trackId);
    if (!resolvedTrackId) return;

    setShareUrl(getPulseExternalUrl(getTrackPath(resolvedTrackId)));
    setIsShareModalOpen(true);
  }, []);

  const pulseTrackAddedText = lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!';
  const pulseTrackRemovedText = lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!';
  const pulseFavoriteCreatedText = lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!';
  const pulseUnknownSongText = lang?.pulse_unknown_song || 'Неизвестная песня...';
  const pulseErrorText = lang?.pulse_error_happened || 'Произошла ошибка =(';

  const likeTrack = useCallback(async (track: PulseTrack) => {
    if (!isAuthenticated) {
      showPulseNote('Войдите, чтобы добавлять треки в избранное', 'info');
      return;
    }

    const trackId = toNumber(track.sid);
    if (!trackId) return;

    try {
      const response = await authFetch(`/api/pulse/add_favorite_song.php?id=${trackId}`);
      const result = normalizeText(await response.text());

      if (result === 'ADDED' || result === 'CREATED_ADDED') {
        updateFavoriteIds((currentIds) => (
          currentIds.includes(trackId) ? currentIds : [...currentIds, trackId]
        ));
        showPulseNote(
          result === 'CREATED_ADDED' ? pulseFavoriteCreatedText : pulseTrackAddedText,
          'success',
          4,
        );
        return;
      }

      if (result === 'REMOVED') {
        updateFavoriteIds((currentIds) => currentIds.filter((id) => id !== trackId));
        showPulseNote(pulseTrackRemovedText, 'success', 4);
        return;
      }

      if (result === 'UND_SONG') {
        showPulseNote(pulseUnknownSongText, 'error');
        return;
      }

      showPulseNote(pulseErrorText, 'error');
    } catch {
      showPulseNote(pulseErrorText, 'error');
    }
  }, [isAuthenticated, pulseErrorText, pulseFavoriteCreatedText, pulseTrackAddedText, pulseTrackRemovedText, pulseUnknownSongText, showPulseNote, updateFavoriteIds]);

  const queueTrackNext = useCallback(async (trackId: number | string) => {
    await playNextTrack(trackId);
  }, [playNextTrack]);

  const openAddTrackToPlaylist = useCallback((trackId: number | string) => {
    if (!isAuthenticated) {
      showPulseNote('Войдите, чтобы добавлять треки в плейлисты', 'info');
      return;
    }

    openAddToPlaylist(trackId);
  }, [isAuthenticated, openAddToPlaylist, showPulseNote]);

  const refreshHomeTracksAfterMutation = useCallback(() => {
    if (typeof window !== 'undefined') {
      Object.values(TRACK_CACHE_KEYS).forEach((key) => window.localStorage.removeItem(key));
    }

    setTracksReloadToken((token) => token + 1);
  }, []);

  const openEditTrack = useCallback((track: PulseTrack) => {
    setTrackToEdit(track);
  }, []);

  const closeEditTrack = useCallback(() => {
    setTrackToEdit(null);
  }, []);

  const openDeleteTrack = useCallback((track: PulseTrack) => {
    setTrackToDelete(track);
  }, []);

  useEffect(() => {
    const cachedFavoriteIds = readJsonCache<number[]>(FAVORITES_CACHE_KEY);

    let cancelled = false;

    void fetchJsonData<{ ids?: Array<number | string> }>('/api/pulse/getFavorites.php')
      .then((result) => {
        if (cancelled) return;

        const nextFavoriteIds = Array.isArray(result.ids)
          ? result.ids.map((id) => toNumber(id)).filter(Boolean)
          : [];

        writeJsonCache(FAVORITES_CACHE_KEY, nextFavoriteIds);
        setFavoriteIds(nextFavoriteIds);
      })
      .catch(() => {
        if (!cachedFavoriteIds && !cancelled) {
          setFavoriteIds([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const cachedFromPulse = readJsonCache<PulseHomePlaylistCard[]>(HOME_CACHE_KEYS.fromPulse);
    const cachedArtists = readJsonCache<PulseHomeArtist[]>(HOME_CACHE_KEYS.artists);
    const cachedWeLike = readJsonCache<PulseHomePlaylistCard[]>(HOME_CACHE_KEYS.weLike);
    const cachedNowListen = readJsonCache<PulseHomePlaylistCard[]>(HOME_CACHE_KEYS.nowListen);

    let cancelled = false;

    const requests = [
      fetchJsonData<PulseHomePlaylistCard[]>('/api/pulse/pages/home.php?type=from_pulse'),
      fetchJsonData<PulseHomeArtist[]>('/api/pulse/pages/home.php?type=artists'),
      fetchJsonData<PulseHomePlaylistCard[]>('/api/pulse/pages/home.php?type=welike'),
      fetchJsonData<PulseHomePlaylistCard[]>('/api/pulse/pages/home.php?type=nowlisten'),
    ] as const;

    void Promise.allSettled(requests).then(([fromPulseResult, artistsResult, weLikeResult, nowListenResult]) => {
      if (cancelled) return;

      if (fromPulseResult.status === 'fulfilled' && Array.isArray(fromPulseResult.value)) {
        writeJsonCache(HOME_CACHE_KEYS.fromPulse, fromPulseResult.value);
        setFromPulse(fromPulseResult.value);
      } else if (!cachedFromPulse) {
        setFromPulse([]);
      }

      if (artistsResult.status === 'fulfilled' && Array.isArray(artistsResult.value)) {
        writeJsonCache(HOME_CACHE_KEYS.artists, artistsResult.value);
        setArtists(artistsResult.value);
      } else if (!cachedArtists) {
        setArtists([]);
      }

      if (weLikeResult.status === 'fulfilled' && Array.isArray(weLikeResult.value)) {
        writeJsonCache(HOME_CACHE_KEYS.weLike, weLikeResult.value);
        setWeLike(weLikeResult.value);
      } else if (!cachedWeLike) {
        setWeLike([]);
      }

      if (nowListenResult.status === 'fulfilled' && Array.isArray(nowListenResult.value)) {
        writeJsonCache(HOME_CACHE_KEYS.nowListen, nowListenResult.value);
        setNowListen(nowListenResult.value);
      } else if (!cachedNowListen) {
        setNowListen([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cachedTopTracks = readJsonCache<PulseTrack[]>(TRACK_CACHE_KEYS.Top);
    const cachedNewTracks = readJsonCache<PulseTrack[]>(TRACK_CACHE_KEYS.New);

    let cancelled = false;

    const requests = [
      fetchJsonData<PulseTrack[]>('/api/pulse/getPlaylist.php?gid=Top'),
      fetchJsonData<PulseTrack[]>('/api/pulse/getPlaylist.php?gid=New'),
    ] as const;

    void Promise.allSettled(requests).then(([topResult, newResult]) => {
      if (cancelled) return;

      if (topResult.status === 'fulfilled' && Array.isArray(topResult.value)) {
        writeJsonCache(TRACK_CACHE_KEYS.Top, topResult.value);
        setTopTracks(topResult.value);
      } else if (!cachedTopTracks) {
        setTopTracks([]);
      }

      if (newResult.status === 'fulfilled' && Array.isArray(newResult.value)) {
        writeJsonCache(TRACK_CACHE_KEYS.New, newResult.value);
        setNewTracks(newResult.value);
      } else if (!cachedNewTracks) {
        setNewTracks([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tracksReloadToken]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      return;
    }

    const cachedListened = readListenedCache();
    const cachedYourTracks = readJsonCache<PulseTrack[]>(TRACK_CACHE_KEYS.Your);

    let cancelled = false;

    const requests = [
      fetchJsonData<PulseHomePlaylistCard[] | { error?: boolean; message?: string }>('/api/pulse/pages/home.php?type=listened'),
      fetchJsonData<PulseTrack[]>('/api/pulse/getPlaylist.php?gid=Your'),
    ] as const;

    void Promise.allSettled(requests).then(([listenedResult, yourTracksResult]) => {
      if (cancelled) return;

      if (listenedResult.status === 'fulfilled') {
        if (Array.isArray(listenedResult.value) && listenedResult.value.length > 0) {
          writeListenedCache(listenedResult.value);
          setListened(listenedResult.value);
        } else {
          writeListenedCache('empty');
          setListened('empty');
        }
      } else if (!cachedListened) {
        setListened('empty');
      }

      if (yourTracksResult.status === 'fulfilled' && Array.isArray(yourTracksResult.value)) {
        writeJsonCache(TRACK_CACHE_KEYS.Your, yourTracksResult.value);
        setYourTracks(yourTracksResult.value);
      } else if (!cachedYourTracks) {
        setYourTracks([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, tracksReloadToken]);

  const topCollectionActive = currentCollectionId === 'Top' && isPlaying;
  const newCollectionActive = currentCollectionId === 'New' && isPlaying;
  const yourCollectionActive = currentCollectionId === 'Your' && isPlaying;
  const shouldShowRecentListened = isLoading || isAuthenticated;

  const renderTrackRow = useCallback((collectionId: HomeTrackCollectionId, track: PulseTrack, index: number) => (
    <PulseTrackRow
      currentSongId={currentSongId}
      favoriteIds={favoriteIds}
      isAuthenticated={isAuthenticated}
      key={`${collectionId}-${track.sid ?? index}`}
      onAddToPlaylist={openAddTrackToPlaylist}
      onCopyTrackLink={copyTrackLink}
      onDeleteTrack={openDeleteTrack}
      onEditTrack={openEditTrack}
      onLikeTrack={likeTrack}
      onOpenArtist={openArtistPage}
      onPlayTrack={() => {
        void playGenlist(collectionId, true, 0, index, track.sid);
      }}
      onQueueTrackNext={queueTrackNext}
      track={track}
      trackIndex={index}
      user={user}
      userCountry={userCountry}
    />
  ), [copyTrackLink, currentSongId, favoriteIds, isAuthenticated, likeTrack, openAddTrackToPlaylist, openArtistPage, openDeleteTrack, openEditTrack, playGenlist, queueTrackNext, user, userCountry]);

  const topTitle = useMemo(() => (
    <>
      {lang?.top || 'Топ'} <PulseLogo className="ml-1 inline w-30 align-middle" />
    </>
  ), [lang?.top]);

  const yourTitle = useMemo(() => (
    <>
      {lang?.your || 'Ваш'} <PulseLogo className="ml-1 inline w-30 align-middle" />
    </>
  ), [lang?.your]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-pink-500/25 via-black to-black pb-40 duration-300 lg:from-black lg:pb-28">
      <div className="sticky top-0 z-[99] flex w-full max-w-screen-2xl items-center bg-gradient-to-b from-black via-black/90 to-transparent px-3 pt-3 lg:px-0">
        <button
          type="button"
          onClick={() => router.push('/pulse')}
          className={cn(
            'shrink-0 cursor-pointer duration-300 active:scale-95',
            isSearchFocused ? 'w-0 overflow-hidden opacity-0' : 'w-32 opacity-100 sm:w-48 mr-3',
          )}
          aria-label="Pulse home"
        >
          <PulseLogo className="w-32 sm:w-48" />
        </button>

        <form
          onSubmit={handleSearchSubmit}
          className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 backdrop-blur-md backdrop-saturate-200"
          style={{ zIndex: 11 }}
        >
          <input
            value={searchValue}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(event) => setSearchValue(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            id="SC_INP"
            className="w-full bg-transparent pl-2 text-white placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
            placeholder={lang?.pulse_search || 'Поиск по Pulse'}
            autoComplete="off"
          />
          <button className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-zinc-700 active:scale-95" type="submit">
            <ActionIcon className="h-8 w-8 cursor-pointer" name="IC-search" />
          </button>
        </form>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => openPulseSubpage('/pulse/my')}
            className="ml-3 flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 backdrop-blur-md backdrop-saturate-200 duration-300 hover:bg-zinc-700 active:scale-95"
            aria-label="My Pulse"
          >
            <ActionIcon className="h-8 w-8" name="IC-me" />
          </button>
        ) : null}
      </div>

      {shouldShowRecentListened ? (
        <>
          <SectionTitle>{lang?.recentlis || 'Недавно слушали'}</SectionTitle>

          <div className="grid w-full max-w-screen-2xl grid-cols-2 gap-3 px-3 lg:px-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {isLoading || listened === null ? (
              Array.from({ length: 10 }).map((_, index) => <ListenedPillSkeleton key={index} />)
            ) : null}

            {!isLoading && listened === 'empty' ? (
              <div className="col-span-2 flex w-full flex-col items-center justify-center gap-3 sm:col-span-3 lg:col-span-4 xl:col-span-5">
                <img src={THINKING_IMAGE} alt="Nothing listened yet" className="w-32 opacity-90" />
                <div className="text-center text-zinc-200">Начните уже что-нибудь слушать...</div>
              </div>
            ) : null}

            {!isLoading && Array.isArray(listened) ? listened.map((card) => {
              const cardPlayId = getPlayableCardId(card);
              return (
                <RecentlyListenedPill
                  key={`listened-${card.id ?? card.genlist ?? card.name}`}
                  card={card}
                  isPlaying={Boolean(cardPlayId && currentCollectionId === cardPlayId && isPlaying)}
                  onOpen={() => openPlaylistCard(card)}
                  onPlay={() => playPlaylistCard(card)}
                />
              );
            }) : null}
          </div>
        </>
      ) : null}

      <SectionTitle>
        {lang?.playlistsby || 'Плейлисты от'} <PulseLogo className="ml-1 inline w-30 align-middle" />
      </SectionTitle>

      <div ref={fromPulseScrollRef} className="viewport dragscroll flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 lg:px-0">
        {fromPulse === null ? Array.from({ length: 8 }).map((_, index) => <PlaylistCardSkeleton key={index} />) : null}
        {Array.isArray(fromPulse) ? fromPulse.map((card) => {
          const cardPlayId = getPlayableCardId(card);
          return (
            <PulsePlaylistCard
              key={`from-pulse-${card.id ?? card.genlist ?? card.name}`}
              card={card}
              isPlaying={Boolean(cardPlayId && currentCollectionId === cardPlayId && isPlaying)}
              onOpen={() => openPlaylistCard(card)}
              onPlay={() => playPlaylistCard(card)}
            />
          );
        }) : null}
      </div>

      <SectionTitle>{lang?.artists || 'Артисты'}</SectionTitle>

      <div ref={artistsScrollRef} className="viewport dragscroll -my-3 flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 py-3 lg:px-0">
        {artists === null ? Array.from({ length: 8 }).map((_, index) => <ArtistCardSkeleton key={index} />) : null}
        {Array.isArray(artists) ? artists.map((artist) => (
          <PulseArtistCard
            key={`artist-${artist.id ?? artist.name}`}
            artist={artist}
            onOpen={() => openArtistPage(artist.id ?? 0)}
          />
        )) : null}
      </div>

      <SectionTitle>{lang?.welove || 'Мы любим'}</SectionTitle>

      <div ref={weLikeScrollRef} className="viewport dragscroll flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 lg:px-0">
        {weLike === null ? Array.from({ length: 8 }).map((_, index) => <PlaylistCardSkeleton key={index} />) : null}
        {Array.isArray(weLike) ? weLike.map((card) => {
          const cardPlayId = getPlayableCardId(card);
          return (
            <PulsePlaylistCard
              key={`we-like-${card.id ?? card.genlist ?? card.name}`}
              card={card}
              isPlaying={Boolean(cardPlayId && currentCollectionId === cardPlayId && isPlaying)}
              onOpen={() => openPlaylistCard(card)}
              onPlay={() => playPlaylistCard(card)}
            />
          );
        }) : null}
      </div>

      <SectionTitle>{lang?.nowlis || 'Сейчас слушают'}</SectionTitle>

      <div ref={nowListenScrollRef} className="viewport dragscroll flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 lg:px-0">
        {nowListen === null ? Array.from({ length: 8 }).map((_, index) => <PlaylistCardSkeleton key={index} />) : null}
        {Array.isArray(nowListen) ? nowListen.map((card) => {
          const cardPlayId = getPlayableCardId(card);
          return (
            <PulsePlaylistCard
              key={`now-listen-${card.id ?? card.genlist ?? card.name}`}
              card={card}
              isPlaying={Boolean(cardPlayId && currentCollectionId === cardPlayId && isPlaying)}
              onOpen={() => openPlaylistCard(card)}
              onPlay={() => playPlaylistCard(card)}
            />
          );
        }) : null}
      </div>

      <div className="grid w-full max-w-screen-2xl grid-cols-1 gap-3 xl:grid-cols-3">
        <TrackCollectionPanel
          collectionId="Top"
          currentCollectionId={currentCollectionId}
          isLoading={topTracks === null}
          isPlaying={topCollectionActive}
          onOpenCollection={() => openPulseSubpage('/pulse/playlist/-1')}
          onPlayCollection={() => void playGenlist('Top')}
          onRenderTrack={(track, index) => renderTrackRow('Top', track, index)}
          title={topTitle}
          tracks={topTracks}
        />

        <TrackCollectionPanel
          collectionId="New"
          currentCollectionId={currentCollectionId}
          isLoading={newTracks === null}
          isPlaying={newCollectionActive}
          onOpenCollection={() => openPulseSubpage('/pulse/playlist/-2')}
          onPlayCollection={() => void playGenlist('New')}
          onRenderTrack={(track, index) => renderTrackRow('New', track, index)}
          title={lang?.new || 'Новое'}
          tracks={newTracks}
        />

        {isLoading ? (
          <TrackCollectionPanel
            collectionId="Your"
            currentCollectionId={currentCollectionId}
            isLoading
            isPlaying={yourCollectionActive}
            onOpenCollection={() => undefined}
            onPlayCollection={() => undefined}
            onRenderTrack={(track, index) => renderTrackRow('Your', track, index)}
            title={yourTitle}
            tracks={null}
          />
        ) : null}

        {!isLoading && isAuthenticated ? (
          <TrackCollectionPanel
            collectionId="Your"
            currentCollectionId={currentCollectionId}
            isLoading={yourTracks === null}
            isPlaying={yourCollectionActive}
            onOpenCollection={() => openPulseSubpage('/pulse/playlist/-5')}
            onPlayCollection={() => void playGenlist('Your')}
            onRenderTrack={(track, index) => renderTrackRow('Your', track, index)}
            title={yourTitle}
            tracks={yourTracks}
          />
        ) : null}

        {!isLoading && !isAuthenticated ? (
          <div className="flex flex-col justify-center gap-3 rounded-2xl shadow">
            <div className="flex items-center gap-3 px-3 lg:px-0">
              <span className="w-full flex-grow text-2xl font-black cutetext lg:text-3xl xl:text-4xl">
                {yourTitle}
              </span>
            </div>
            <div className="relative flex h-full min-h-72 flex-col items-center justify-center rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 text-center text-zinc-300 duration-300">
              <div className="relative">
                <div className="absolute -right-24 top-0 flex items-center justify-center rounded-2xl rounded-bl-lg bg-purple-500 p-1 text-xs text-white 2xl:-right-32 2xl:text-base">
                  {lang?.whatareyoulistening || 'Что ты вообще слушаешь?'}
                </div>
                <img src={THINKING_IMAGE} alt="Guest pulse placeholder" className="w-32" />
              </div>
              <span>{guestYourPulseMessage}</span>
            </div>
          </div>
        ) : null}
      </div>

      <PulseLegalFooter />

      <ShareModal
        copyLabel={lang?.copylink || 'Скопировать ссылку'}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onCopied={() => showPulseNote(lang?.linkcopied || 'Ссылка скопирована', 'success', 3)}
        onCopyFailed={() => showPulseNote(shareUrl, 'info', 5)}
        shareUrl={shareUrl}
        title={lang?.share || 'Поделиться'}
      />
      <PulseUploadTrackModal
        isOpen={Boolean(trackToEdit)}
        onClose={closeEditTrack}
        onUploaded={refreshHomeTracksAfterMutation}
        showNote={showPulseNote}
        track={trackToEdit}
      />
      <PulseDeleteTrackModal
        isOpen={Boolean(trackToDelete)}
        onClose={() => setTrackToDelete(null)}
        onDeleted={refreshHomeTracksAfterMutation}
        showNote={showPulseNote}
        track={trackToDelete}
      />
    </div>
  );
}
