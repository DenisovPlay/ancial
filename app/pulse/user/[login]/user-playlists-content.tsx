'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { AncialAPI } from '../../../lib/api-v2';
import { readPulseJsonCache, writePulseJsonCache } from '../../pulse-cache';
import type { PulsePlaylistCardData } from '../../pulse-components';
import { PulsePlaylistGridPage } from '../../pulse-playlist-grid-page';

interface UserPlaylistsResponse {
  playlists?: PulsePlaylistCardData[];
  total?: number;
  user?: { id: number; login: string; name: string };
}

const cacheKey = (login: string) => `pulse_user_playlists:${encodeURIComponent(login)}`;

/** «Плейлисты пользователя»: публичные плейлисты сеткой (из блока на странице профиля). */
export default function PulseUserPlaylistsContent({ login }: { login: string }) {
  const router = useRouter();
  const { lang } = useAuth();
  const [data, setData] = useState<UserPlaylistsResponse | null>(() => readPulseJsonCache<UserPlaylistsResponse>(cacheKey(login)));
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    let cancelled = false;
    AncialAPI.pulseGetUserPlaylists<UserPlaylistsResponse>(login)
      .then((response) => {
        if (cancelled) return;
        writePulseJsonCache(cacheKey(login), response);
        setData(response);
      })
      .catch(() => { /* остаёмся на кэше; без него — пустое состояние */ })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [login]);

  const name = data?.user?.name || login;
  return (
    <PulsePlaylistGridPage
      emptyDescription={lang?.pulse_user_playlists_empty_desc || 'Публичных плейлистов пока нет'}
      emptyTitle={lang?.pulse_user_playlists_empty || 'Плейлистов нет'}
      loading={loading}
      onBack={() => router.back()}
      playlists={data?.playlists ?? []}
      title={`${lang?.pulse_user_playlists_of || 'Плейлисты'}: ${name}`}
    />
  );
}
