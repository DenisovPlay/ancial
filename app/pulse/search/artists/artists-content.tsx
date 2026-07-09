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
  PulseArtistTile,
  PulseArtistTileSkeleton,
  PulseEmptyState,
  PulseLogo,
  normalizeText,
  type PulseArtistCardData,
} from '../../pulse-components';

type PulseArtistsSearchResponse = {
  artists?: PulseArtistCardData[] | null;
};

function getPulseArtistSearchCacheKey(query: string) {
  return `pulse_search_artists:${encodeURIComponent(query || '__empty__')}`;
}

export default function PulseSearchArtistsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = normalizeText(searchParams.get('q'));
  const { lang } = useAuth();
  const { currentTrackObj } = usePulsePlayer();

  const [artists, setArtists] = useState<PulseArtistCardData[]>(() => {
    const cached = readPulseJsonCache<PulseArtistsSearchResponse>(getPulseArtistSearchCacheKey(query));
    return Array.isArray(cached?.artists) ? cached.artists : [];
  });
  const [loading, setLoading] = useState(!artists.length);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = getPulseArtistSearchCacheKey(query);
    const cached = readPulseJsonCache<PulseArtistsSearchResponse>(cacheKey);

    if (cached && Array.isArray(cached.artists)) {
      setArtists(cached.artists);
      setLoading(false);
    } else {
      setArtists([]);
      setLoading(true);
    }

    AncialAPI.pulseSearch<PulseArtistsSearchResponse>(query, 'artists')
      .then((result) => {
        if (cancelled) return;
        const nextArtists = Array.isArray(result.artists) ? result.artists : [];
        writePulseJsonCache(cacheKey, { artists: nextArtists });
        setArtists(nextArtists);
      })
      .catch(() => {
        if (!cancelled && !cached?.artists?.length) setArtists([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

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
          {lang?.artists || 'Артисты'}
        </span>

        {/* Skeleton */}
        {loading && !artists.length ? (
          <div className="grid grid-cols-3 gap-3 px-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 lg:px-0">
            {Array.from({ length: 12 }).map((_, index) => (
              <PulseArtistTileSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {/* Artists grid */}
        {artists.length ? (
          <div className="grid grid-cols-3 gap-3 px-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 lg:px-0">
            {artists.map((artist) => (
              <PulseArtistTile
                artist={artist}
                key={`search-all-artist-${artist.id ?? artist.name}`}
                onOpen={() =>
                  router.push(
                    `/pulse/artist/${encodeURIComponent(normalizeText(String(artist.id ?? '0')) || '0')}`,
                  )
                }
              />
            ))}
          </div>
        ) : null}

        {/* Empty state */}
        {!loading && !artists.length ? (
          <PulseEmptyState
            description={lang?.nopostsdesc || 'Попробуйте другой запрос'}
            title={lang?.noposts || 'Ничего не найдено'}
          />
        ) : null}
      </div>
    </div>
  );
}
