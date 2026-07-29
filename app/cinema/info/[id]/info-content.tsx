'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import CinemaHeader from '../../components/cinema-header';
import MovieRow from '../../components/movie-row';
import { Movie } from '../../types';
import { useTvNavigation } from '../../use-tv-navigation';
import { fetchCinemaVideoById, fetchCinemaSearch } from '../../cinema-api';
import { CinemaInfoSkeleton, FrameBrandLoader } from '../../components/cinema-skeleton';

interface InfoContentProps {
  id: string;
}

export default function InfoContent({ id }: InfoContentProps) {
  useTvNavigation();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [myListIds, setMyListIds] = useState<string[]>([]);
  const [infoMovie, setInfoMovie] = useState<Movie | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Watch state & selection
  const [savedProgress, setSavedProgress] = useState<{ season?: number; episode?: number; translationId?: number } | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [selectedTranslation, setSelectedTranslation] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadMovieInfo() {
      setIsLoading(true);
      const target = await fetchCinemaVideoById(id);
      if (isMounted && target) {
        setInfoMovie(target);

        // Load saved progress from localStorage
        try {
          const progRaw = localStorage.getItem(`cinema_progress_${target.id}`);
          if (progRaw) {
            const parsed = JSON.parse(progRaw);
            setSavedProgress(parsed);
            if (parsed.season) setSelectedSeason(parsed.season);
            if (parsed.episode) setSelectedEpisode(parsed.episode);
            if (parsed.translationId) setSelectedTranslation(parsed.translationId);
          } else if (target.translationsList && target.translationsList.length > 0) {
            setSelectedTranslation(target.translationsList[0].id);
          }
        } catch (e) { }

        // Load similar content
        const similar = await fetchCinemaSearch('', target.type === 'series' ? 'serial' : 'movie');
        if (isMounted) {
          setSimilarMovies(similar.filter((m) => m.id !== target.id).slice(0, 10));
        }
      }
      if (isMounted) {
        setIsLoading(false);
        setTimeout(() => {
          const watchBtn = document.querySelector<HTMLElement>('[data-watch-hero-btn]');
          const backBtn = Array.from(document.querySelectorAll<HTMLElement>('[data-cinema-back="true"]')).find(
            (b) => b.offsetWidth > 0 && b.offsetHeight > 0 && getComputedStyle(b).display !== 'none'
          );
          const targetBtn = watchBtn || backBtn;
          if (targetBtn) targetBtn.focus();
        }, 50);
      }
    }

    loadMovieInfo();

    try {
      const savedList = localStorage.getItem('frame_my_list');
      if (savedList) setMyListIds(JSON.parse(savedList));
    } catch (e) { }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const toggleMyList = (movieId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: string[];
    if (myListIds.includes(movieId)) {
      updated = myListIds.filter((i) => i !== movieId);
      showNote({
        content: lang?.frame_note_removed || 'Удалено из Моего списка',
        type: 'info',
        time: 3,
      });
    } else {
      updated = [...myListIds, movieId];
      showNote({
        content: lang?.frame_note_added || 'Добавлено в Мой список',
        type: 'success',
        time: 3,
      });
    }
    setMyListIds(updated);
    try {
      localStorage.setItem('frame_my_list', JSON.stringify(updated));
    } catch (err) { }
  };

  const handleWatch = (seasonNum?: number, episodeNum?: number, transId?: number | null) => {
    if (!infoMovie) return;
    const s = seasonNum || selectedSeason || 1;
    const e = episodeNum || selectedEpisode || 1;
    const t = transId !== undefined ? transId : selectedTranslation;

    // Save progress to localStorage
    const progressObj = {
      season: s,
      episode: e,
      translationId: t,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(`cinema_progress_${infoMovie.id}`, JSON.stringify(progressObj));
      
      // Update watch history array
      const historyRaw = localStorage.getItem('cinema_watch_history');
      const history: any[] = historyRaw ? JSON.parse(historyRaw) : [];
      const filtered = history.filter((h: any) => String(h.id) !== String(infoMovie.id));
      filtered.unshift({
        id: infoMovie.id,
        title: infoMovie.title,
        posterUrl: infoMovie.posterUrl,
        type: infoMovie.type,
        season: s,
        episode: e,
        timestamp: Date.now(),
      });
      localStorage.setItem('cinema_watch_history', JSON.stringify(filtered.slice(0, 50)));
    } catch (err) { }

    // Build URL query params
    const queryParams = new URLSearchParams();
    if (infoMovie.type === 'series' || (infoMovie.counters && infoMovie.counters.seasons)) {
      queryParams.set('season', String(s));
      queryParams.set('episode', String(e));
    }
    if (t) queryParams.set('translation', String(t));

    const watchUrl = `/cinema/watch/${infoMovie.id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    router.push(watchUrl);
  };

  if (isLoading) {
    return <CinemaInfoSkeleton />;
  }

  if (!infoMovie) {
    return (
      <div className="min-h-screen bg-black text-white p-12 flex flex-col items-center justify-center gap-4">
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

  // Derive available seasons and episodes ONLY for series/anime
  const availableSeasonsCount = infoMovie.counters?.seasons || (infoMovie.episodesBySeason ? Object.keys(infoMovie.episodesBySeason).length : 0) || 1;
  const isSeriesOrAnime =
    infoMovie.type !== 'movie' ||
    Boolean(infoMovie.counters?.seasons && infoMovie.counters.seasons > 0) ||
    Boolean(infoMovie.counters?.episodes && infoMovie.counters.episodes > 0) ||
    Boolean(infoMovie.episodesBySeason && Object.keys(infoMovie.episodesBySeason).length > 0) ||
    Boolean(infoMovie.genres?.some((g) => g.toLowerCase().includes('сериал') || g.toLowerCase().includes('шоу')));

  const currentSeasonEpisodes = isSeriesOrAnime
    ? (infoMovie.episodesBySeason && infoMovie.episodesBySeason[selectedSeason] && infoMovie.episodesBySeason[selectedSeason].length > 0)
      ? infoMovie.episodesBySeason[selectedSeason]
      : Array.from({ length: infoMovie.counters?.episodes || 10 }, (_, i) => i + 1)
    : [];

  const hasMultipleSeasons = availableSeasonsCount > 1;
  const hasMultipleEpisodes = currentSeasonEpisodes.length > 1;
  const hasEpisodeSelection = isSeriesOrAnime && (hasMultipleSeasons || hasMultipleEpisodes);

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader
        activeTab="all"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showBackButton
        onBack={() => router.back()}
      />

      {/* HERO COVER FOR MOVIE INFO */}
      <div data-hero-section className="relative w-full h-[65vh] overflow-hidden -mt-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={infoMovie.backdropUrl || infoMovie.posterUrl}
          alt={infoMovie.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (infoMovie.id && !target.src.includes('yandex.net')) {
              target.src = `https://st.kp.yandex.net/images/film_big/${infoMovie.id}.jpg`;
            }
          }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />

        <div className="absolute bottom-3 inset-x-3 z-20 space-y-3 max-w-4xl lg:px-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="px-3 py-1 rounded-full bg-amber-800/90 backdrop-blur-md backdrop-saturate-200 backdrop-hue-200 border border-amber-500/40 text-amber-400 font-extrabold text-[11px]">
              ★ {infoMovie.rating}
            </span>
            <span className="text-xs text-zinc-400 font-semibold">{infoMovie.year}</span>
            <span className="text-xs text-zinc-400 font-semibold">• {infoMovie.ageRating}</span>
            <span className="text-xs text-zinc-400 font-semibold">• {infoMovie.duration}</span>
            {isSeriesOrAnime && availableSeasonsCount > 1 && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                {availableSeasonsCount} {availableSeasonsCount < 5 ? 'сезона' : 'сезонов'}
              </span>
            )}
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight">
            {infoMovie.title}
          </h1>
          <p className="text-sm text-zinc-400 italic">{infoMovie.originalTitle}</p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              data-watch-hero-btn
              tabIndex={0}
              onClick={() => handleWatch(savedProgress?.season, savedProgress?.episode, savedProgress?.translationId)}
              className="focusable-tv px-8 py-3 rounded-3xl bg-white hover:bg-zinc-200 text-black font-black text-sm flex items-center gap-3 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-white focus:scale-105 focus:z-40"
            >
              <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>
                {savedProgress
                  ? hasEpisodeSelection
                    ? `Продолжить (С${savedProgress.season || 1} Е${savedProgress.episode || 1})`
                    : 'Продолжить'
                  : lang?.frame_watch_now || 'Смотреть'}
              </span>
            </button>

            {savedProgress && (
              <button
                data-watch-hero-btn
                tabIndex={0}
                onClick={() => handleWatch(1, 1, selectedTranslation)}
                className="focusable-tv px-6 py-3 rounded-3xl bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold text-sm border border-zinc-700/50 backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white"
              >
                {hasEpisodeSelection ? 'Сначала (С1 Е1)' : 'Сначала'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* INFO BODY DETAILS */}
      <main className="w-full px-3 lg:px-6 pt-3 space-y-8">
        {/* NATIVE SEASONS AND EPISODES SELECTOR */}
        {isSeriesOrAnime && (hasMultipleSeasons || currentSeasonEpisodes.length > 1) && (
          <div className="space-y-4 bg-zinc-900/40 border border-zinc-800/80 p-4 lg:p-6 rounded-3xl backdrop-blur-xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>{hasMultipleSeasons ? 'Выбор сезона и серии' : 'Выбор серии'}</span>
            </h3>

            {/* SEASON TABS (ONLY IF >1 SEASON) */}
            {hasMultipleSeasons && (
              <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-2 px-1 -mx-1">
                {Array.from({ length: availableSeasonsCount }, (_, i) => i + 1).map((sNum) => (
                  <button
                    key={sNum}
                    tabIndex={0}
                    onClick={() => setSelectedSeason(sNum)}
                    className={`focusable-tv px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 focus:z-20 ${
                      selectedSeason === sNum
                        ? 'bg-white text-black shadow-lg shadow-white/10'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    Сезон {sNum}
                  </button>
                ))}
              </div>
            )}

            {/* EPISODES GRID (ONLY IF >1 EPISODE) */}
            {currentSeasonEpisodes.length > 1 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-400 block">Серии ({currentSeasonEpisodes.length}):</span>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                  {currentSeasonEpisodes.map((epNum) => {
                    const isCurrent = selectedSeason === (savedProgress?.season || 1) && epNum === (savedProgress?.episode || 1);
                    return (
                      <button
                        key={epNum}
                        tabIndex={0}
                        onClick={() => {
                          setSelectedEpisode(epNum);
                          handleWatch(selectedSeason, epNum, selectedTranslation);
                        }}
                        className={`focusable-tv py-2.5 rounded-2xl font-extrabold text-xs transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400'
                            : selectedEpisode === epNum
                            ? 'bg-white text-black font-black'
                            : 'bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {epNum} серия
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* NATIVE TRANSLATIONS SELECTOR */}
        {infoMovie.translationsList && infoMovie.translationsList.length > 1 && (
          <div className="space-y-3 bg-zinc-900/40 border border-zinc-800/80 p-4 lg:p-6 rounded-3xl backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <span>Озвучка и перевод</span>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {infoMovie.translationsList.map((trans) => (
                <button
                  key={trans.id}
                  tabIndex={0}
                  onClick={() => setSelectedTranslation(trans.id)}
                  className={`focusable-tv px-4 py-2 rounded-2xl font-bold text-xs transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white ${
                    selectedTranslation === trans.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {trans.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <p className="text-lg text-zinc-300 leading-relaxed font-light">
              {infoMovie.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {infoMovie.genres.map((g) => (
                <span key={g} className="px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs text-zinc-200 shadow-sm">
                  {g}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4 bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10 text-sm shadow-xl h-fit">
            {infoMovie.director && (
              <div>
                <span className="text-zinc-500 block mb-1 text-xs font-semibold">Режиссер</span>
                <span className="text-white font-bold">{infoMovie.director}</span>
              </div>
            )}
            {infoMovie.cast && infoMovie.cast.length > 0 && (
              <div>
                <span className="text-zinc-500 block mb-1 text-xs font-semibold">В главных ролях</span>
                <span className="text-zinc-300">{infoMovie.cast.join(', ')}</span>
              </div>
            )}
            {infoMovie.translationsList && infoMovie.translationsList.length > 0 && (
              <div>
                <span className="text-zinc-500 block mb-1 text-xs font-semibold">Доступные озвучки</span>
                <span className="text-zinc-300">{infoMovie.translationsList.map((t) => t.title).join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* SIMILAR MOVIES ROW */}
        {similarMovies.length > 0 && (
          <MovieRow
            title={lang?.frame_similar || 'Похожие фильмы и сериалы'}
            movies={similarMovies}
            myListIds={myListIds}
            onToggleList={toggleMyList}
            onSelectMovie={(m) => router.push(`/cinema/info/${m.id}`)}
            onPlayMovie={(m) => handleWatch(1, 1, null)}
          />
        )}
      </main>
    </div>
  );
}
