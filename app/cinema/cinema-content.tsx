'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getCinemaMyList, setCinemaMyList } from '../lib/cache-helpers';
import { goToMovieInfo } from './cinema-navigation';
import MovieCard from './components/movie-card';
import MovieRow from './components/movie-row';
import AdblockBanner from './components/adblock-banner';
import { Movie } from './types';
import { useTvNavigation } from './use-tv-navigation';
import {
  fetchCinemaUpdates,
  fetchCinemaSearch,
  fetchCinemaGetVideo,
  fetchCinemaVideos,
  fetchCinemaCartoons,
  fetchCinemaByCountry,
} from './cinema-api';
import { CinemaPageSkeleton } from './components/cinema-skeleton';
import { useDragScroll } from '../hooks/useDragScroll';
import CinemaHeader from './components/cinema-header';
import HeroSlider from './components/hero-slider';

import { getCinemaCache, setCinemaCache } from './cinema-cache';
import { getWatchHistory, getMovieProgress, WatchHistoryItem } from './cinema-history';

// Interface for home bundle cache
interface HomeCinemaBundle {
  hero: Movie[];
  top: Movie[];
  newReleases: Movie[];
  popularSeries: Movie[];
  freshUpdates: Movie[];
  cartoons: Movie[];
  korean: Movie[];
  anime: Movie[];
}

export default function CinemaContent() {
  useTvNavigation();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();

  const topScrollRef = useDragScroll({ speed: 2 });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [myListIds, setMyListIds] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [topMovies, setTopMovies] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>([]);
  const [popularSeries, setPopularSeries] = useState<Movie[]>([]);
  const [freshUpdates, setFreshUpdates] = useState<Movie[]>([]);
  const [cartoonsList, setCartoonsList] = useState<Movie[]>([]);
  const [koreanDramas, setKoreanDramas] = useState<Movie[]>([]);
  const [animeList, setAnimeList] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  // Load user's My List from cache on mount
  useEffect(() => {
    const list = getCinemaMyList();
    setMyListIds(list);

    const refreshHistory = () => {
      const list = getWatchHistory();
      setWatchHistory(list);
    };

    refreshHistory();

    window.addEventListener('focus', refreshHistory);
    window.addEventListener('pageshow', refreshHistory);
    document.addEventListener('visibilitychange', refreshHistory);
    window.addEventListener('ancial:cinema_history_update', refreshHistory);

    return () => {
      window.removeEventListener('focus', refreshHistory);
      window.removeEventListener('pageshow', refreshHistory);
      document.removeEventListener('visibilitychange', refreshHistory);
      window.removeEventListener('ancial:cinema_history_update', refreshHistory);
    };
  }, []);

  // Load real API content on mount with SWR caching
  useEffect(() => {
    let isMounted = true;

    // 1. Instantly apply cached bundle if available
    const cachedBundle = getCinemaCache<HomeCinemaBundle>('home_bundle');
    if (cachedBundle) {
      setHeroMovies(cachedBundle.hero || []);
      setTopMovies(cachedBundle.top || []);
      setNewReleases(cachedBundle.newReleases || []);
      setPopularSeries(cachedBundle.popularSeries || []);
      setFreshUpdates(cachedBundle.freshUpdates || []);
      setCartoonsList(cachedBundle.cartoons || []);
      setKoreanDramas(cachedBundle.korean || []);
      setAnimeList(cachedBundle.anime || []);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // 2. Background revalidate
    async function loadRealCinemaData() {
      try {
        const currentYear = 2026;

        const [
          heroItems,
          top10Items,
          freshMovies,
          freshSeries,
          updatesRes,
          cartoonsItems,
          koreanItems,
          animeItems,
        ] = await Promise.all([
          // 1. Hero Slider: Latest releases of 2026 sorted by date added (-created_at)
          fetchCinemaVideos({ page: 1, limit: 10, sort: '-created_at', year_from: currentYear }),
          // 2. Top 10: Top rated movies/series of 2026 sorted by TMDB popularity
          fetchCinemaVideos({ page: 1, limit: 10, sort_by: 'tmdb_popularity', year_from: currentYear }),
          // 3. New Releases: Movies sorted by date added (-created_at)
          fetchCinemaVideos({ page: 1, limit: 15, sort: '-created_at', type: 'movie' }),
          // 4. Popular Series: Series sorted by popularity (-rating_kp,-rating_imdb)
          fetchCinemaVideos({ page: 1, limit: 15, sort: '-rating_kp,-rating_imdb', type: 'serial' }),
          // 5. Fresh Updates Stream
          fetchCinemaUpdates(),
          // 6. Cartoons collection
          fetchCinemaCartoons({ limit: 15 }),
          // 7. Korean Dramas & Thrillers
          fetchCinemaByCountry('Южная Корея', 15),
          // 8. Anime Collection
          fetchCinemaGetVideo({ genres: 'аниме', page: 1, limit: 15 }),
        ]);

        if (!isMounted) return;

        const hero = heroItems.slice(0, 5);
        const top = top10Items.length >= 10 ? top10Items.slice(0, 10) : top10Items;
        const newRel = freshMovies.slice(0, 15);
        const popSer = freshSeries.slice(0, 15);

        // Deduplicate updates by ID/title and set 'Новые серии' for series
        const uniqueUpdatesMap = new Map<string, Movie>();
        (updatesRes.serials || []).forEach((item: Movie) => {
          const key = String(item.id || item.kinopoisk_id || item.title).trim();
          if (key && !uniqueUpdatesMap.has(key)) {
            const isSerial = item.type === 'series' || item.type === 'animeserial' || item.type === 'showserial' || (item.genres && item.genres.some((g) => g.toLowerCase().includes('сериал') || g.toLowerCase().includes('аниме')));
            const realGenres = (item.genres || []).filter((g) => g && g !== 'Новые серии' && g !== 'Обновлено');
            const defaultGenre = isSerial ? 'Сериал' : 'Обновлено';
            const finalGenres = realGenres.length > 0 ? realGenres : [defaultGenre];
            uniqueUpdatesMap.set(key, {
              ...item,
              genres: finalGenres,
              updateBadge: isSerial ? { translationTitle: 'Новые серии' } : item.updateBadge,
            });
          }
        });
        (updatesRes.movies || []).forEach((item: Movie) => {
          const key = String(item.id || item.kinopoisk_id || item.title).trim();
          if (key && !uniqueUpdatesMap.has(key)) {
            uniqueUpdatesMap.set(key, {
              ...item,
              genres: item.genres && item.genres.length > 0 ? item.genres : ['Фильм'],
            });
          }
        });
        const updatesList = Array.from(uniqueUpdatesMap.values()).slice(0, 15);

        const cartoons = cartoonsItems.slice(0, 15);
        const korean = koreanItems.slice(0, 15);
        const anime = animeItems.slice(0, 15);

        setHeroMovies(hero);
        setTopMovies(top);
        setNewReleases(newRel);
        setPopularSeries(popSer);
        setFreshUpdates(updatesList);
        setCartoonsList(cartoons);
        setKoreanDramas(korean);
        setAnimeList(anime);

        setCinemaCache<HomeCinemaBundle>('home_bundle', undefined, {
          hero,
          top,
          newReleases: newRel,
          popularSeries: popSer,
          freshUpdates: updatesList,
          cartoons,
          korean,
          anime,
        });
      } catch (err) {
        console.error('Failed to load cinema API data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRealCinemaData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Search Input Query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await fetchCinemaSearch(searchQuery.trim());
      setSearchResults(results);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);



    const handleDirectPlay = (movieId: string) => {
      try {
        const parsed = getMovieProgress(movieId);
        if (parsed) {
          const params = new URLSearchParams();
          if (parsed.season) params.set('season', String(parsed.season));
          if (parsed.episode) params.set('episode', String(parsed.episode));
          if (parsed.translationId) params.set('translation', String(parsed.translationId));
          if (parsed.playerId) params.set('player', parsed.playerId);
          const savedTime = parsed.time || parsed.currentTime;
          if (savedTime && savedTime > 5) params.set('time', String(Math.floor(savedTime)));
          const qStr = params.toString();
          router.push(`/cinema/watch/${movieId}${qStr ? `?${qStr}` : ''}`);
          return;
        }
      } catch (e) {}
      router.push(`/cinema/watch/${movieId}`);
    };

    const continueWatchingMovies: Movie[] = watchHistory.map((item: WatchHistoryItem) => {
      const isSeries = item.type === 'series' || item.type === 'animeserial' || item.type === 'showserial' || (Boolean(item.season && item.season > 1)) || (Boolean(item.episode && item.episode > 1));
      const timeSec = item.time || item.currentTime || 0;

      let label = 'Продолжить';
      if (isSeries) {
        label = `Сезон ${item.season || 1}, Серия ${item.episode || 1}`;
      } else if (timeSec > 5) {
        const m = Math.floor(timeSec / 60);
        const s = Math.floor(timeSec % 60);
        label = `Продолжить (${m}:${s < 10 ? '0' : ''}${s})`;
      } else if (item.translationTitle) {
        label = item.translationTitle;
      } else {
        label = 'Фильм';
      }

      return {
        id: String(item.id),
        title: item.title || 'Видео',
        originalTitle: item.originalTitle || '',
        description: item.description || '',
        posterUrl: item.posterUrl || '',
        backdropUrl: item.backdropUrl || item.posterUrl || '',
        rating: item.rating ? String(item.rating) : undefined,
        year: item.year ? String(item.year) : '',
        ageRating: item.ageRating || '',
        duration: item.duration || '',
        quality: 'HD',
        genres: [label],
        type: item.type || 'movie',
      };
    });

    return (
      <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
        <CinemaHeader
          activeTab="all"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <AdblockBanner />

        {isLoading ? (
          <CinemaPageSkeleton />
        ) : searchQuery.trim() ? (
          <main className="w-full px-6 space-y-6 pt-3">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {lang?.frame_search_results || 'Результаты поиска'}: «{searchQuery}»
            </h2>

            {searchResults.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 space-y-3">
                <p className="text-lg font-medium">Ничего не найдено по вашему запросу</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {searchResults.map((movie, idx) => (
                  <MovieCard
                    key={`${movie.id}-${idx}`}
                    movie={movie}
                    onClick={() => goToMovieInfo(router, movie.id)}
                    onPlay={() => handleDirectPlay(movie.id)}
                  />
                ))}
              </div>
            )}
          </main>
        ) : (
          <>
            {/* HERO SLIDER WITH REAL MOVIES */}
            {heroMovies.length > 0 && (
              <HeroSlider
                heroMovies={heroMovies}
                onPlayMovie={(m) => handleDirectPlay(m.id)}
              />
            )}

            {/* MAIN CATALOG ROWS */}
            <main className="w-full px-3 lg:px-6 space-y-6 lg:space-y-12">
              {/* CONTINUE WATCHING ("ВЫ СМОТРЕЛИ") ROW */}
              {continueWatchingMovies.length > 0 && (
                <MovieRow
                  title="Вы смотрели"
                  movies={continueWatchingMovies}
                  onSelectMovie={(movie) => goToMovieInfo(router, movie.id, movie)}
                  onPlayMovie={(movie) => handleDirectPlay(movie.id)}
                />
              )}

              {/* TOP-10 WEEKLY ROW */}
              {topMovies.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {lang?.frame_top_10 || 'Топ-10 недели в Frame'}
                  </h2>
                  <div
                    ref={topScrollRef}
                    className="viewport dragscroll flex items-center gap-3 overflow-x-auto overflow-y-visible scrollbar-none -mx-3 px-3 lg:-mx-6 lg:px-6 py-3 select-none"
                  >
                    {topMovies.map((movie, idx) => (
                      <div key={`${movie.id}-${idx}`} className="flex-none w-40 sm:w-56">
                        <MovieCard
                          movie={movie}
                          rankNumber={idx + 1}
                          onClick={() => goToMovieInfo(router, movie.id, movie)}
                          onPlay={() => handleDirectPlay(movie.id)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* FRESH UPDATES STREAM */}
              {freshUpdates.length > 0 && (
                <MovieRow
                  title={lang?.frame_fresh_updates || 'Свежие эпизоды и обновления'}
                  movies={freshUpdates}
                  onSelectMovie={(movie) => goToMovieInfo(router, movie.id, movie)}
                  onPlayMovie={(movie) => handleDirectPlay(movie.id)}
                />
              )}

              {/* NEW MOVIES ROW */}
              {newReleases.length > 0 && (
                <MovieRow
                  title={lang?.frame_new_releases || 'Новинки кино'}
                  movies={newReleases}
                  onSelectMovie={(movie) => goToMovieInfo(router, movie.id, movie)}
                  onPlayMovie={(movie) => handleDirectPlay(movie.id)}
                />
              )}

              {/* POPULAR SERIES ROW */}
              {popularSeries.length > 0 && (
                <MovieRow
                  title={lang?.frame_popular_series || 'Популярные сериалы'}
                  movies={popularSeries}
                  onSelectMovie={(movie) => goToMovieInfo(router, movie.id, movie)}
                  onPlayMovie={(movie) => handleDirectPlay(movie.id)}
                />
              )}

              {/* CARTOONS & ANIMATION ROW */}
              {cartoonsList.length > 0 && (
                <MovieRow
                  title={lang?.frame_cartoons_section || 'Мультфильмы и анимация'}
                  movies={cartoonsList}
                  onSelectMovie={(movie) => goToMovieInfo(router, movie.id, movie)}
                  onPlayMovie={(movie) => handleDirectPlay(movie.id)}
                />
              )}

              {/* KOREAN DRAMAS & THRILLERS ROW */}
              {koreanDramas.length > 0 && (
                <MovieRow
                  title={lang?.frame_korean_dramas || 'Корейские дорамы и триллеры'}
                  movies={koreanDramas}
                  onSelectMovie={(movie) => goToMovieInfo(router, movie.id)}
                  onPlayMovie={(movie) => handleDirectPlay(movie.id)}
                />
              )}

              {/* ANIME ROW */}
              {animeList.length > 0 && (
                <MovieRow
                  title={lang?.frame_anime_collection || 'Коллекция аниме'}
                  movies={animeList}
                  onSelectMovie={(movie) => goToMovieInfo(router, movie.id)}
                  onPlayMovie={(movie) => handleDirectPlay(movie.id)}
                />
              )}

            </main>
          </>
        )}
      </div>
    );
  }
