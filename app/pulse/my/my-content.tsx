'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { authFetch } from '../../lib/auth-fetch';
import { fetchPulseJson } from '../pulse-api';
import { readPulseJsonCache, removePulseCache, writePulseJsonCache } from '../pulse-cache';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import {
  ActionIcon,
  DEFAULT_TRACK_IMAGE,
  PulseLogo,
  PulsePlaylistTile,
  PulsePlaylistTileSkeleton,
  cn,
  decodeHtmlEntities,
  getImageUrl,
  normalizeText,
  toNumber,
  type PulsePlaylistCardData,
} from '../pulse-components';

type PulseLibraryResponse = {
  favorite_playlist?: PulsePlaylistCardData | null;
  playlists?: PulsePlaylistCardData[] | null;
};

type PulseHistoryItem = {
  HTYPE?: number | string | null;
  artist?: string | null;
  date?: string | null;
  explicit?: boolean | number | string | null;
  id?: number | string | null;
  img?: string | null;
  name?: string | null;
};

type PulseHistoryResponse = {
  history?: PulseHistoryItem[] | null;
};

const LIBRARY_CACHE_KEY = 'pulse_library';
const HISTORY_CACHE_KEY = 'pulse_history';

function getLibraryItems(data: PulseLibraryResponse | null) {
  const items: PulsePlaylistCardData[] = [];

  if (data?.favorite_playlist) {
    items.push(data.favorite_playlist);
  }

  if (Array.isArray(data?.playlists)) {
    items.push(...data.playlists);
  }

  return items;
}

function isGenlistPlaylist(card: PulsePlaylistCardData) {
  return String(card.type ?? '') === '4';
}

function getCardPlayableId(card: PulsePlaylistCardData) {
  return isGenlistPlaylist(card)
    ? normalizeText(card.genlist)
    : normalizeText(String(card.id ?? ''));
}

function PulseHistoryRow({
  item,
  onOpenPlaylist,
  onPlayTrack,
}: {
  item: PulseHistoryItem;
  onOpenPlaylist: () => void;
  onPlayTrack: () => void;
}) {
  const isTrack = String(item.HTYPE ?? '') === '1';
  const imageUrl = getImageUrl(item.img, DEFAULT_TRACK_IMAGE);
  const title = decodeHtmlEntities(item.name) || 'Без названия';
  const artist = decodeHtmlEntities(item.artist) || 'Pulse';
  const explicit = item.explicit === true || String(item.explicit ?? '') === '1';

  return (
    <button
      type="button"
      onClick={isTrack ? onPlayTrack : onOpenPlaylist}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl text-left duration-300 hover:bg-zinc-800 hover:pr-3 active:scale-[0.99]"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
        <PulseCoverImage
          alt={title}
          sizes={PULSE_COVER_IMAGE_SIZES.trackRow}
          src={imageUrl}
        />
      </div>
      <div className="min-w-0 flex-grow">
        <span className="flex items-center gap-3 truncate text-sm font-medium text-white md:text-base lg:text-lg">
          <span className="truncate">{title}</span>
          {explicit ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-3xl bg-zinc-800/60 p-1 text-xs text-white">
              E
            </span>
          ) : null}
        </span>
        <span className="block truncate text-xs text-zinc-300 lg:text-sm">{artist}</span>
      </div>
      <span className="shrink-0 text-sm text-zinc-300 duration-300 group-hover:pr-3">
        {decodeHtmlEntities(item.date)}
      </span>
    </button>
  );
}

export default function PulseMyContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();
  const {
    currentCollectionId,
    isPlaying,
    playGenlist,
    playPlaylist,
    playTrack,
  } = usePulsePlayer();

  const [library, setLibrary] = useState<PulseLibraryResponse | null>(() => readPulseJsonCache<PulseLibraryResponse>(LIBRARY_CACHE_KEY));
  const [history, setHistory] = useState<PulseHistoryItem[] | null>(() => readPulseJsonCache<PulseHistoryResponse>(HISTORY_CACHE_KEY)?.history ?? null);
  const [libraryLoading, setLibraryLoading] = useState(!library);
  const [historyLoading, setHistoryLoading] = useState(!history);

  const libraryItems = useMemo(() => getLibraryItems(library), [library]);

  const showPulseNote = useCallback((content: string, type: 'error' | 'info' | 'success' = 'info') => {
    showNote({ content, time: 4, type });
  }, [showNote]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/login?backurl=/pulse/');
      return;
    }

    let cancelled = false;

    void fetchPulseJson<PulseLibraryResponse>('/api/pulse/pages/my.php?type=1')
      .then((result) => {
        if (cancelled) return;

        const nextItems = getLibraryItems(result);
        if (nextItems.length) {
          writePulseJsonCache(LIBRARY_CACHE_KEY, result);
          setLibrary(result);
        } else {
          removePulseCache(LIBRARY_CACHE_KEY);
          setLibrary(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          removePulseCache(LIBRARY_CACHE_KEY);
          setLibrary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });

    void fetchPulseJson<PulseHistoryResponse>('/api/pulse/pages/my.php?type=2')
      .then((result) => {
        if (cancelled) return;

        const nextHistory = Array.isArray(result.history) ? result.history : [];
        if (nextHistory.length) {
          writePulseJsonCache(HISTORY_CACHE_KEY, { history: nextHistory });
          setHistory(nextHistory);
        } else {
          removePulseCache(HISTORY_CACHE_KEY);
          setHistory([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          removePulseCache(HISTORY_CACHE_KEY);
          setHistory([]);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, router]);

  const playPlaylistCard = useCallback((card: PulsePlaylistCardData) => {
    const playableId = getCardPlayableId(card);
    if (!playableId) return;

    if (isGenlistPlaylist(card)) {
      void playGenlist(playableId);
      return;
    }

    void playPlaylist(playableId);
  }, [playGenlist, playPlaylist]);

  const openPlaylistCard = useCallback((card: PulsePlaylistCardData) => {
    const id = normalizeText(String(card.id ?? '0')) || '0';
    router.push(`/pulse/playlist/${encodeURIComponent(id)}`);
  }, [router]);

  const deleteHistory = useCallback(async () => {
    try {
      const response = await authFetch('/api/pulse/delete_history.php');
      const result = normalizeText(await response.text());

      if (result === 'CL') {
        removePulseCache(HISTORY_CACHE_KEY);
        setHistory([]);
        showPulseNote('История очищена!', 'success');
      }
    } catch {
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    }
  }, [lang?.pulse_error_happened, showPulseNote]);

  const isEmpty = !libraryLoading && !historyLoading && !libraryItems.length && !history?.length;

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-64 duration-300">
      <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
        <div className="flex w-full max-w-screen-2xl items-center px-3 lg:px-0">
          <button
            type="button"
            onClick={() => router.push('/pulse')}
            className="flex w-fit cursor-pointer items-center gap-3 duration-300 hover:opacity-80 active:scale-95"
          >
            <ActionIcon className="h-8 w-8" name="IC-chevron-left" />
            <PulseLogo className="w-32 sm:w-48" />
          </button>
          <div className="flex-grow" />
          <button
            type="button"
            onClick={() => router.push('/pulse/create/')}
            className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-900/20 p-1 duration-300 hover:bg-zinc-700 active:scale-95"
            aria-label="Pulse Creators"
          >
            <PulseCreatorsLogo />
          </button>
        </div>
      </div>

      <div className="flex w-full max-w-screen-2xl flex-col gap-3">
        <div className="flex flex-col items-center justify-center gap-3 px-3 duration-300 lg:flex-row lg:justify-start lg:px-0" style={{ zIndex: 10 }}>
          <div className="relative flex h-48 w-48 shrink-0 rounded-full border border-zinc-600/30 shadow lg:h-64 lg:w-64">
            {user?.img ? (
              <>
                <img className="h-48 w-48 rounded-full object-cover blur-xl lg:h-64 lg:w-64" src={user.img} alt="" />
                <img className="absolute inset-x-0 z-[9] h-48 w-48 rounded-full object-cover lg:h-64 lg:w-64" src={user.img} alt={decodeHtmlEntities(`${user?.fname ?? ''} ${user?.lname ?? ''}`)} />
              </>
            ) : (
              <>
                <div className="h-48 w-48 animate-pulse rounded-full bg-zinc-800 blur-xl lg:h-64 lg:w-64" />
                <div className="absolute inset-x-0 z-[9] h-48 w-48 animate-pulse rounded-full bg-zinc-800 lg:h-64 lg:w-64" />
              </>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 text-center lg:text-left">
              <span className="text-2xl font-bold text-zinc-100 md:text-4xl lg:text-7xl">
                {decodeHtmlEntities(`${user?.fname ?? ''} ${user?.lname ?? ''}`) || user?.username || 'Pulse'}
              </span>
              <span className="text-base text-zinc-300 md:text-lg lg:text-xl">{lang?.myuserhello || 'Рады видеть вас снова'}</span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className={cn('flex w-full items-center justify-center gap-3 px-3 lg:px-0', !libraryItems.length && !libraryLoading && 'hidden')}>
            <span className="cutetext flex-grow text-2xl font-black lg:text-3xl xl:text-4xl">{lang?.mylibrary || 'Моя библиотека'}</span>
            <button
              type="button"
              onClick={() => router.push('/pulse/library')}
              className="flex shrink-0 cursor-pointer items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/20 px-3 py-1.5 text-zinc-300 shadow duration-300 hover:bg-zinc-700 hover:text-white active:scale-95"
            >
              <ActionIcon className="h-5 w-5" name="IC-chevron-right" />
              <span>{lang?.all || 'Все'}</span>
            </button>
          </div>

          <div className={cn('viewport dragscroll flex overflow-auto px-3 lg:px-0', !libraryItems.length && !libraryLoading && 'hidden')}>
            <div className="flex flex-row flex-nowrap gap-3">
              {libraryLoading && !libraryItems.length ? Array.from({ length: 6 }).map((_, index) => <PulsePlaylistTileSkeleton key={index} />) : null}
              {libraryItems.map((card) => {
                const playableId = getCardPlayableId(card);
                return (
                  <PulsePlaylistTile
                    card={card}
                    isPlaying={Boolean(playableId && currentCollectionId === playableId && isPlaying)}
                    key={`my-library-${card.id ?? card.genlist ?? card.name}`}
                    onOpen={() => openPlaylistCard(card)}
                    onPlay={() => playPlaylistCard(card)}
                  />
                );
              })}
            </div>
          </div>

          <div className={cn('flex w-full items-center justify-center gap-3 px-3 lg:px-0', !history?.length && !historyLoading && 'hidden')}>
            <span className="cutetext flex-grow text-2xl font-black lg:text-3xl xl:text-4xl">{lang?.mylistened || 'Вы слушали'}</span>
            <button
              type="button"
              onClick={() => void deleteHistory()}
              className="flex shrink-0 cursor-pointer items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/20 px-3 py-1.5 text-zinc-300 shadow duration-300 hover:bg-zinc-700 hover:text-white active:scale-95"
            >
              {lang?.clear || 'Очистить'}
            </button>
          </div>

          <div className={cn('flex h-full w-full flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 duration-300', !history?.length && !historyLoading && 'hidden')}>
            {historyLoading && !history?.length ? (
              <div className="flex flex-col gap-3 animate-pulse">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl">
                    <div className="h-16 w-16 shrink-0 rounded-2xl bg-zinc-800" />
                    <div className="flex flex-grow flex-col gap-2">
                      <div className="h-4 w-2/3 rounded-full bg-zinc-800" />
                      <div className="h-3 w-1/3 rounded-full bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {history?.length ? (
              <div className={cn('flex flex-col gap-3', historyLoading && 'opacity-70')}>
                {history.map((item, index) => (
                  <PulseHistoryRow
                    item={item}
                    key={`history-${item.HTYPE}-${item.id}-${index}`}
                    onOpenPlaylist={() => router.push(`/pulse/playlist/${encodeURIComponent(normalizeText(String(item.id ?? '0')) || '0')}`)}
                    onPlayTrack={() => {
                      const trackId = toNumber(item.id);
                      if (!trackId) {
                        showPulseNote('Неизвестная песня...', 'error');
                        return;
                      }
                      void playTrack(trackId);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {isEmpty ? (
            <div className="flex w-full flex-col items-center justify-center gap-1 text-center">
              <PulseLogo className="w-48" />
              <span className="text-xl text-zinc-300">{lang?.emptytopic || 'Пусто'}</span>
              <span className="text-lg text-zinc-500">{lang?.nopostsdesc || 'Здесь пока ничего нет'}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PulseCreatorsLogo() {
  return (
    <img src="/img/logos/creators.svg" alt="Pulse Creators Logo" className={cn('h-6 lg:h-8')} />
  );
}
