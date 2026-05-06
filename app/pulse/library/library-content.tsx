'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { fetchPulseJson } from '../pulse-api';
import { readPulseJsonCache, removePulseCache, writePulseJsonCache } from '../pulse-cache';
import {
  ActionIcon,
  PulseEmptyState,
  PulseLogo,
  PulsePlaylistTile,
  PulsePlaylistTileSkeleton,
  normalizeText,
  type PulsePlaylistCardData,
} from '../pulse-components';

type PulseLibraryResponse = {
  favorite_playlist?: PulsePlaylistCardData | null;
  playlists?: PulsePlaylistCardData[] | null;
};

const LIBRARY_BIG_CACHE_KEY = 'pulse_library_big';

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

export default function PulseLibraryContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang } = useAuth();
  const {
    currentCollectionId,
    isPlaying,
    playGenlist,
    playPlaylist,
  } = usePulsePlayer();
  const [library, setLibrary] = useState<PulseLibraryResponse | null>(() => readPulseJsonCache<PulseLibraryResponse>(LIBRARY_BIG_CACHE_KEY));
  const [loading, setLoading] = useState(!library);

  const libraryItems = useMemo(() => getLibraryItems(library), [library]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/login?backurl=/pulse/');
      return;
    }

    let cancelled = false;

    void fetchPulseJson<PulseLibraryResponse>('/api/pulse/pages/my.php?type=1&view=library')
      .then((result) => {
        if (cancelled) return;

        const nextItems = getLibraryItems(result);
        if (nextItems.length) {
          writePulseJsonCache(LIBRARY_BIG_CACHE_KEY, result);
          setLibrary(result);
        } else {
          removePulseCache(LIBRARY_BIG_CACHE_KEY);
          setLibrary(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          removePulseCache(LIBRARY_BIG_CACHE_KEY);
          setLibrary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-64 duration-300">
      <div className="sticky top-0 z-[101] flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
        <div className="w-full max-w-screen-2xl px-3 lg:px-0">
          <button
            type="button"
            onClick={() => router.push('/pulse/my')}
            className="flex w-fit cursor-pointer items-center gap-3 duration-300 hover:opacity-80 active:scale-95"
          >
            <ActionIcon className="h-8 w-8" name="IC-chevron-left" />
            <PulseLogo className="w-32 sm:w-48" />
          </button>
        </div>
      </div>

      <div className="grid w-full max-w-screen-2xl grid-cols-2 gap-3 overflow-x-hidden px-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 lg:px-0">
        {loading && !libraryItems.length ? Array.from({ length: 6 }).map((_, index) => <PulsePlaylistTileSkeleton key={index} variant="big" />) : null}

        {libraryItems.map((card) => {
          const playableId = getCardPlayableId(card);
          return (
            <PulsePlaylistTile
              card={card}
              isPlaying={Boolean(playableId && currentCollectionId === playableId && isPlaying)}
              key={`library-${card.id ?? card.genlist ?? card.name}`}
              onOpen={() => openPlaylistCard(card)}
              onPlay={() => playPlaylistCard(card)}
              variant="big"
            />
          );
        })}
      </div>

      {!loading && !libraryItems.length ? (
        <PulseEmptyState
          description={lang?.nopostsdesc || 'Здесь пока ничего нет'}
          title={lang?.emptytopic || 'Пусто'}
        />
      ) : null}
    </div>
  );
}
