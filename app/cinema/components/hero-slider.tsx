'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Movie } from '../types';

interface HeroSliderProps {
  heroMovies?: Movie[];
  myListIds: string[];
  onToggleList: (id: string, e?: React.MouseEvent) => void;
  onPlayMovie: (movie: Movie) => void;
}

export default function HeroSlider({ heroMovies = [], myListIds, onToggleList, onPlayMovie }: HeroSliderProps) {
  const { lang } = useAuth();
  const router = useRouter();

  const [heroIndex, setHeroIndex] = useState<number>(0);
  const [isPlayingHeroVideo, setIsPlayingHeroVideo] = useState<boolean>(true);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  const slides = heroMovies.length > 0 ? heroMovies : [];
  const currentHero = slides[heroIndex] || slides[0];

  // Auto slide hero every 10 sec
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleHeroFocus = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!currentHero) return null;

  return (
    <div data-hero-section className="relative w-full h-[80vh] sm:h-[85vh] lg:h-[100vh] min-h-[550px] overflow-hidden bg-black flex flex-col justify-end -mt-16 pb-3">
      {/* BACKGROUND MEDIA (IMAGE OR VIDEO) */}
      <div className="absolute inset-0 w-full h-full bg-black">
        {slides.map((hero, idx) => {
          const isActive = idx === heroIndex;
          
          return (
            <div
              key={hero.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
              }`}
            >
              {/* Only load media if it is active, or the immediate next/prev to save bandwidth but keep smooth transitions */}
              {(isActive || Math.abs(idx - heroIndex) <= 1 || (idx === 0 && heroIndex === slides.length - 1) || (idx === slides.length - 1 && heroIndex === 0)) && (
                isPlayingHeroVideo && hero.videoUrl && hero.videoUrl.endsWith('.mp4') ? (
                  <video
                    ref={isActive ? heroVideoRef : null}
                    src={hero.videoUrl}
                    autoPlay={isActive}
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover scale-105"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={hero.backdropUrl || hero.posterUrl}
                    alt={hero.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (hero.id && !target.src.includes('yandex.net')) {
                        target.src = `https://st.kp.yandex.net/images/film_big/${hero.id}.jpg`;
                      }
                    }}
                    className="w-full h-full object-cover transition-transform duration-1000"
                  />
                )
              )}
            </div>
          );
        })}

        {/* VIGNETTE & GRADIENT OVERLAYS */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/70 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* HERO INFO BLOCK: ONLY TITLE AND BUTTONS */}
      <div className="relative z-30 px-6 space-y-3 pb-6 w-full">
        {/* TITLE ANIMATED ON CHANGE */}
        <div key={currentHero.id} className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-1000 ease-out fill-mode-both">
          <h1 className="w-full text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight drop-shadow-2xl">
            {currentHero.title}
          </h1>
        </div>

        {/* ACTION BUTTONS WITH MUTE BUTTON IN SAME ROW */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            data-watch-hero-btn
            tabIndex={0}
            onFocus={handleHeroFocus}
            onClick={() => onPlayMovie(currentHero)}
            className="focusable-tv px-8 py-3.5 rounded-3xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm flex items-center gap-3 transition-all duration-300 active:scale-95 shadow-2xl cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-white focus:scale-105 focus:z-40"
          >
            <svg className="w-5 h-5 fill-black ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>{lang?.frame_watch_now || 'Смотреть'}</span>
          </button>

          <button
            tabIndex={0}
            onFocus={handleHeroFocus}
            onClick={() => router.push(`/cinema/info/${currentHero.id}`)}
            className="focusable-tv p-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center gap-3 backdrop-blur-xl transition-all duration-300 active:scale-95 border border-white/20 cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-white focus:scale-105 focus:z-40"
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            </svg>
          </button>

        </div>
      </div>

      {/* HERO SLIDER DOTS */}
      {slides.length > 1 && (
        <div className="relative z-30 px-6 flex items-center justify-start">
          <div className="flex items-center gap-3">
            {slides.map((h, idx) => (
              <button
                key={h.id}
                tabIndex={-1}
                onClick={() => setHeroIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer outline-none ${idx === heroIndex ? 'w-10 bg-white' : 'w-3 bg-white/30 hover:bg-white/60'
                  }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
