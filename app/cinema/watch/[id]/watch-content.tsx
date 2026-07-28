'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Movie } from '../../types';
import { fetchCinemaVideoById } from '../../cinema-api';
import { useTvNavigation } from '../../use-tv-navigation';
import { FrameBrandLoader } from '../../components/cinema-skeleton';

interface WatchContentProps {
  id: string;
}

export default function WatchContent({ id }: WatchContentProps) {
  useTvNavigation();
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadWatchMovie() {
      setIsLoading(true);
      const target = await fetchCinemaVideoById(id);
      if (isMounted) {
        setMovie(target);
        setIsLoading(false);
      }
    }
    loadWatchMovie();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center">
        <FrameBrandLoader />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
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

  const iframeSrc = movie.videoUrl || `https://cdn0.cdnhubstream.pro/show/${movie.id}`;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* COMPACT BACK BUTTON WITH CHEVRON-LEFT (TOP-LEFT CORNER) */}
      <div className="absolute top-16 left-3 z-50">
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          tabIndex={0}
          className="focusable-tv p-2 flex items-center justify-center rounded-full cursor-pointer active:scale-95 duration-300 bg-black/50 hover:bg-black/80 border border-white/20 backdrop-blur-md h-10 w-10 shadow-2xl outline-none focus:outline-none focus:ring-4 focus:ring-white"
        >
          <svg className="w-5 h-5 stroke-white fill-none stroke-[2.5]" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* FULLSCREEN IFRAME / VIDEO PLAYER */}
      <iframe
        src={iframeSrc}
        title={movie.title}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
