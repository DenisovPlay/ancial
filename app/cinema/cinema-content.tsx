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
} from './cinema-api';
import { CinemaPageSkeleton } from './components/cinema-skeleton';

export default function CinemaContent() {
  useTvNavigation();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [myListIds, setMyListIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [topMovies, setTopMovies] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>([]);
  const [popularSeries, setPopularSeries] = useState<Movie[]>([]);
  const [animeList, setAnimeList] = useState<Movie[]>([]);
  const [documentaryMovies, setDocumentaryMovies] = useState<Movie[]>([]);
  const [retroMovies, setRetroMovies] = useState<Movie[]>([]);
  const [worldCinema, setWorldCinema] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  // Load real API content on mount
  useEffect(() => {
    let isMounted = true;

    async function loadRealCinemaData() {
      setIsLoading(true);
      try {
        const [updates, page1Movies, page2Movies, series, anime, page3Movies, page4Movies, page5Movies] = await Promise.all([
          fetchCinemaUpdates(),
          fetchCinemaSearch('', 'movie', 1),
          fetchCinemaSearch('', 'movie', 2),
          fetchCinemaSearch('', 'serial', 1),
          fetchCinemaSearch('', 'anime', 1),
          fetchCinemaSearch('', 'movie', 3),
          fetchCinemaSearch('', 'movie', 4),
          fetchCinemaSearch('', 'movie', 5),
        ]);

        if (!isMounted) return;

        // Hero slides: fresh updates
        const combinedHero = [...updates.movies, ...updates.serials, ...page1Movies].slice(0, 5);
        setHeroMovies(combinedHero.length > 0 ? combinedHero : page1Movies.slice(0, 5));

        // 1. Top 10 Weekly: Page 1 Movies
        setTopMovies(page1Movies.slice(0, 10));

        // 2. New Releases: Page 2 Movies (completely unique)
        setNewReleases(page2Movies.slice(0, 15));

        // 3. Popular Series: Real Series
        setPopularSeries(series.slice(0, 15));

        // 4. Anime: Real Anime Collection
        setAnimeList(anime.slice(0, 15));

        // 5. Documentary & Drama: Page 3 Movies
        setDocumentaryMovies(page3Movies.slice(0, 15));

        // 6. Retro & Classic: Page 4 Movies
        setRetroMovies(page4Movies.slice(0, 15));

        // 7. World Cinema Hits: Page 5 Movies
        setWorldCinema(page5Movies.slice(0, 15));
      } catch (err) {
        console.error('Failed to load cinema API data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRealCinemaData();

    // Load user list from localStorage
    try {
      const savedList = localStorage.getItem('frame_my_list');
      if (savedList) setMyListIds(JSON.parse(savedList));
    } catch (e) { }

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
              {searchResults.map((movie) => (
                <MovieCard
                  key={movie.id}
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
            {/* TOP-10 WEEKLY ROW */}
            {topMovies.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {lang?.frame_top_10 || 'Топ-10 недели в Frame'}
                </h2>
                <div className="flex items-center gap-3 overflow-x-auto overflow-y-visible scrollbar-none -mx-6 px-6 py-3">
                  {topMovies.map((movie, idx) => (
                    <div key={movie.id} className="flex-none w-44 sm:w-56">
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

            {/* NEW MOVIES ROW (PAGE 2) */}
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

            {/* DOCUMENTARY & DRAMAS ROW (PAGE 3) */}
            {documentaryMovies.length > 0 && (
              <MovieRow
                title="Драмы и захватывающие истории"
                movies={documentaryMovies}
                myListIds={myListIds}
                onToggleList={toggleMyList}
                onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
              />
            )}

            {/* RETRO & CLASSIC ROW (PAGE 4) */}
            {retroMovies.length > 0 && (
              <MovieRow
                title="Мировая классика и культовое кино"
                movies={retroMovies}
                myListIds={myListIds}
                onToggleList={toggleMyList}
                onSelectMovie={(movie) => router.push(`/cinema/info/${movie.id}`)}
                onPlayMovie={(movie) => router.push(`/cinema/watch/${movie.id}`)}
              />
            )}

            {/* WORLD CINEMA ROW (PAGE 5) */}
            {worldCinema.length > 0 && (
              <MovieRow
                title="Шедевры мирового кинематографа"
                movies={worldCinema}
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
          </main>
        </>
      )}
    </div>
  );
}
