'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import CinemaHeader from '../components/cinema-header';
import MovieCard from '../components/movie-card';
import GenreChips, { ANIME_GENRES } from '../components/genre-chips';
import { Movie } from '../types';
import { useTvNavigation } from '../use-tv-navigation';
import { fetchCinemaSearch, fetchCinemaGetVideo } from '../cinema-api';
import { CinemaGridSkeleton, CinemaRowSkeleton } from '../components/cinema-skeleton';
import { getCinemaCache, setCinemaCache } from '../cinema-cache';

import { goToMovieInfo } from '../cinema-navigation';

export default function AnimeContent() {
  useTvNavigation();
  const { lang } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [animeList, setAnimeList] = useState<Movie[]>([]);
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

    const cachedAnime = getCinemaCache<Movie[]>('catalog_anime', selectedGenre);
    if (cachedAnime && cachedAnime.length > 0) {
      setAnimeList(cachedAnime);
      setHasMore(cachedAnime.length >= 10);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    async function loadInitialAnime() {
      try {
        let data: Movie[] = [];
        if (selectedGenre === 'all') {
          data = await fetchCinemaGetVideo({ genres: 'аниме', page: 1, limit: 20 });
        } else {
          data = await fetchCinemaGetVideo({ genres: `аниме,${selectedGenre}`, page: 1, limit: 20 });
        }

        if (isMounted && data) {
          setAnimeList(data);
          setHasMore(data.length >= 10);
          setCinemaCache('catalog_anime', selectedGenre, data);
        }
      } catch (err) {
        console.warn('loadInitialAnime error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadInitialAnime();

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
      newItems = await fetchCinemaGetVideo({ genres: 'аниме', page: nextPage, limit: 20 });
    } else {
      newItems = await fetchCinemaGetVideo({ genres: `аниме,${selectedGenre}`, page: nextPage, limit: 20 });
    }

    if (newItems.length > 0) {
      setAnimeList((prev) => {
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

  const filteredAnime = animeList.filter((m) =>
    searchQuery
      ? m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.originalTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader
        activeTab="anime"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="w-full px-3 lg:px-6 space-y-6 pt-3">
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {lang?.frame_tab_anime || 'Аниме'}
        </h1>

        {/* COLORFUL GENRE CHIPS WITH ICONS */}
        <GenreChips
          genres={ANIME_GENRES}
          selectedId={selectedGenre}
          onSelect={setSelectedGenre}
        />

        {isLoading ? (
          <CinemaGridSkeleton />
        ) : filteredAnime.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p className="text-lg font-medium">Аниме не найдено</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredAnime.map((movie, idx) => (
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
