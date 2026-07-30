'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import CinemaHeader from '../../components/cinema-header';
import MovieRow from '../../components/movie-row';
import { Movie } from '../../types';
import { useTvNavigation } from '../../use-tv-navigation';
import { fetchCinemaVideoById, fetchCinemaSearch, getOptimizedImageUrl } from '../../cinema-api';
import { CinemaInfoSkeleton, FrameBrandLoader } from '../../components/cinema-skeleton';

import { CacheManager } from '../../../lib/cache';
import { getCinemaCache, setCinemaCache } from '../../cinema-cache';
import { saveWatchHistoryItem, getMovieProgress } from '../../cinema-history';

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
  const [fromUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem('ancial_cinema_info_referrer');
      if (saved) {
        sessionStorage.removeItem('ancial_cinema_info_referrer');
        if (!saved.includes('/cinema/info/') && !saved.includes('/cinema/watch/')) {
          return saved;
        }
      }

      if (document.referrer) {
        const refUrl = new URL(document.referrer);
        if (
          refUrl.origin === window.location.origin &&
          !refUrl.pathname.includes('/cinema/info/') &&
          !refUrl.pathname.includes('/cinema/watch/')
        ) {
          return refUrl.pathname + refUrl.search;
        }
      }
    } catch (e) {}
    return null;
  });

  const handleInfoBack = () => {
    if (fromUrl) {
      router.push(fromUrl);
    } else {
      router.push('/cinema');
    }
  };

  // Synchronous cache read for instant 0-ms initial render without skeleton flash
  const [infoMovie, setInfoMovie] = useState<Movie | null>(() => {
    if (typeof window === 'undefined') return null;
    return (
      getCinemaCache<Movie>('info', id) ||
      CacheManager.get<Movie>(`cinema_video_by_id_${id}`, { category: 'cinema', subcategory: 'video' })
    );
  });
  const [similarMovies, setSimilarMovies] = useState<Movie[]>(() => {
    if (typeof window === 'undefined') return [];
    return getCinemaCache<Movie[]>('similar', id) || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !infoMovie);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(true);

  // Watch state & selection
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [selectedTranslation, setSelectedTranslation] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [savedProgress, setSavedProgress] = useState<{
    season?: number;
    episode?: number;
    translationId?: number | null;
    playerId?: string;
    time?: number;
    currentTime?: number;
    duration?: number;
  } | null>(null);

  // Helper to save selection via cache manager
  const saveMovieSelection = (
    movieId: string,
    s: number,
    e: number,
    tId: number | null,
    pId: string
  ) => {
    if (!infoMovie) return;
    const transObj = infoMovie.translationsList?.find((t) => t.id === tId);
    const playerObj = infoMovie.players?.find((p) => p.id === pId);
    try {
      saveWatchHistoryItem({
        id: movieId,
        title: infoMovie.title,
        originalTitle: infoMovie.originalTitle,
        description: infoMovie.description,
        posterUrl: infoMovie.posterUrl,
        backdropUrl: infoMovie.backdropUrl,
        rating: infoMovie.rating,
        year: infoMovie.year,
        ageRating: infoMovie.ageRating,
        duration: infoMovie.duration,
        type: infoMovie.type,
        season: s,
        episode: e,
        translationId: tId,
        translationTitle: transObj?.title || '',
        playerId: pId,
        playerName: playerObj?.name || '',
      });
    } catch (err) {}
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Read cached data first (check 'info' cache, then fallback to 'video' cache)
    let cachedMovie = getCinemaCache<Movie>('info', id);
    if (!cachedMovie) {
      cachedMovie = CacheManager.get<Movie>(`cinema_video_by_id_${id}`, { category: 'cinema', subcategory: 'video' });
    }
    const cachedSimilar = getCinemaCache<Movie[]>('similar', id);

    if (cachedMovie) {
      setInfoMovie(cachedMovie);
      if (cachedSimilar && cachedSimilar.length > 0) setSimilarMovies(cachedSimilar);
      setIsLoading(false);

      const defaultPlayerId = cachedMovie.players?.[0]?.id || '';
      try {
        const parsed = getMovieProgress(cachedMovie.id);
        if (parsed) {
          if (!parsed.time && parsed.currentTime) parsed.time = parsed.currentTime;
          setSavedProgress(parsed);
          if (parsed.season) setSelectedSeason(parsed.season);
          if (parsed.episode) setSelectedEpisode(parsed.episode);
          if (parsed.translationId) setSelectedTranslation(parsed.translationId);
          if (parsed.playerId) setSelectedPlayerId(parsed.playerId);
        } else if (defaultPlayerId) {
          setSelectedPlayerId(defaultPlayerId);
          const defaultPlayer = cachedMovie.players?.find((p) => p.id === defaultPlayerId) || cachedMovie.players?.[0];
          const defaultTrans = defaultPlayer?.translations?.[0]?.id || cachedMovie.translationsList?.[0]?.id || null;
          if (defaultTrans) setSelectedTranslation(defaultTrans);
        }
      } catch (e) {}
    } else {
      setIsLoading(true);
    }

    // 2. Background revalidate fetch
    async function loadMovieInfo() {
      try {
        setIsRevalidating(true);
        const target = await fetchCinemaVideoById(id, { skipCache: true });
        if (isMounted && target) {
          setInfoMovie(target);
          setCinemaCache('info', id, target);
          CacheManager.set(`cinema_video_by_id_${id}`, target, { category: 'cinema', subcategory: 'video', ttl: 24 * 60 * 60 * 1000 });

          const defaultPlayerId = target.players?.[0]?.id || '';

          try {
            const parsed = getMovieProgress(target.id);
            if (parsed) {
              if (!parsed.time && parsed.currentTime) {
                parsed.time = parsed.currentTime;
              }
              setSavedProgress(parsed);
              if (parsed.season) setSelectedSeason(parsed.season);
              if (parsed.episode) setSelectedEpisode(parsed.episode);
              if (parsed.translationId) setSelectedTranslation(parsed.translationId);
              if (parsed.playerId && !selectedPlayerId) setSelectedPlayerId(parsed.playerId);
            } else if (defaultPlayerId && !selectedPlayerId) {
              setSelectedPlayerId(defaultPlayerId);
              const defaultPlayer = target.players?.find((p) => p.id === defaultPlayerId) || target.players?.[0];
              const defaultTrans = defaultPlayer?.translations?.[0]?.id || target.translationsList?.[0]?.id || null;
              if (defaultTrans) setSelectedTranslation(defaultTrans);
            }
          } catch (e) {}

          // Load similar content
          const similar = await fetchCinemaSearch('', target.type === 'series' ? 'serial' : 'movie');
          if (isMounted && similar) {
            const filteredSimilar = similar.filter((m) => m.id !== target.id).slice(0, 10);
            setSimilarMovies(filteredSimilar);
            setCinemaCache('similar', id, filteredSimilar);
          }
        }
      } catch (err) {
        console.warn('loadMovieInfo error:', err);
      } finally {
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

  const handleSelectSeason = (sNum: number) => {
    setSelectedSeason(sNum);
    setSelectedEpisode(1);
    if (infoMovie) {
      saveMovieSelection(infoMovie.id, sNum, 1, selectedTranslation, selectedPlayerId);
    }
  };

  const handleSelectEpisode = (epNum: number) => {
    setSelectedEpisode(epNum);
    if (infoMovie) {
      saveMovieSelection(infoMovie.id, selectedSeason, epNum, selectedTranslation, selectedPlayerId);
    }
  };

  const handleSelectTranslation = (transId: number, overridePlayerId?: string) => {
    const pId = overridePlayerId || selectedPlayerId;
    setSelectedTranslation(transId);
    setSavedProgress((prev) => (prev ? { ...prev, translationId: transId, playerId: pId } : { translationId: transId, playerId: pId }));
    if (infoMovie) {
      saveMovieSelection(infoMovie.id, selectedSeason, selectedEpisode, transId, pId);
    }
  };

  const handleSelectPlayer = (playerId: string, overrideTransId?: number | null) => {
    const tId = overrideTransId !== undefined ? overrideTransId : selectedTranslation;
    setSelectedPlayerId(playerId);
    setSavedProgress((prev) => (prev ? { ...prev, playerId, translationId: tId } : { playerId, translationId: tId }));
    if (infoMovie) {
      saveMovieSelection(infoMovie.id, selectedSeason, selectedEpisode, tId, playerId);
    }
  };

  const handleWatch = (seasonNum?: number, episodeNum?: number, transId?: number | null, player?: string) => {
    if (!infoMovie) return;
    const s = seasonNum || selectedSeason || 1;
    const e = episodeNum || selectedEpisode || 1;
    const t = transId !== undefined ? transId : selectedTranslation;
    const p = player || selectedPlayerId || 'flixcdn';

    saveMovieSelection(infoMovie.id, s, e, t, p);

    const queryParams = new URLSearchParams();
    if (isSeriesOrAnime || availableSeasonsCount > 1 || currentSeasonEpisodes.length > 1) {
      queryParams.set('season', String(s));
      queryParams.set('episode', String(e));
    }
    if (t) {
      queryParams.set('translation', String(t));
    }
    if (p) {
      queryParams.set('player', p);
    }
    if (savedProgress?.time && savedProgress.time > 5) {
      queryParams.set('time', String(Math.floor(savedProgress.time)));
    }

    const queryStr = queryParams.toString();
    router.push(`/cinema/watch/${infoMovie.id}${queryStr ? `?${queryStr}` : ''}`);
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
      : (infoMovie.counters?.episodes && infoMovie.counters.episodes > 0)
      ? Array.from({ length: infoMovie.counters.episodes }, (_, i) => i + 1)
      : []
    : [];

  const hasMultipleSeasons = availableSeasonsCount > 1;
  const hasMultipleEpisodes = currentSeasonEpisodes.length > 1;
  const hasEpisodeSelection = isSeriesOrAnime && (hasMultipleSeasons || hasMultipleEpisodes);

  const activePlayerObj = infoMovie.players?.find((p) => p.id === selectedPlayerId) || infoMovie.players?.[0];
  const isCollapsPlayer = selectedPlayerId === 'collaps' || activePlayerObj?.id === 'collaps';
  const activeTranslations = isCollapsPlayer
    ? []
    : ((activePlayerObj?.translations && activePlayerObj.translations.length > 0)
      ? activePlayerObj.translations
      : (infoMovie.translationsList || []));

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader
        activeTab="all"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showBackButton
        onBack={handleInfoBack}
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
              onClick={() => handleWatch(savedProgress?.season || selectedSeason, savedProgress?.episode || selectedEpisode, selectedTranslation, selectedPlayerId)}
              className="focusable-tv px-8 py-3 rounded-3xl bg-white hover:bg-zinc-200 text-black font-black text-sm flex items-center gap-3 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-white focus:scale-105 focus:z-40"
            >
              <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>
                {savedProgress
                  ? hasEpisodeSelection
                    ? `Продолжить (С${savedProgress.season || 1} Е${savedProgress.episode || 1}${
                        savedProgress.time && savedProgress.time > 5
                          ? ` · ${Math.floor(savedProgress.time / 60)}:${String(Math.floor(savedProgress.time % 60)).padStart(2, '0')}`
                          : ''
                      })`
                    : savedProgress.time && savedProgress.time > 5
                    ? `Продолжить с ${Math.floor(savedProgress.time / 60)}:${String(Math.floor(savedProgress.time % 60)).padStart(2, '0')}`
                    : 'Продолжить'
                  : lang?.frame_watch_now || 'Смотреть'}
              </span>
            </button>

            {savedProgress && (
              <button
                data-watch-hero-btn
                tabIndex={0}
                onClick={() => {
                  try {
                    const raw = localStorage.getItem(`cinema_progress_${infoMovie.id}`);
                    if (raw) {
                      const parsed = JSON.parse(raw);
                      delete parsed.time;
                      delete parsed.currentTime;
                      localStorage.setItem(`cinema_progress_${infoMovie.id}`, JSON.stringify(parsed));
                    }
                  } catch (e) {}
                  handleWatch(1, 1, selectedTranslation);
                }}
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
        {/* AVAILABLE PLAYERS SELECTOR ON INFO PAGE */}
        {isRevalidating && (!infoMovie.players || infoMovie.players.length === 0) ? (
          <div className="space-y-3 bg-zinc-900/40 border border-zinc-800/80 p-4 lg:p-6 rounded-3xl backdrop-blur-xl animate-pulse">
            <div className="h-5 w-40 bg-zinc-800 rounded-lg"></div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 bg-zinc-800 rounded-2xl"></div>
              <div className="h-10 w-32 bg-zinc-800 rounded-2xl"></div>
            </div>
          </div>
        ) : infoMovie.players && infoMovie.players.length > 0 ? (
          <div className="space-y-3 bg-zinc-900/40 border border-zinc-800/80 p-4 lg:p-6 rounded-3xl backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Источники и плееры</span>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {infoMovie.players.map((p) => (
                <button
                  key={p.id}
                  tabIndex={0}
                  onClick={() => {
                    let nextTrans = selectedTranslation;
                    if (p.translations && p.translations.length > 0) {
                      const hasMatch = p.translations.some((t) => t.id === selectedTranslation);
                      if (!hasMatch) {
                        nextTrans = p.translations[0].id;
                      }
                    }
                    handleSelectPlayer(p.id, nextTrans);
                    if (nextTrans !== selectedTranslation && nextTrans !== null) {
                      setSelectedTranslation(nextTrans);
                    }
                  }}
                  className={`focusable-tv px-4 py-2.5 rounded-2xl font-bold text-xs border flex items-center gap-2 transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white ${
                    selectedPlayerId === p.id
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                      : 'bg-zinc-900/90 text-zinc-400 hover:text-white border-white/10'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{p.name}</span>
                  {p.quality && <span className="text-[10px] text-zinc-500 font-medium">({p.quality})</span>}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* NATIVE SEASONS AND EPISODES SELECTOR */}
        {isSeriesOrAnime && (
          isRevalidating && (!infoMovie.episodesBySeason && (!infoMovie.counters || !infoMovie.counters.episodes)) ? (
            <div className="space-y-4 bg-zinc-900/40 border border-zinc-800/80 p-4 lg:p-6 rounded-3xl backdrop-blur-xl animate-pulse">
              <div className="h-6 w-48 bg-zinc-800 rounded-lg"></div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-2xl bg-zinc-800"></div>
                ))}
              </div>
            </div>
          ) : hasEpisodeSelection ? (
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
                      onClick={() => handleSelectSeason(sNum)}
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

              {/* EPISODES GRID */}
              {currentSeasonEpisodes.length > 0 && (
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
                            handleSelectEpisode(epNum);
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
          ) : null
        )}

        {/* NATIVE TRANSLATIONS SELECTOR FOR ACTIVE PLAYER */}
        {activeTranslations && activeTranslations.length > 0 && (
          <div className="space-y-3 bg-zinc-900/40 border border-zinc-800/80 p-4 lg:p-6 rounded-3xl backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <span>Озвучка и перевод ({activePlayerObj?.name || 'Плеер'})</span>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {activeTranslations.map((trans) => (
                <button
                  key={trans.id}
                  tabIndex={0}
                  onClick={() => handleSelectTranslation(trans.id)}
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
                <span className="text-zinc-500 block mb-1 text-xs font-semibold">{lang?.frame_director || 'Режиссер'}</span>
                <button
                  onClick={() => router.push(`/cinema/person/${encodeURIComponent(infoMovie.director || '')}`)}
                  className="text-indigo-400 font-bold hover:underline cursor-pointer bg-transparent p-0 border-0 text-left"
                >
                  {infoMovie.director}
                </button>
              </div>
            )}
            {infoMovie.translationsList && infoMovie.translationsList.length > 0 && (
              <div>
                <span className="text-zinc-500 block mb-1 text-xs font-semibold">Доступные озвучки</span>
                <span className="text-zinc-300">{infoMovie.translationsList.map((t) => t.title).join(', ')}</span>
              </div>
            )}
            <div>
              <span className="text-zinc-500 block mb-1 text-xs font-semibold">Качество</span>
              <span className="text-zinc-300 font-bold">{infoMovie.quality || 'FullHD'}</span>
            </div>
          </div>
        </div>

        {/* CAST & CREW HORIZONTAL ROW WITH AVATARS (MAX 12 ACTORS) */}
        {((infoMovie.actorsList && infoMovie.actorsList.length > 0) || (infoMovie.cast && infoMovie.cast.length > 0)) && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {lang?.frame_cast || 'В главных ролях'}
              </h3>
            </div>

            <div className="viewport dragscroll flex items-center gap-3 overflow-x-auto scrollbar-none -mx-3 px-3 lg:-mx-6 lg:px-6 py-2 select-none">
              {infoMovie.actorsList && infoMovie.actorsList.length > 0
                ? infoMovie.actorsList.slice(0, 12).map((actor, idx) => (
                    <button
                      key={idx}
                      tabIndex={0}
                      onClick={() => {
                        const pid = actor.id || actor.kinopoisk_id || actor.name;
                        const nameQuery = encodeURIComponent(actor.name);
                        const posterQuery = actor.posterUrl ? `&poster=${encodeURIComponent(actor.posterUrl)}` : '';
                        router.push(`/cinema/person/${encodeURIComponent(String(pid))}?name=${nameQuery}${posterQuery}`);
                      }}
                      className="focusable-tv group flex-none w-28 sm:w-32 bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-indigo-500/50 p-2.5 rounded-2xl flex flex-col items-center text-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 shadow-md outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 focus:z-20"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-zinc-950 border border-white/10 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getOptimizedImageUrl(actor.posterUrl, '@w300')}
                          alt={actor.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = '/img/branding/frame.svg';
                          }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="w-full space-y-0.5">
                        <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                          {actor.name}
                        </p>
                        {actor.character && (
                          <p className="text-[10px] text-zinc-400 font-medium line-clamp-1">
                            {actor.character}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                : (infoMovie.cast || []).slice(0, 12).map((actorName, idx) => (
                    <button
                      key={idx}
                      tabIndex={0}
                      onClick={() => router.push(`/cinema/person/${encodeURIComponent(actorName)}`)}
                      className="focusable-tv group flex-none w-28 sm:w-32 bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-indigo-500/50 p-2.5 rounded-2xl flex flex-col items-center text-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 shadow-md outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 focus:z-20"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-zinc-950 border border-white/10 shrink-0 flex items-center justify-center text-zinc-500 font-black text-xl">
                        {actorName.charAt(0)}
                      </div>
                      <div className="w-full space-y-0.5">
                        <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                          {actorName}
                        </p>
                      </div>
                    </button>
                  ))}
            </div>
          </section>
        )}

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
