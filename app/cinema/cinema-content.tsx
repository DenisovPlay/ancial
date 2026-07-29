'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import CinemaHeader from './components/cinema-header';
import HeroSlider from './components/hero-slider';
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

import { getCinemaCache, setCinemaCache } from './cinema-cache';

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
  documentary: Movie[];
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
  const [documentaryMovies, setDocumentaryMovies] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  // Load user list & watch history from localStorage
  useEffect(() => {
    try {
      const savedList = localStorage.getItem('frame_my_list');
      if (savedList) setMyListIds(JSON.parse(savedList));

      const savedHistory = localStorage.getItem('cinema_watch_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWatchHistory(parsed);
        }
      }
    } catch (e) { }
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
      setDocumentaryMovies(cachedBundle.documentary || []);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // 2. Background revalidate
    async function loadRealCinemaData() {
      try {
        const [
          heroItems,
          top10Items,
          freshMovies,
          freshSeries,
          updatesRes,
          cartoonsItems,
          koreanItems,
          animeItems,
          page2Movies,
        ] = await Promise.all([
          // 1. Hero Slider: Latest releases sorted by date added (-created_at)
          fetchCinemaVideos({ page: 1, limit: 10, sort: '-created_at' }),
          // 2. Top 10: Top rated movies/series sorted by popularity (-rating_kp,-rating_imdb)
          fetchCinemaVideos({ page: 1, limit: 10, sort: '-rating_kp,-rating_imdb' }),
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
          // 9. World Cinema (page 2)
          fetchCinemaVideos({ page: 2, limit: 15, sort: '-rating_kp', type: 'movie' }),
        ]);

        if (!isMounted) return;

        const hero = heroItems.slice(0, 5);
        const top = top10Items.length >= 10 ? top10Items.slice(0, 10) : top10Items;
        const newRel = freshMovies.slice(0, 15);
        const popSer = freshSeries.slice(0, 15);
        const updatesList = [...(updatesRes.serials || []), ...(updatesRes.movies || [])].slice(0, 15);
        const cartoons = cartoonsItems.slice(0, 15);
        const korean = koreanItems.slice(0, 15);
        const anime = animeItems.slice(0, 15);
        const doc = page2Movies.slice(0, 15);

        setHeroMovies(hero);
        setTopMovies(top);
        setNewReleases(newRel);
        setPopularSeries(popSer);
        setFreshUpdates(updatesList);
        setCartoonsList(cartoons);
        setKoreanDramas(korean);
        setAnimeList(anime);
        setDocumentaryMovies(doc);

        setCinemaCache<HomeCinemaBundle>('home_bundle', undefined, {
          hero,
          top,
          newReleases: newRel,
          popularSeries: popSer,
          freshUpdates: updatesList,
          cartoons,
          korean,
          anime,
          documentary: doc,
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

    const toggleMyList = (movieId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      let updated: string[];
      if (myListIds.includes(movieId)) {
        updated = myListIds.filter((id) => id !== movieId);
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

    const continueWatchingMovies: Movie[] = watchHistory.map((item) => ({
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
      genres: item.season && item.episode ? [`Сезон ${item.season}, Серия ${item.episode}`] : ['Продолжить'],
      type: item.type || 'movie',
    }));

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
                    isInMyList={myListIds.includes(movie.id)}
                    onToggleList={(e) => toggleMyList(movie.id, e)}
                    onClick={() => router.push(`/cinema/info/${movie.id}`)}
                    onPlay={() => router.push(`/cinema/watch/${movie.id}`)}
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
                myListIds={myListIds}
                onToggleList={toggleMyList}
                onPlayMovie={(m) => router.push(`/cinema/watch/${m.id}`)}
              />
            )}

            {/* MAIN CATALOG ROWS */}
            <main className="w-full px-3 lg:px-6 space-y-6 lg:space-y-12">
              {/* CONTINUE WATCHING ("ВЫ СМОТРЕЛИ") ROW */}
              {continueWatchingMovies.length > 0 && (
                <MovieRow
                  title="Вы смотрели"
                  movies={continueWatchingMovies}
                  myListIds={myListIds}
                  onToggleList={toggleMyList}
                  onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                  onPlayMovie={(movie) => {
                    const saved = watchHistory.find((h) => String(h.id) === String(movie.id));
                    const query = saved?.season ? `?season=${saved.season}&episode=${saved.episode || 1}` : '';
                    router.push(`/cinema/watch/${movie.id}${query}`);
                  }}
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
                          isInMyList={myListIds.includes(movie.id)}
                          onToggleList={(e) => toggleMyList(movie.id, e)}
                          onClick={() => router.push(`/cinema/info/${movie.id}`)}
                          onPlay={() => router.push(`/cinema/watch/${movie.id}`)}
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
                  myListIds={myListIds}
                  onToggleList={toggleMyList}
                  onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                  onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
                />
              )}

              {/* NEW MOVIES ROW */}
              {newReleases.length > 0 && (
                <MovieRow
                  title={lang?.frame_new_releases || 'Новинки кино'}
                  movies={newReleases}
                  myListIds={myListIds}
                  onToggleList={toggleMyList}
                  onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                  onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
                />
              )}

              {/* POPULAR SERIES ROW */}
              {popularSeries.length > 0 && (
                <MovieRow
                  title={lang?.frame_popular_series || 'Популярные сериалы'}
                  movies={popularSeries}
                  myListIds={myListIds}
                  onToggleList={toggleMyList}
                  onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                  onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
                />
              )}

              {/* CARTOONS & ANIMATION ROW */}
              {cartoonsList.length > 0 && (
                <MovieRow
                  title={lang?.frame_cartoons_section || 'Мультфильмы и анимация'}
                  movies={cartoonsList}
                  myListIds={myListIds}
                  onToggleList={toggleMyList}
                  onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                  onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
                />
              )}

              {/* KOREAN DRAMAS & THRILLERS ROW */}
              {koreanDramas.length > 0 && (
                <MovieRow
                  title={lang?.frame_korean_dramas || 'Корейские дорамы и триллеры'}
                  movies={koreanDramas}
                  myListIds={myListIds}
                  onToggleList={toggleMyList}
                  onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                  onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
                />
              )}

              {/* ANIME ROW */}
              {animeList.length > 0 && (
                <MovieRow
                  title={lang?.frame_anime_collection || 'Коллекция аниме'}
                  movies={animeList}
                  myListIds={myListIds}
                  onToggleList={toggleMyList}
                  onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                  onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
                />
              )}

              {/* DOCUMENTARY & DRAMAS ROW */}
              {documentaryMovies.length > 0 && (
                <MovieRow
                  title="Шедевры кинематографа"
                  movies={documentaryMovies}
                  myListIds={myListIds}
                  onToggleList={toggleMyList}
                  onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                  onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
                />
              )}

            </main>
          </>
        )}
      </div>
    );
  }
