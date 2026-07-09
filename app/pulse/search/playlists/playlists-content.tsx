'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { usePulsePlayer } from '../../../context/PulsePlayerContext';
import { AncialAPI } from '../../../lib/api-v2';
import { readPulseJsonCache, writePulseJsonCache } from '../../pulse-cache';
import {
  ActionIcon,
  getPulseBackgroundColorByMood,
  PulseEmptyState,
  PulseLogo,
  PulsePlaylistTile,
  PulsePlaylistTileSkeleton,
  normalizeText,
  type PulsePlaylistCardData,
} from '../../pulse-components';

type PulsePlaylistsSearchResponse = {
  playlists?: PulsePlaylistCardData[] | null;
};

function isGenlistPlaylist(card: PulsePlaylistCardData) {
  return String(card.type ?? '') === '4';
}

function getCardPlayableId(card: PulsePlaylistCardData) {
  return isGenlistPlaylist(card)
    ? normalizeText(card.genlist)
    : normalizeText(String(card.id ?? ''));
}

function getPulsePlaylistSearchCacheKey(query: string) {
  return `pulse_search_playlists:${encodeURIComponent(query || '__empty__')}`;
}

export default function PulseSearchPlaylistsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = normalizeText(searchParams.get('q'));
  const { lang } = useAuth();
  const { currentCollectionId, currentTrackObj, isPlaying, playGenlist, playPlaylist } = usePulsePlayer();

  const [playlists, setPlaylists] = useState<PulsePlaylistCardData[]>(() => {
    const cached = readPulseJsonCache<PulsePlaylistsSearchResponse>(getPulsePlaylistSearchCacheKey(query));
    return Array.isArray(cached?.playlists) ? cached.playlists : [];
  });
  const [loading, setLoading] = useState(!playlists.length);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = getPulsePlaylistSearchCacheKey(query);
    const cached = readPulseJsonCache<PulsePlaylistsSearchResponse>(cacheKey);

    if (cached && Array.isArray(cached.playlists)) {
      setPlaylists(cached.playlists);
      setLoading(false);
    } else {
      setPlaylists([]);
      setLoading(true);
    }

    AncialAPI.pulseSearch<PulsePlaylistsSearchResponse>(query, 'playlists')
      .then((result) => {
        if (cancelled) return;
        const nextPlaylists = Array.isArray(result.playlists) ? result.playlists : [];
        writePulseJsonCache(cacheKey, { playlists: nextPlaylists });
        setPlaylists(nextPlaylists);
      })
      .catch(() => {
        if (!cancelled && !cached?.playlists?.length) setPlaylists([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

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

  const goBack = useCallback(() => {
    router.push(`/pulse/search?q=${encodeURIComponent(query)}`);
  }, [router, query]);

  return (
    <div
      className={`relative isolate flex flex-col items-center justify-center gap-3 pb-64 transition-colors duration-1000 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-transparent before:via-black before:to-black lg:before:from-black ${getPulseBackgroundColorByMood(currentTrackObj?.mood)}`}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
        <div className="flex w-full max-w-screen-2xl items-center gap-3 px-3 lg:px-0">
          <button
            type="button"
            onClick={goBack}
            className="flex w-fit cursor-pointer items-center gap-3 duration-300 hover:opacity-80 active:scale-95"
          >
            <ActionIcon className="h-8 w-8" name="IC-chevron-left" />
            <PulseLogo className="w-32 md:w-48" />
          </button>
          <div className="flex-grow" />
          {query ? (
            <span className="truncate text-sm text-zinc-400 max-w-xs">
              «{query}»
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative flex w-full max-w-screen-2xl flex-col gap-3" style={{ zIndex: 19 }}>
        {/* Section title */}
        <span className="cutetext px-3 text-2xl font-black lg:px-0 lg:text-3xl xl:text-4xl">
          {lang?.playlists || 'Плейлисты'}
        </span>

        {/* Skeleton */}
        {loading && !playlists.length ? (
          <div className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 lg:px-0">
            {Array.from({ length: 8 }).map((_, index) => (
              <PulsePlaylistTileSkeleton key={index} variant="big" />
            ))}
          </div>
        ) : null}

        {/* Playlists grid */}
        {playlists.length ? (
          <div className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 lg:px-0">
            {playlists.map((card) => {
              const playableId = getCardPlayableId(card);
              return (
                <PulsePlaylistTile
                  card={card}
                  isPlaying={Boolean(playableId && currentCollectionId === playableId && isPlaying)}
                  key={`search-all-playlist-${card.id ?? card.genlist ?? card.name}`}
                  onOpen={() => openPlaylistCard(card)}
                  onPlay={() => playPlaylistCard(card)}
                  variant="big"
                />
              );
            })}
          </div>
        ) : null}

        {/* Empty state */}
        {!loading && !playlists.length ? (
          <PulseEmptyState
            description={lang?.nopostsdesc || 'Попробуйте другой запрос'}
            title={lang?.noposts || 'Ничего не найдено'}
          />
        ) : null}
      </div>
    </div>
  );
}
