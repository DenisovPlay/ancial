'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Movie } from '../../types';
import { fetchCinemaVideoById } from '../../cinema-api';
import { useTvNavigation } from '../../use-tv-navigation';
import { FrameBrandLoader } from '../../components/cinema-skeleton';

interface WatchContentProps {
  id: string;
}

export default function WatchContent({ id }: WatchContentProps) {
  useTvNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const translation = searchParams.get('translation');

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [currentSeason, setCurrentSeason] = useState<number>(season ? Number(season) : 1);

  useEffect(() => {
    let isMounted = true;
    async function loadWatchMovie() {
      setIsLoading(true);
      const target = await fetchCinemaVideoById(id);
      if (isMounted) {
        setMovie(target);
        setIsLoading(false);

        // Update watch history & progress
        if (target) {
          try {
            const progressObj = {
              season: season ? Number(season) : 1,
              episode: episode ? Number(episode) : 1,
              translationId: translation ? Number(translation) : null,
              updatedAt: Date.now(),
            };
            localStorage.setItem(`cinema_progress_${target.id}`, JSON.stringify(progressObj));

            const historyRaw = localStorage.getItem('cinema_watch_history');
            const history: any[] = historyRaw ? JSON.parse(historyRaw) : [];
            const filtered = history.filter((h: any) => String(h.id) !== String(target.id));
            filtered.unshift({
              id: target.id,
              title: target.title,
              posterUrl: target.posterUrl,
              type: target.type,
              season: season ? Number(season) : 1,
              episode: episode ? Number(episode) : 1,
              timestamp: Date.now(),
            });
            localStorage.setItem('cinema_watch_history', JSON.stringify(filtered.slice(0, 50)));
          } catch (e) { }
        }
      }
    }
    loadWatchMovie();

    return () => {
      isMounted = false;
    };
  }, [id, season, episode, translation]);

  // Sync currentSeason when season searchParam changes
  useEffect(() => {
    if (season) setCurrentSeason(Number(season));
  }, [season]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center">
        <FrameBrandLoader />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Видео не найдено</h2>
        <button
          onClick={() => router.push('/cinema')}
          className="px-6 py-2 rounded-full bg-white text-black font-bold"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  const availableSeasonsCount = movie.counters?.seasons || (movie.episodesBySeason ? Object.keys(movie.episodesBySeason).length : 0);
  const isSeriesOrAnime = movie.type === 'series' || availableSeasonsCount > 0;

  const activeSeason = season ? Number(season) : 1;
  const activeEpisode = episode ? Number(episode) : 1;
  const activeTranslation = translation ? Number(translation) : (movie.translationsList?.[0]?.id || null);

  const currentSeasonEpisodes = isSeriesOrAnime
    ? (movie.episodesBySeason && movie.episodesBySeason[currentSeason]) ||
    Array.from({ length: movie.counters?.episodes || 12 }, (_, i) => i + 1)
    : [];

  const handleSelectEpisode = (sNum: number, epNum: number, transId?: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', String(sNum));
    params.set('episode', String(epNum));
    if (transId) params.set('translation', String(transId));
    router.replace(`/cinema/watch/${movie.id}?${params.toString()}`);
    setShowPicker(false);
  };

  const handleSelectTranslation = (transId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('translation', String(transId));
    router.replace(`/cinema/watch/${movie.id}?${params.toString()}`);
  };

  // Build iframe URL according to FlixCDN Iframe documentation
  const baseUrl = `https://tarantino.factorios.live/show/kinopoisk/${movie.id}`;
  const iframeParams = new URLSearchParams();
  if (season) iframeParams.set('season', season);
  if (episode) iframeParams.set('episode', episode);
  if (translation) iframeParams.set('translation', translation);

  // Hide duplicate iframe controls & sharing since Ancial UI handles them natively
  iframeParams.set('no_control_translations', '1');
  iframeParams.set('no_control_seasons', '1');
  iframeParams.set('no_control_episodes', '1');
  iframeParams.set('no_sharing', '1');

  const iframeSrc = `${baseUrl}?${iframeParams.toString()}`;

  return (
    <div className="relative w-screen h-[100dvh] bg-black overflow-hidden select-none">
      {/* TOP CONTROLS BAR: BACK BUTTON & EPISODE PICKER TOGGLE */}
      <div className="absolute top-3 left-3 right-3 z-50 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          tabIndex={0}
          className="focusable-tv pointer-events-auto p-2 flex items-center justify-center rounded-full cursor-pointer active:scale-95 duration-300 bg-black/60 hover:bg-black/90 border border-white/20 backdrop-blur-md h-11 w-11 shadow-2xl outline-none focus:outline-none focus:ring-4 focus:ring-white"
        >
          <svg className="w-5 h-5 stroke-white fill-none stroke-[2.5]" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {isSeriesOrAnime && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            tabIndex={0}
            className="focusable-tv pointer-events-auto px-4 py-2 flex items-center gap-2 rounded-full cursor-pointer active:scale-95 duration-300 bg-black/60 hover:bg-black/90 border border-white/20 backdrop-blur-md text-white font-bold text-xs shadow-2xl outline-none focus:outline-none focus:ring-4 focus:ring-white"
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>С{activeSeason} Е{activeEpisode} (Выбор серии)</span>
          </button>
        )}
      </div>

      {/* OVERLAY EPISODES & SEASONS PICKER MODAL */}
      {showPicker && isSeriesOrAnime && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-2xl flex flex-col p-4 lg:p-8 space-y-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white">{movie.title}</h2>
              <p className="text-xs text-zinc-400">Сезон {activeSeason}, Серия {activeEpisode}</p>
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              Закрыть ✕
            </button>
          </div>

          {/* SEASONS */}
          {availableSeasonsCount > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 block">Сезон:</span>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
                {Array.from({ length: availableSeasonsCount }, (_, i) => i + 1).map((sNum) => (
                  <button
                    key={sNum}
                    onClick={() => setCurrentSeason(sNum)}
                    className={`px-5 py-2 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer ${currentSeason === sNum
                        ? 'bg-white text-black shadow-lg'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                  >
                    Сезон {sNum}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* EPISODES GRID */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-400 block">Серии сезона {currentSeason}:</span>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {currentSeasonEpisodes.map((epNum) => {
                const isCurrent = currentSeason === activeSeason && epNum === activeEpisode;
                return (
                  <button
                    key={epNum}
                    onClick={() => handleSelectEpisode(currentSeason, epNum, activeTranslation)}
                    className={`py-3 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer ${isCurrent
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-lg'
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                      }`}
                  >
                    {epNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TRANSLATIONS */}
          {movie.translationsList && movie.translationsList.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-xs font-semibold text-zinc-400 block">Озвучка:</span>
              <div className="flex flex-wrap items-center gap-2">
                {movie.translationsList.map((trans) => (
                  <button
                    key={trans.id}
                    onClick={() => handleSelectTranslation(trans.id)}
                    className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all duration-200 cursor-pointer ${activeTranslation === trans.id
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                  >
                    {trans.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN IFRAME / VIDEO PLAYER */}
      <iframe
        src={iframeSrc}
        title={movie.title}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
