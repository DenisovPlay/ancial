'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import CinemaHeader from '../../components/cinema-header';
import MovieRow from '../../components/movie-row';
import { Movie } from '../../types';
import { useTvNavigation } from '../../use-tv-navigation';
import { fetchCinemaVideoById, fetchCinemaSearch } from '../../cinema-api';
import { CinemaInfoSkeleton, FrameBrandLoader } from '../../components/cinema-skeleton';

interface InfoContentProps {
  id: string;
}

export default function InfoContent({ id }: InfoContentProps) {
  useTvNavigation();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [myListIds, setMyListIds] = useState<string[]>([]);
  const [infoMovie, setInfoMovie] = useState<Movie | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadMovieInfo() {
      setIsLoading(true);
      const target = await fetchCinemaVideoById(id);
      if (isMounted && target) {
        setInfoMovie(target);
        // Load similar content
        const similar = await fetchCinemaSearch('', target.type === 'series' ? 'serial' : 'movie');
        if (isMounted) {
          setSimilarMovies(similar.filter((m) => m.id !== target.id).slice(0, 10));
        }
      }
      if (isMounted) {
        setIsLoading(false);
        setTimeout(() => {
          const backBtn = document.querySelector<HTMLElement>('[data-cinema-back="true"]');
          if (backBtn) backBtn.focus();
        }, 50);
      }
    }

    loadMovieInfo();

    try {
      const savedList = localStorage.getItem('frame_my_list');
      if (savedList) setMyListIds(JSON.parse(savedList));
    } catch (e) { }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const toggleMyList = (movieId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: string[];
    if (myListIds.includes(movieId)) {
      updated = myListIds.filter((i) => i !== movieId);
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

  if (isLoading) {
    return <CinemaInfoSkeleton />;
  }

  if (!infoMovie) {
    return (
      <div className="min-h-screen bg-black text-white p-12 flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Видео не найдено</h2>
        <button
          onClick={() => router.push('/cinema')}
          className="px-6 py-2 rounded-full bg-white text-black font-bold"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white select-none pb-24 font-sans">
      <CinemaHeader
        activeTab="all"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showBackButton
        onBack={() => router.back()}
      />

      {/* HERO COVER FOR MOVIE INFO */}
      <div data-hero-section className="relative w-full h-[65vh] overflow-hidden -mt-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={infoMovie.backdropUrl || infoMovie.posterUrl}
          alt={infoMovie.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (infoMovie.id && !target.src.includes('yandex.net')) {
              target.src = `https://st.kp.yandex.net/images/film_big/${infoMovie.id}.jpg`;
            }
          }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />

        <div className="absolute bottom-3 inset-x-3 z-20 space-y-3 max-w-4xl px-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="px-3 py-1 rounded bg-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20">
              ★ {infoMovie.rating}
            </span>
            <span className="text-xs text-zinc-400 font-semibold">{infoMovie.year}</span>
            <span className="text-xs text-zinc-400 font-semibold">• {infoMovie.ageRating}</span>
            <span className="text-xs text-zinc-400 font-semibold">• {infoMovie.duration}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight">
            {infoMovie.title}
          </h1>
          <p className="text-sm text-zinc-400 italic">{infoMovie.originalTitle}</p>

          <div className="flex items-center gap-3 pt-3">
            <button
              data-watch-hero-btn
              tabIndex={0}
              onClick={() => router.push(`/cinema/watch/${infoMovie.id}`)}
              className="focusable-tv px-8 py-3 rounded-3xl bg-white hover:bg-zinc-200 text-black font-black text-sm flex items-center gap-3 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-white focus:scale-105 focus:z-40"
            >
              <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{lang?.frame_watch_now || 'Смотреть'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* INFO BODY DETAILS */}
      <main className="w-full px-6 pt-3 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-3">
            <p className="text-lg text-zinc-300 leading-relaxed font-light">
              {infoMovie.description}
            </p>

            <div className="flex flex-wrap gap-3">
              {infoMovie.genres.map((g) => (
                <span key={g} className="px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs text-zinc-200 shadow-sm">
                  {g}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3 bg-white/5 backdrop-blur-xl p-3 rounded-3xl border border-white/10 text-sm shadow-xl h-fit">
            {infoMovie.director && (
              <div>
                <span className="text-zinc-500 block mb-1 text-xs">Режиссер</span>
                <span className="text-white font-bold">{infoMovie.director}</span>
              </div>
            )}
            {infoMovie.cast && infoMovie.cast.length > 0 && (
              <div>
                <span className="text-zinc-500 block mb-1 text-xs">В главных ролях</span>
                <span className="text-zinc-300">{infoMovie.cast.join(', ')}</span>
              </div>
            )}
            <div>
              <span className="text-zinc-500 block mb-1 text-xs">Аудиодорожки</span>
              <span className="text-zinc-300">Русский (Дубляж), Английский</span>
            </div>
          </div>
        </div>

        {/* SIMILAR MOVIES ROW */}
        {similarMovies.length > 0 && (
          <MovieRow
            title={lang?.frame_similar || 'Похожие фильмы и сериалы'}
            movies={similarMovies}
            myListIds={myListIds}
            onToggleList={toggleMyList}
            onSelectMovie={(m) => router.push(`/cinema/info/${m.id}`)}
            onPlayMovie={(m) => router.push(`/cinema/watch/${m.id}`)}
          />
        )}
      </main>
    </div>
  );
}
