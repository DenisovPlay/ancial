'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { fetchPulseJson } from '../pulse-api';
import { readPulseJsonCache, removePulseCache, writePulseJsonCache } from '../pulse-cache';
import {
  PulseEmptyState,
  PulseLegalFooter,
  PulsePageHeader,
  PulsePlaylistTile,
  PulsePlaylistTileSkeleton,
  PulseSectionTitle,
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
      router.replace('/login?backurl=/pulse/library');
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
    <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-pink-500/25 via-black to-black pb-40 duration-300 lg:from-black lg:pb-64">
      <PulsePageHeader onBack={() => router.push('/pulse')} />
      <PulseSectionTitle>{lang?.library || 'Библиотека'}</PulseSectionTitle>

      <div className="grid w-full max-w-screen-2xl grid-cols-2 gap-3 px-3 sm:grid-cols-3 lg:grid-cols-4 lg:px-0 xl:grid-cols-5">
        {loading && !libraryItems.length ? Array.from({ length: 10 }).map((_, index) => <PulsePlaylistTileSkeleton key={index} variant="big" />) : null}

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
          description={lang?.nopostsdesc || 'Создайте плейлист или добавьте треки в Избранное'}
          title={lang?.emptytopic || 'Пусто'}
        />
      ) : null}

      <PulseLegalFooter className="mt-3" />
    </div>
  );
}
