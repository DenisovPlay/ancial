'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import CinemaHeader from '../../components/cinema-header';
import MovieCard from '../../components/movie-card';
import { Movie, Person } from '../../types';
import { useTvNavigation } from '../../use-tv-navigation';
import { fetchCinemaPersonById, getOptimizedImageUrl } from '../../cinema-api';
import { CinemaGridSkeleton } from '../../components/cinema-skeleton';
import { getCinemaCache, setCinemaCache } from '../../cinema-cache';

import { goToMovieInfo } from '../../cinema-navigation';

interface PersonContentProps {
  personId: string;
}

export default function PersonContent({ personId }: PersonContentProps) {
  useTvNavigation();
  const { lang } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialName = searchParams.get('name') || undefined;
  const initialPoster = searchParams.get('poster') || undefined;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [person, setPerson] = useState<Person | null>(() => {
    if (initialName) {
      return {
        id: personId,
        name_ru: initialName,
        poster_url: initialPoster || '/img/branding/frame.svg',
        role: 'actor',
      };
    }
    return null;
  });
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!person);

  useEffect(() => {
    let isMounted = true;

    const cachedPersonResult = getCinemaCache<{ person: Person; movies: Movie[] }>('person', personId);
    if (cachedPersonResult) {
      // Гидратация из кэша при монтировании — синхронный сеттлер здесь и есть
      // источник правды, альтернативы без каскада нет.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPerson(cachedPersonResult.person);
      setMovies(cachedPersonResult.movies || []);
      setIsLoading(false);
    } else if (!person) {
      setIsLoading(true);
    }

    async function loadPersonData() {
      try {
        const result = await fetchCinemaPersonById(personId, undefined, initialName, initialPoster);
        if (isMounted && result) {
          setPerson(result.person);
          setMovies(result.movies || []);
          setCinemaCache('person', personId, result);
        }
      } catch (err) {
        console.error('Failed to load person data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (personId) {
      loadPersonData();
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-загрузка по personId: person приходит из SSR-пропсов, повтор не нужен
  }, [personId, initialName, initialPoster]);

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showBackButton={true}
        onBack={() => router.push('/cinema')}
      />

      <main className="w-full px-3 lg:px-6 space-y-8 pt-4">
        {isLoading ? (
          <CinemaGridSkeleton />
        ) : !person ? (
          <div className="py-20 text-center text-zinc-500 space-y-4">
            <h1 className="text-2xl font-bold">{lang?.frame_person_not_found || 'Персона не найдена'}</h1>
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
            >
              Вернуться назад
            </button>
          </div>
        ) : (
          <>
            {/* PERSON HEADER CARD */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-zinc-900/60 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
              {/* PERSON PHOTO */}
              <div className="w-36 h-48 sm:w-44 sm:h-56 rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 shrink-0 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getOptimizedImageUrl(person.poster_url, '@w300')}
                  alt={person.name_ru || person.name_en || 'Персона'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = '/img/branding/frame.svg';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* PERSON META */}
              <div className="space-y-3 text-center md:text-left flex-1">
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  {person.role === 'director' ? (lang?.frame_director || 'Режиссер') : (lang?.frame_cast || 'Актер')}
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                  {person.name_ru || person.name_en}
                </h1>
                {person.name_en && person.name_ru && (
                  <p className="text-lg text-zinc-400 font-medium">{person.name_en}</p>
                )}
                <p className="text-sm text-zinc-500 font-medium pt-2">
                  {lang?.frame_person_filmography || 'Фильмография и роли'} ({movies.length})
                </p>
              </div>
            </div>

            {/* FILMOGRAPHY GRID */}
            <section className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {lang?.frame_person_filmography || 'Фильмография и роли'}
              </h2>

              {movies.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <p className="text-base font-medium">Фильмы с этой персоной подгружаются или временно отсутствуют в каталоге</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {movies.map((movie, idx) => (
                    <MovieCard
                      key={`${movie.id}-${idx}`}
                      movie={movie}
                      onClick={() => goToMovieInfo(router, movie.id, movie)}
                      onPlay={() => router.push(`/cinema/watch/${movie.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
