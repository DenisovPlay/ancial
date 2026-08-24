'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getCinemaMyList, setCinemaMyList } from '../../lib/cache-helpers';
import { useNotification } from '../../context/NotificationContext';
import CinemaHeader from '../components/cinema-header';
import MovieCard from '../components/movie-card';
import AdblockBanner from '../components/adblock-banner';
import { Movie } from '../types';
import { useTvNavigation } from '../use-tv-navigation';
import { fetchCinemaSearch, fetchCinemaUpdates, cacheCinemaSearchResults, deduplicateCinemaList } from '../cinema-api';
import { goToMovieInfo } from '../cinema-navigation';
import { getCinemaCache, setCinemaCache } from '../cinema-cache';
import { CacheManager } from '../../lib/cache';

export default function SearchContent() {
  useTvNavigation();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState<string>(initialQuery);
  const [searchResults, setSearchResults] = useState<Movie[]>(() => {
    if (typeof window === 'undefined' || !initialQuery.trim()) return [];
    const trimmed = initialQuery.trim();
    const cacheKey = `cinema_v2_videos_page=1&limit=20&sort=-rating_kp%2C-rating_imdb&filter%5Btitle%5D=${encodeURIComponent(trimmed)}`;
    return (
      getCinemaCache<Movie[]>('search', trimmed) ||
      CacheManager.get<Movie[]>(`cinema_search_${trimmed}_all_p1`, { category: 'cinema', subcategory: 'search' }) ||
      CacheManager.get<Movie[]>(cacheKey, { category: 'cinema', subcategory: 'video' }) ||
      []
    );
  });
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>(() => {
    if (typeof window === 'undefined') return [];
    return getCinemaCache<Movie[]>('search', 'recommended') || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!initialQuery.trim()) return false;
    return searchResults.length === 0;
  });
  const [myListIds, setMyListIds] = useState<string[]>([]);

  // Update URL silently when query changes
  const updateUrlWithQuery = (newQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newQuery.trim()) {
      params.set('q', newQuery.trim());
    } else {
      params.delete('q');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    updateUrlWithQuery(newQuery);
  };

  const handleMovieClick = (movie: Movie) => {
    if (query.trim()) {
      cacheCinemaSearchResults(query.trim(), searchResults);
      setCinemaCache('search', query.trim(), searchResults);
    }
    goToMovieInfo(router, movie.id, movie);
  };

  // Load My List & Initial Recommendations
  useEffect(() => {
    const list = getCinemaMyList();
    // Гидратация из localStorage при монтировании — сеттлер здесь источник правды.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyListIds(list);

    // Check cached recommendations first for instant render
    const cachedRecs = getCinemaCache<Movie[]>('search', 'recommended');
    if (cachedRecs && cachedRecs.length > 0) {
      setRecommendedMovies(deduplicateCinemaList(cachedRecs));
    }

    // Revalidate recommendations in background
    (async () => {
      try {
        const data = await fetchCinemaUpdates({ skipCache: true });
        const rawList = [...(data.serials || []), ...(data.movies || [])];
        const list = deduplicateCinemaList(rawList).slice(0, 15);
        if (list.length > 0) {
          setRecommendedMovies(list);
          setCinemaCache('search', 'recommended', list);
        }
      } catch (err) {
        console.error('Failed to load initial search recommendations:', err);
      }
    })();
  }, []);

  // Fetch search results on query change with SWR (Instant Cache -> Background Revalidate)
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      // Пустой запрос — терминальное состояние.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    // 1. Instantly apply cached search results if available
    const cacheKey = `cinema_v2_videos_page=1&limit=20&sort=-rating_kp%2C-rating_imdb&filter%5Btitle%5D=${encodeURIComponent(trimmedQuery)}`;
    const cachedSearch =
      getCinemaCache<Movie[]>('search', trimmedQuery) ||
      CacheManager.get<Movie[]>(cacheKey, { category: 'cinema', subcategory: 'search' });

    if (cachedSearch && cachedSearch.length > 0) {
      setSearchResults(deduplicateCinemaList(cachedSearch));
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // 2. Background revalidate network fetch
    const timer = setTimeout(async () => {
      try {
        const results = await fetchCinemaSearch(trimmedQuery, undefined, 1, { skipCache: true });
        const cleanResults = deduplicateCinemaList(results);
        if (cleanResults && cleanResults.length > 0) {
          setSearchResults(cleanResults);
          setCinemaCache('search', trimmedQuery, cleanResults);
          cacheCinemaSearchResults(trimmedQuery, cleanResults);
        }
      } catch (err) {
        console.error('Search fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    handleQueryChange('');
  };

  const toggleMyList = (movieId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const isInList = myListIds.includes(movieId);
    const updated = isInList
      ? myListIds.filter((id) => id !== movieId)
      : [movieId, ...myListIds];
    
    setMyListIds(updated);
    setCinemaMyList(updated);
    
    showNote({
      content: isInList
        ? (lang?.frame_note_removed || 'Удалено из Моего списка')
        : (lang?.frame_note_added || 'Добавлено в Мой список'),
      type: isInList ? 'info' : 'success',
      time: 3,
    });
  };

  const displayMovies = query.trim() ? searchResults : recommendedMovies;

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader searchQuery={query} onSearchChange={handleQueryChange} />
      <AdblockBanner />

      <main className="w-full p-3 lg:p-6 space-y-6">
        <div className="w-full space-y-6">
          {/* STICKY SEARCH INPUT BAR MATCHING /FRIENDS AND /GROUPS */}
          <div className="sticky top-14 lg:top-16 z-[90] bg-gradient-to-b from-transparent via-black/90 to-transparent -mx-3 px-3 lg:mx-0 lg:px-0">
            <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-600/30 backdrop-blur-md rounded-full w-full px-4 h-12">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                tabIndex={0}
                data-search-page-input="true"
                className="bg-transparent w-full text-base font-medium text-white placeholder-zinc-500 focus:outline-none border-none outline-none focus:ring-0"
                placeholder={lang?.frame_search_placeholder || 'Введите название...'}
                autoComplete="off"
              />
              {query ? (
                <button
                  onClick={handleClear}
                  type="button"
                  className="cursor-pointer shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-700/50"
                  aria-label="Очистить"
                >
                  <svg className="w-5 h-5 fill-zinc-400" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              ) : (
                <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                  <svg className="w-5 h-5 fill-zinc-400" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* RESULTS TITLE */}
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {query.trim()
                ? `${lang?.frame_search_results || 'Результаты'}: «${query}»`
                : 'Рекомендуем посмотреть'}
            </h2>
            {query.trim() && searchResults.length > 0 && (
              <span className="text-zinc-500 font-bold text-sm">
                Найдено: {searchResults.length}
              </span>
            )}
          </div>

          {/* RESULTS CONTAINER WITH DATA-SEARCH-RESULTS */}
          <div data-search-results="true">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 animate-pulse">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-3xl bg-zinc-900/80 border border-white/5" />
                ))}
              </div>
            ) : query.trim() && searchResults.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 space-y-3 bg-zinc-950/50 border border-zinc-900 rounded-3xl">
                <svg className="w-12 h-12 fill-zinc-600 mx-auto" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <p className="text-lg font-bold text-zinc-400">Ничего не найдено</p>
                <p className="text-sm text-zinc-600">Проверьте название фильма или сериала</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {displayMovies.map((movie, index) => (
                  <MovieCard
                    key={`${movie.id}-${index}`}
                    movie={movie}
                    isInMyList={myListIds.includes(movie.id)}
                    onToggleList={(e) => toggleMyList(movie.id, e)}
                    onClick={() => handleMovieClick(movie)}
                    onPlay={() => handleMovieClick(movie)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
