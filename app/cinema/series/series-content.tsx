'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import CinemaHeader from '../components/cinema-header';
import MovieCard from '../components/movie-card';
import GenreChips, { SERIES_GENRES } from '../components/genre-chips';
import { Movie } from '../types';
import { useTvNavigation } from '../use-tv-navigation';
import { fetchCinemaSearch, fetchCinemaGetVideo } from '../cinema-api';
import { CinemaGridSkeleton, CinemaRowSkeleton } from '../components/cinema-skeleton';

export default function SeriesContent() {
  useTvNavigation();
  const { lang } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [series, setSeries] = useState<Movie[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadInitialSeries() {
      setIsLoading(true);
      setPage(1);
      let data: Movie[] = [];
      if (selectedGenre === 'all') {
        data = await fetchCinemaSearch('', 'serial', 1, { orderby: 'created_at', orderby_direction: 'desc' });
      } else {
        data = await fetchCinemaGetVideo({ genres: selectedGenre, type: 'serial', page: 1, limit: 20 });
      }

      if (isMounted) {
        setSeries(data);
        setHasMore(data.length >= 10);
        setIsLoading(false);
      }
    }
    loadInitialSeries();

    return () => {
      isMounted = false;
    };
  }, [selectedGenre]);

  const handleLoadNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore || searchQuery.trim()) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    let newItems: Movie[] = [];

    if (selectedGenre === 'all') {
      newItems = await fetchCinemaSearch('', 'serial', nextPage, { orderby: 'created_at', orderby_direction: 'desc' });
    } else {
      newItems = await fetchCinemaGetVideo({ genres: selectedGenre, type: 'serial', page: nextPage, limit: 20 });
    }

    if (newItems.length > 0) {
      setSeries((prev) => {
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

  const filteredSeries = series.filter((m) =>
    searchQuery
      ? m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.originalTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader
        activeTab="series"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="w-full px-3 lg:px-6 space-y-6 pt-3">
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {lang?.frame_tab_series || 'Сериалы'}
        </h1>

        {/* COLORFUL GENRE CHIPS WITH ICONS */}
        <GenreChips
          genres={SERIES_GENRES}
          selectedId={selectedGenre}
          onSelect={setSelectedGenre}
        />

        {isLoading ? (
          <CinemaGridSkeleton />
        ) : filteredSeries.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p className="text-lg font-medium">Сериалы не найдены</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredSeries.map((movie, idx) => (
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
