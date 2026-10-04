'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import BrandLoader from '../../../components/brand-loader';
import ErrorState from '../../../components/error-state';
import Icon from '../../../components/svg-icon';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import { useDislikeActions } from '../../dislikes/use-dislike-actions';
import { reloadPulseDislikes, rememberPulseChoice, usePulseDislikes } from '../../dislikes/use-pulse-dislikes';
import { PulseCoverImage, PULSE_COVER_IMAGE_SIZES } from '../../pulse-image';
import {
  PulseEmptyState,
  PulseLogo,
  decodeHtmlEntities,
  getTrackArtwork,
  type PulseTrack,
} from '../../pulse-components';

interface DislikesPageData {
  tracks?: PulseTrack[];
}

const ACTION_BUTTON = 'shrink-0 cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2 text-sm font-medium text-white duration-300 hover:bg-zinc-700 active:scale-95';

/** Медиатека → «Не интересно»: отмеченные треки и исполнители с кнопкой «Вернуть» и сброс запомненных ответов. */
export default function PulseDislikesContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang } = useAuth();
  const { showNote } = useNotification();
  const state = usePulseDislikes();
  const { unmarkArtist, unmarkTrack } = useDislikeActions();
  const [tracks, setTracks] = useState<PulseTrack[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?backurl=/pulse/library/dislikes');
      return;
    }
    let cancelled = false;
    void AncialAPI.pulseGetDislikes<DislikesPageData>(true)
      .then((result) => {
        if (cancelled) return;
        setTracks(Array.isArray(result?.tracks) ? result.tracks : []);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    void reloadPulseDislikes();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, reloadToken, router]);

  // Снятая отметка убирает строку сразу, без повторного запроса.
  const visibleTracks = (tracks ?? []).filter((track) => state.trackIds.has(Number(track.sid)));
  const hasRemembered = Object.keys(state.remembered).length > 0;

  const resetRemembered = useCallback(async () => {
    await rememberPulseChoice({ dislike_favorite: null, play_disliked: null });
    showNote({ content: lang?.pulse_reset_remembered_done || 'Запомненные ответы сброшены', type: 'success', time: 3 });
  }, [lang, showNote]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-64 duration-300">
      <div className="sticky top-0 z-[101] flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
        <div className="w-full max-w-screen-2xl px-3 lg:px-0">
          <Link
            href="/pulse/library"
            className="flex w-fit cursor-pointer items-center gap-3 duration-300 hover:opacity-80 active:scale-95"
          >
            <Icon name="IC-chevron-left" className="inline h-8 w-8 fill-current" />
            <PulseLogo className="w-32 sm:w-48" />
          </Link>
        </div>
      </div>

      <div className="flex w-full max-w-screen-2xl flex-col gap-3 px-3 lg:px-0">
        <h1 className="text-2xl font-bold text-white">{lang?.pulse_dislikes_library || 'Не интересно'}</h1>

        {failed && tracks === null ? <ErrorState onRetry={() => setReloadToken((token) => token + 1)} variant="block" /> : null}
        {!failed && tracks === null ? <div className="flex justify-center p-6"><BrandLoader /></div> : null}

        {tracks !== null && state.artists.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-zinc-300">{lang?.pulse_dislikes_artists || 'Исполнители'}</h2>
            {state.artists.map((artist) => (
              <div key={artist.key} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
                <span className="min-w-0 flex-grow truncate text-white">{artist.label || artist.key}</span>
                <button type="button" className={ACTION_BUTTON} onClick={() => void unmarkArtist(artist)}>
                  {lang?.pulse_undislike_artist || 'Вернуть исполнителя'}
                </button>
              </div>
            ))}
          </section>
        ) : null}

        {tracks !== null && visibleTracks.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-zinc-300">{lang?.pulse_dislikes_tracks || 'Треки'}</h2>
            {visibleTracks.map((track) => (
              <div key={String(track.sid)} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
                <div className="relative h-14 w-14 shrink-0">
                  <PulseCoverImage
                    alt=""
                    className="rounded-2xl opacity-70"
                    sizes={PULSE_COVER_IMAGE_SIZES.trackRow}
                    src={getTrackArtwork(track)}
                  />
                </div>
                <div className="min-w-0 flex-grow">
                  <span className="block truncate font-medium text-white">{decodeHtmlEntities(track.title) || (lang?.untitled || 'Без названия')}</span>
                  <span className="block truncate text-sm text-zinc-400">{decodeHtmlEntities(track.artist)}</span>
                </div>
                <button type="button" className={ACTION_BUTTON} onClick={() => void unmarkTrack(track)}>
                  {lang?.pulse_undislike || 'Вернуть в рекомендации'}
                </button>
              </div>
            ))}
          </section>
        ) : null}

        {tracks !== null && visibleTracks.length === 0 && state.artists.length === 0 ? (
          <PulseEmptyState description={lang?.pulse_dislikes_empty || 'Здесь пока пусто.'} title={lang?.pulse_dislikes_library || 'Не интересно'} />
        ) : null}

        {hasRemembered ? (
          <button type="button" className={`${ACTION_BUTTON} w-fit`} onClick={() => void resetRemembered()}>
            {lang?.pulse_reset_remembered || 'Сбросить запомненные ответы'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
