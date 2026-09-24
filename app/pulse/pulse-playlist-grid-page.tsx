'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../context/AuthContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import {
  getPulseBackgroundColorByMood,
  normalizeText,
  PulseEmptyState,
  PulseLogo,
  PulsePlaylistTile,
  PulsePlaylistTileSkeleton,
  type PulsePlaylistCardData,
} from './pulse-components';
import Icon from '../components/svg-icon';

const GRID_CLASS = 'grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 lg:grid-cols-4 lg:px-0';

function isGenlistCard(card: PulsePlaylistCardData) {
  return String(card.type ?? '') === '4';
}

function getPlayableId(card: PulsePlaylistCardData) {
  return isGenlistCard(card) ? normalizeText(card.genlist) : normalizeText(String(card.id ?? ''));
}

/**
 * Страница «все плейлисты» сеткой: «Все» в поиске и у полок главной.
 * Данные грузит страница; здесь — шапка, сетка, скелетон, пустое состояние, открытие и запуск.
 */
export function PulsePlaylistGridPage({
  aside,
  emptyDescription,
  emptyTitle,
  loading,
  onBack,
  playlists,
  title,
}: {
  /** Справа в шапке — например, поисковый запрос. */
  aside?: ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  loading: boolean;
  onBack: () => void;
  playlists: PulsePlaylistCardData[];
  title: ReactNode;
}) {
  const router = useRouter();
  const { lang } = useAuth();
  const { currentCollectionId, currentTrackObj, isPlaying, playGenlist, playPlaylist } = usePulsePlayer();

  const playCard = (card: PulsePlaylistCardData) => {
    const playableId = getPlayableId(card);
    if (!playableId) return;
    if (isGenlistCard(card)) void playGenlist(playableId);
    else void playPlaylist(playableId);
  };

  const openCard = (card: PulsePlaylistCardData) => {
    router.push(`/pulse/playlist/${encodeURIComponent(normalizeText(String(card.id ?? '0')) || '0')}`);
  };

  return (
    <div
      className={`relative isolate flex flex-col items-center justify-center gap-3 pb-64 transition-colors duration-1000 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-transparent before:via-black before:to-black lg:before:from-black ${getPulseBackgroundColorByMood(currentTrackObj?.mood)}`}
    >
      <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
        <div className="flex w-full max-w-screen-2xl items-center gap-3 px-3 lg:px-0">
          <button
            type="button"
            onClick={onBack}
            aria-label={lang?.back || 'Назад'}
            className="flex w-fit cursor-pointer items-center gap-3 duration-300 hover:opacity-80 active:scale-95"
          >
            <Icon name="IC-chevron-left" className="inline fill-current h-8 w-8" />
            <PulseLogo className="w-32 md:w-48" />
          </button>
          <div className="flex-grow" />
          {aside}
        </div>
      </div>

      <div className="relative flex w-full max-w-screen-2xl flex-col gap-3" style={{ zIndex: 19 }}>
        <span className="cutetext px-3 text-2xl font-black lg:px-0 lg:text-3xl xl:text-4xl">
          {title}
        </span>

        {loading && !playlists.length ? (
          <div className={GRID_CLASS}>
            {Array.from({ length: 8 }).map((_, index) => (
              <PulsePlaylistTileSkeleton key={index} variant="big" />
            ))}
          </div>
        ) : null}

        {playlists.length ? (
          <div className={GRID_CLASS}>
            {playlists.map((card) => {
              const playableId = getPlayableId(card);
              return (
                <PulsePlaylistTile
                  card={card}
                  isPlaying={Boolean(playableId && currentCollectionId === playableId && isPlaying)}
                  key={`playlist-grid-${card.id ?? card.genlist ?? card.name}`}
                  onOpen={() => openCard(card)}
                  onPlay={() => playCard(card)}
                  variant="big"
                />
              );
            })}
          </div>
        ) : null}

        {!loading && !playlists.length ? (
          <PulseEmptyState description={emptyDescription} title={emptyTitle} />
        ) : null}
      </div>
    </div>
  );
}
