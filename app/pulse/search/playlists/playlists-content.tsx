'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { AncialAPI } from '../../../lib/api-v2';
import { readPulseJsonCache, writePulseJsonCache } from '../../pulse-cache';
import { normalizeText, type PulsePlaylistCardData } from '../../pulse-components';
import { PulsePlaylistGridPage } from '../../pulse-playlist-grid-page';

type PulsePlaylistsSearchResponse = {
  playlists?: PulsePlaylistCardData[] | null;
};

function getPulsePlaylistSearchCacheKey(query: string) {
  return `pulse_search_playlists:${encodeURIComponent(query || '__empty__')}`;
}

export default function PulseSearchPlaylistsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = normalizeText(searchParams.get('q'));
  const { lang } = useAuth();

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
      // SWR: гидратация из кэша до ответа API — сеттлер здесь источник правды.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <PulsePlaylistGridPage
      aside={query ? <span className="max-w-xs truncate text-sm text-zinc-400">«{query}»</span> : null}
      emptyDescription={lang?.nopostsdesc || 'Попробуйте другой запрос'}
      emptyTitle={lang?.noposts || 'Ничего не найдено'}
      loading={loading}
      onBack={() => router.push(`/pulse/search?q=${encodeURIComponent(query)}`)}
      playlists={playlists}
      title={lang?.playlists || 'Плейлисты'}
    />
  );
}
