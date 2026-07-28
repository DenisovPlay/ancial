'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import CinemaHeader from '../components/cinema-header';
import MovieCard from '../components/movie-card';
import AdblockBanner from '../components/adblock-banner';
import { Movie } from '../types';
import { useTvNavigation } from '../use-tv-navigation';
import { fetchCinemaSearch, fetchCinemaUpdates, cacheCinemaSearchResults } from '../cinema-api';

// VIRTUAL KEYBOARD LAYOUTS FOR TV
const RU_LAYOUT = [
  ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
  ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
  ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю'],
];

const EN_LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const NUM_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
  ['.', ',', '?', '!', "'", '#', '%', '*', '+', '='],
];

export default function SearchContent() {
  useTvNavigation();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState<string>(initialQuery);
  const [layoutMode, setLayoutMode] = useState<'ru' | 'en' | '123'>('ru');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
      // Кэшируем результаты только если пользователь закончил ввод и кликнул на фильм
      cacheCinemaSearchResults(query.trim(), searchResults);
    }
    router.push(`/cinema/info/${movie.id}`);
  };

  // Load My List & Initial Recommendations
  useEffect(() => {
    try {
      const stored = localStorage.getItem('frame_my_list');
      if (stored) {
        setMyListIds(JSON.parse(stored));
      }
    } catch (e) {}

    // Load recommendations for initial view
    (async () => {
      try {
        const data = await fetchCinemaUpdates();
        setRecommendedMovies(data.movies || data.serials || []);
      } catch (err) {
        console.error('Failed to load initial search recommendations:', err);
      }
    })();
  }, []);

  // Fetch search results on query change
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await fetchCinemaSearch(query.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Search fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleVirtualKeyPress = (char: string) => {
    handleQueryChange(query + char);
  };

  const handleBackspace = () => {
    handleQueryChange(query.slice(0, -1));
  };

  const handleClear = () => {
    handleQueryChange('');
  };

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
    } catch (err) {}
  };

  const currentRows =
    layoutMode === 'ru' ? RU_LAYOUT : layoutMode === 'en' ? EN_LAYOUT : NUM_LAYOUT;

  const displayMovies = query.trim() ? searchResults : recommendedMovies;

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader searchQuery={query} onSearchChange={handleQueryChange} />
      <AdblockBanner />

      <main className="w-full p-3 lg:p-6 space-y-6">
        {/* SPLIT SCREEN LAYOUT: RESULTS LEFT (60%), KEYBOARD RIGHT (40%) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT SIDE: INPUT & RESULTS */}
          <div className="w-full lg:w-7/12 xl:w-2/3 space-y-6 order-2 lg:order-1">
            {/* SEARCH INPUT BAR WITH DATA-SEARCH-PAGE-INPUT */}
            <div className="relative flex items-center justify-between bg-zinc-900/90 border border-zinc-700/60 focus-within:border-white focus-within:ring-2 focus-within:ring-white rounded-3xl p-2 px-5 transition-all shadow-2xl">
              <div className="flex items-center gap-4 w-full">
                <svg className="w-6 h-6 fill-zinc-400 shrink-0">
                  <use href="/icons.svg#IC-search"></use>
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  tabIndex={0}
                  data-search-page-input="true"
                  className="focusable-tv bg-transparent w-full text-lg sm:text-xl font-bold text-white placeholder-zinc-500 outline-none focus:outline-none"
                  placeholder={lang?.frame_search_placeholder || 'Введите название...'}
                />
              </div>
              {query && (
                <button
                  onClick={handleClear}
                  tabIndex={0}
                  className="focusable-tv p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:bg-zinc-800 shrink-0"
                  aria-label="Очистить"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              )}
            </div>

            {/* RESULTS TITLE */}
            <div className="flex items-center justify-between">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] rounded-3xl bg-zinc-900/80 border border-white/5" />
                  ))}
                </div>
              ) : query.trim() && searchResults.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 space-y-3 bg-zinc-950/50 border border-zinc-900 rounded-3xl">
                  <svg className="w-12 h-12 fill-zinc-600 mx-auto" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                  <p className="text-lg font-bold text-zinc-400">Ничего не найдено</p>
                  <p className="text-sm text-zinc-600">Проверьте название или раскладку клавиатуры</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
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

          {/* RIGHT SIDE: ON-SCREEN VIRTUAL KEYBOARD WITH DATA-VKEY-PANEL */}
          <div data-vkey-panel="true" className="w-full lg:w-5/12 xl:w-1/3 order-1 lg:order-2 lg:sticky lg:top-20">
            <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-4 sm:p-5 backdrop-blur-xl space-y-4 shadow-2xl">
              
              {/* TOP ACTION ROW: RU / ENG / 123 / SPACE / BACKSPACE */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setLayoutMode('ru')}
                    tabIndex={0}
                    data-leftmost-vkey="true"
                    className="focusable-tv px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105"
                  >
                    РУС
                  </button>

                  <button
                    onClick={() => setLayoutMode('en')}
                    tabIndex={0}
                    className={`focusable-tv px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 ${
                      layoutMode === 'en'
                        ? 'bg-white text-black shadow-md'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    ENG
                  </button>

                  <button
                    onClick={() => setLayoutMode('123')}
                    tabIndex={0}
                    className={`focusable-tv px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 ${
                      layoutMode === '123'
                        ? 'bg-white text-black shadow-md'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    123
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleVirtualKeyPress(' ')}
                    tabIndex={0}
                    className="focusable-tv px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 focus:bg-white focus:text-black"
                  >
                    Пробел
                  </button>

                  <button
                    onClick={handleBackspace}
                    tabIndex={0}
                    className="focusable-tv px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all duration-200 cursor-pointer flex items-center gap-1 outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 focus:bg-white focus:text-black"
                    aria-label="Стереть"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* CHARACTER KEYS ROWS */}
              <div className="space-y-1.5 pt-1">
                {currentRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex justify-center items-center gap-1 sm:gap-1.5">
                    {row.map((char, colIdx) => (
                      <button
                        key={char}
                        onClick={() => handleVirtualKeyPress(char)}
                        tabIndex={0}
                        data-leftmost-vkey={colIdx === 0 ? 'true' : 'false'}
                        className="focusable-tv h-9 w-7 sm:w-9 sm:h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-sm sm:text-base flex items-center justify-center transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-110 focus:bg-white focus:text-black shadow-md shrink-0"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
