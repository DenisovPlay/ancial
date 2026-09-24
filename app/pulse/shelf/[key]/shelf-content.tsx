'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { AncialAPI } from '../../../lib/api-v2';
import { readPulseJsonCache, writePulseJsonCache } from '../../pulse-cache';
import type { PulsePlaylistCardData, PulseShelf } from '../../pulse-components';
import { getPulseShelfTitle } from '../../playlist/playlist-model';
import { PulsePlaylistGridPage } from '../../pulse-playlist-grid-page';

function getShelfCacheKey(key: string) {
  return `pulse_shelf:${encodeURIComponent(key)}`;
}

/** «Все» у полки главной: все плейлисты полки сеткой. */
export default function PulseShelfContent({ shelfKey }: { shelfKey: string }) {
  const router = useRouter();
  const { lang } = useAuth();
  const [items, setItems] = useState<PulsePlaylistCardData[]>(() => readPulseJsonCache<PulseShelf>(getShelfCacheKey(shelfKey))?.items ?? []);
  const [loading, setLoading] = useState(!items.length);

  useEffect(() => {
    let cancelled = false;
    AncialAPI.pulseGetShelf<PulseShelf | null>(shelfKey)
      .then((shelf) => {
        if (cancelled) return;
        const nextItems = Array.isArray(shelf?.items) ? shelf.items : [];
        writePulseJsonCache(getShelfCacheKey(shelfKey), { items: nextItems, key: shelfKey, total: nextItems.length });
        setItems(nextItems);
      })
      .catch(() => { /* остаёмся на кэше; без него — пустое состояние */ })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shelfKey]);

  return (
    <PulsePlaylistGridPage
      emptyDescription={lang?.pulse_shelf_empty_desc || 'Здесь пока ничего нет — загляните позже'}
      emptyTitle={lang?.pulse_shelf_empty || 'Подборок пока нет'}
      loading={loading}
      onBack={() => router.push('/pulse')}
      playlists={items}
      title={getPulseShelfTitle(shelfKey, lang)}
    />
  );
}
