'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Movie } from '../../types';
import { fetchCinemaVideoById } from '../../cinema-api';
import { useTvNavigation } from '../../use-tv-navigation';
import { FrameBrandLoader } from '../../components/cinema-skeleton';
import CustomPlayer from '../../components/custom-player';

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

  // Hide mobile navigation bar on mount (matching /messages pattern)
  useEffect(() => {
    document.documentElement.classList.add('cinema-watch-open');
    document.body.classList.add('cinema-watch-open');
    return () => {
      document.documentElement.classList.remove('cinema-watch-open');
      document.body.classList.remove('cinema-watch-open');
    };
  }, []);

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

  const availableSeasonsCount = movie.counters?.seasons || (movie.episodesBySeason ? Object.keys(movie.episodesBySeason).length : 0) || 1;
  const isSeriesOrAnime =
    movie.type !== 'movie' ||
    Boolean(movie.counters?.seasons && movie.counters.seasons > 0) ||
    Boolean(movie.counters?.episodes && movie.counters.episodes > 0) ||
    Boolean(movie.episodesBySeason && Object.keys(movie.episodesBySeason).length > 0) ||
    Boolean(movie.genres?.some((g) => g.toLowerCase().includes('сериал') || g.toLowerCase().includes('шоу')));

  const activeSeason = season ? Number(season) : 1;
  const activeEpisode = episode ? Number(episode) : 1;
  const activeTranslation = translation ? Number(translation) : (movie.translationsList?.[0]?.id || null);

  const currentSeasonEpisodes = isSeriesOrAnime
    ? (movie.episodesBySeason && movie.episodesBySeason[currentSeason] && movie.episodesBySeason[currentSeason].length > 0)
      ? movie.episodesBySeason[currentSeason]
      : Array.from({ length: movie.counters?.episodes || 10 }, (_, i) => i + 1)
    : [];

  const hasMultipleSeasons = availableSeasonsCount > 1;
  const hasMultipleEpisodes = currentSeasonEpisodes.length > 1;
  const hasEpisodeSelection = isSeriesOrAnime && (hasMultipleSeasons || hasMultipleEpisodes);
  const hasMultipleTranslations = Boolean(movie.translationsList && movie.translationsList.length > 1);
  const showModalPicker = hasEpisodeSelection || hasMultipleTranslations;

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

  const handleNextEpisode = () => {
    if (activeEpisode < (currentSeasonEpisodes.length || 100)) {
      handleSelectEpisode(activeSeason, activeEpisode + 1, activeTranslation);
    } else if (activeSeason < availableSeasonsCount) {
      handleSelectEpisode(activeSeason + 1, 1, activeTranslation);
    }
  };

  const handlePrevEpisode = () => {
    if (activeEpisode > 1) {
      handleSelectEpisode(activeSeason, activeEpisode - 1, activeTranslation);
    }
  };

  // Find direct stream url if available in files
  const matchedFile = (movie.files || []).find((f: any) => {
    const sMatch = !f.season_number || Number(f.season_number) === activeSeason;
    const eMatch = !f.series_number || Number(f.series_number) === activeEpisode;
    const tMatch = !f.translation?.id || Number(f.translation.id) === activeTranslation;
    return sMatch && eMatch && tMatch;
  }) || (movie.files || [])[0];

  // Only use directStreamUrl if matchedFile has an actual media stream URL (mp4, m3u8, webm, etc.)
  const candidateUrl = matchedFile?.url;
  const isDirectMediaFile = candidateUrl && (
    candidateUrl.includes('.mp4') ||
    candidateUrl.includes('.m3u8') ||
    candidateUrl.includes('.mkv') ||
    candidateUrl.includes('.webm') ||
    candidateUrl.includes('/file/') ||
    candidateUrl.includes('/stream/')
  );

  const directStreamUrl = isDirectMediaFile ? candidateUrl : undefined;

  // Build iframe URL according to FlixCDN Iframe documentation
  const targetKpId = movie.kinopoisk_id || movie.id;
  const rawBaseUrl = movie.videoUrl || `https://tarantino.factorios.live/show/kinopoisk/${targetKpId}`;
  const baseUrl = rawBaseUrl.split('?')[0];
  const iframeParams = new URLSearchParams();
  if (season) iframeParams.set('season', season);
  if (episode) iframeParams.set('episode', episode);
  if (translation) iframeParams.set('translation', translation);

  // Hide duplicate iframe controls, header, title & sharing since Ancial UI handles them natively
  iframeParams.set('no_control_translations', '1');
  iframeParams.set('no_control_seasons', '1');
  iframeParams.set('no_control_episodes', '1');
  iframeParams.set('no_sharing', '1');
  iframeParams.set('no_title', '1');
  iframeParams.set('no_header', '1');
  iframeParams.set('no_control_title', '1');
  iframeParams.set('no_back', '1');

  const iframeSrc = `${baseUrl}?${iframeParams.toString()}`;

  return (
    <div className="relative w-screen h-[100dvh] bg-black overflow-hidden select-none">
      <style>{`#NAVP, [data-app-nav="mobile"], [data-app-nav="desktop"] { display: none !important; }`}</style>
      {/* CUSTOM PLAYER (HANDLES NATIVE HTML5 OR FALLBACK IFRAME WITH OUR CONTROLS) */}
      <CustomPlayer
        src={directStreamUrl}
        fallbackIframeSrc={iframeSrc}
        title={movie.title}
        movieId={movie.id}
        season={activeSeason}
        episode={activeEpisode}
        totalSeasons={hasMultipleSeasons ? availableSeasonsCount : 1}
        totalEpisodes={hasEpisodeSelection ? currentSeasonEpisodes.length : 1}
        translations={movie.translationsList}
        selectedTranslationId={activeTranslation}
        onNextEpisode={hasEpisodeSelection ? handleNextEpisode : undefined}
        onPrevEpisode={hasEpisodeSelection && activeEpisode > 1 ? handlePrevEpisode : undefined}
        onSelectTranslation={handleSelectTranslation}
        onSelectEpisodeModal={showModalPicker ? () => setShowPicker(true) : undefined}
        onBack={() => router.back()}
      />

      {/* OVERLAY EPISODES & SEASONS PICKER MODAL */}
      {showPicker && showModalPicker && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-2xl flex flex-col p-4 lg:p-8 space-y-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white">{movie.title}</h2>
              {hasEpisodeSelection && (
                <p className="text-xs text-zinc-400">
                  {hasMultipleSeasons ? `Сезон ${activeSeason}, ` : ''}Серия {activeEpisode}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              Закрыть ✕
            </button>
          </div>

          {/* SEASONS (ONLY IF >1 SEASON) */}
          {hasMultipleSeasons && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 block">Сезон:</span>
              <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-2 px-1 -mx-1">
                {Array.from({ length: availableSeasonsCount }, (_, i) => i + 1).map((sNum) => (
                  <button
                    key={sNum}
                    onClick={() => setCurrentSeason(sNum)}
                    className={`focusable-tv px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 ${currentSeason === sNum
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

          {/* EPISODES GRID (ONLY IF MULTIPLE EPISODES / SEASONS) */}
          {hasEpisodeSelection && (
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
          )}

          {/* TRANSLATIONS (ONLY IF >1 TRANSLATION) */}
          {hasMultipleTranslations && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-xs font-semibold text-zinc-400 block">Озвучка:</span>
              <div className="flex flex-wrap items-center gap-2">
                {(movie.translationsList || []).map((trans) => (
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
    </div>
  );
}
