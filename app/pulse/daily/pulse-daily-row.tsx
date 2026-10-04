'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { AncialAPI } from '../../lib/api-v2';
import { readPulseJsonCache, writePulseJsonCache } from '../pulse-cache';
import { PulsePlaylistTile, PulseScrollSection, PulseSectionTitle } from '../pulse-components';

export interface PulseDailyCard {
  id: number;
  slot: number;
  title_key: string;
  meta?: { mood?: string } | null;
  count: number;
  covers: string[];
}

const CACHE_KEY = 'pulse_home_daily';

/** «Для тебя сегодня»: три подборки дня — обычные плитки плейлистов, обложка — коллаж 2×2. Только для вошедших. */
export default function PulseDailyRow() {
  const router = useRouter();
  const { isAuthenticated, lang } = useAuth();
  const { currentCollectionId, isPlaying, playGenlist } = usePulsePlayer();
  const [cards, setCards] = useState<PulseDailyCard[] | null>(() => readPulseJsonCache<PulseDailyCard[]>(CACHE_KEY));

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void AncialAPI.pulseGetDailyCards<PulseDailyCard[]>()
      .then((result) => {
        if (cancelled) return;
        const next = Array.isArray(result) ? result : [];
        setCards(next);
        writePulseJsonCache(CACHE_KEY, next);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (!isAuthenticated || !cards || cards.length === 0) return null;

  return (
    <>
      <PulseSectionTitle>{lang?.pulse_daily_title || 'Для тебя сегодня'}</PulseSectionTitle>
      <PulseScrollSection>
        {cards.map((card) => {
          const genlist = `Daily_${card.slot}`;
          return (
            <PulsePlaylistTile
              key={card.slot}
              card={{ id: card.id, genlist, type: 4, name: lang?.[card.title_key] || card.title_key, creator: 'Pulse' }}
              covers={card.covers}
              isPlaying={currentCollectionId === genlist && isPlaying}
              onOpen={() => router.push(`/pulse/playlist/${card.id}`)}
              onPlay={() => void playGenlist(genlist)}
            />
          );
        })}
      </PulseScrollSection>
    </>
  );
}
