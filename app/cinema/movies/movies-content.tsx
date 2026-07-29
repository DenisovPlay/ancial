'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import CinemaHeader from '../components/cinema-header';
import MovieCard from '../components/movie-card';
import GenreChips, { MOVIE_GENRES } from '../components/genre-chips';
import { Movie } from '../types';
import { useTvNavigation } from '../use-tv-navigation';
import { fetchCinemaSearch, fetchCinemaGetVideo } from '../cinema-api';
import { CinemaGridSkeleton, CinemaRowSkeleton } from '../components/cinema-skeleton';

export default function MoviesContent() {
  useTvNavigation();
  const { lang } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  // Load initial movies on genre change
  useEffect(() => {
    let isMounted = true;
    async function loadInitialMovies() {
      setIsLoading(true);
      setPage(1);
      let data: Movie[] = [];
      if (selectedGenre === 'all') {
        data = await fetchCinemaSearch('', 'movie', 1, { orderby: 'created_at', orderby_direction: 'desc' });
      } else {
        data = await fetchCinemaGetVideo({ genres: selectedGenre, type: 'movie', page: 1, limit: 20 });
      }

      if (isMounted) {
        setMovies(data);
        setHasMore(data.length >= 10);
        setIsLoading(false);
      }
    }

    loadInitialMovies();

    return () => {
      isMounted = false;
    };
  }, [selectedGenre]);

  // Load next unique page
  const handleLoadNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore || searchQuery.trim()) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    let newItems: Movie[] = [];

    if (selectedGenre === 'all') {
      newItems = await fetchCinemaSearch('', 'movie', nextPage, { orderby: 'created_at', orderby_direction: 'desc' });
    } else {
      newItems = await fetchCinemaGetVideo({ genres: selectedGenre, type: 'movie', page: nextPage, limit: 20 });
    }

    if (newItems.length > 0) {
      setMovies((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueItems = newItems.filter((m) => !existingIds.has(m.id));
        return [...prev, ...uniqueItems];
      });
      setPage(nextPage);
      if (newItems.length < 5) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, searchQuery, page, selectedGenre]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );

    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [handleLoadNextPage, hasMore, isLoading, isLoadingMore]);

  const filteredMovies = movies.filter((m) =>
    searchQuery
      ? m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.originalTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader
        activeTab="movie"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="w-full px-3 lg:px-6 space-y-6 pt-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {lang?.frame_tab_movies || 'Фильмы'}
          </h1>
        </div>

        {/* COLORFUL GENRE CHIPS WITH ICONS */}
        <GenreChips
          genres={MOVIE_GENRES}
          selectedId={selectedGenre}
          onSelect={setSelectedGenre}
        />

        {isLoading ? (
          <CinemaGridSkeleton />
        ) : filteredMovies.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p className="text-lg font-medium">Фильмы не найдены</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredMovies.map((movie, idx) => (
                <MovieCard
                  key={`${movie.id}-${idx}`}
                  movie={movie}
                  onClick={() => router.push(`/cinema/info/${movie.id}`)}
                  onPlay={() => router.push(`/cinema/info/${movie.id}`)}
                />
              ))}
            </div>

            {/* INFINITE SCROLL LOADER SENTINEL */}
            {hasMore && !searchQuery.trim() && (
              <div ref={loadMoreTriggerRef} className="pt-8">
                {isLoadingMore && <CinemaRowSkeleton />}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
