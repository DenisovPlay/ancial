'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import CinemaHeader from '../components/cinema-header';
import MovieCard from '../components/movie-card';
import GenreChips, { CARTOON_GENRES } from '../components/genre-chips';
import { Movie } from '../types';
import { useTvNavigation } from '../use-tv-navigation';
import { fetchCinemaCartoons } from '../cinema-api';
import { CinemaGridSkeleton, CinemaRowSkeleton } from '../components/cinema-skeleton';
import { getCinemaCache, setCinemaCache } from '../cinema-cache';

import { goToMovieInfo } from '../cinema-navigation';

export default function CartoonsContent() {
  useTvNavigation();
  const { lang } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [cartoonsList, setCartoonsList] = useState<Movie[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Смена жанра сбрасывает пагинацию — сеттлер здесь источник правды.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);

    const cachedCartoons = getCinemaCache<Movie[]>('catalog_cartoons', selectedGenre);
    if (cachedCartoons && cachedCartoons.length > 0) {
      setCartoonsList(cachedCartoons);
      setHasMore(cachedCartoons.length >= 10);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    async function loadInitialCartoons() {
      try {
        const genreParam = selectedGenre === 'all' ? undefined : selectedGenre;
        const data = await fetchCinemaCartoons({ page: 1, limit: 20, genre: genreParam });

        if (isMounted && data) {
          setCartoonsList(data);
          setHasMore(data.length >= 10);
          setCinemaCache('catalog_cartoons', selectedGenre, data);
        }
      } catch (err) {
        console.warn('loadInitialCartoons error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadInitialCartoons();

    return () => {
      isMounted = false;
    };
  }, [selectedGenre]);

  const handleLoadNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore || searchQuery.trim()) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const genreParam = selectedGenre === 'all' ? undefined : selectedGenre;
    const newItems = await fetchCinemaCartoons({ page: nextPage, limit: 20, genre: genreParam });

    if (newItems.length > 0) {
      setCartoonsList((prev) => {
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

  const filteredCartoons = cartoonsList.filter((m) =>
    searchQuery
      ? m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.originalTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader
        activeTab="cartoons"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="w-full px-3 lg:px-6 space-y-6 pt-3">
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {lang?.frame_tab_cartoons || 'Мультфильмы'}
        </h1>

        {/* COLORFUL GENRE CHIPS WITH ICONS */}
        <GenreChips
          genres={CARTOON_GENRES}
          selectedId={selectedGenre}
          onSelect={setSelectedGenre}
        />

        {isLoading ? (
          <CinemaGridSkeleton />
        ) : filteredCartoons.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p className="text-lg font-medium">Мультфильмы не найдены</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredCartoons.map((movie, idx) => (
                <MovieCard
                  key={`${movie.id}-${idx}`}
                  movie={movie}
                  onClick={() => goToMovieInfo(router, movie.id, movie)}
                  onPlay={() => goToMovieInfo(router, movie.id, movie)}
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
