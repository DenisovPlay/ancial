'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Movie } from '../types';
import { getCinemaCache } from '../cinema-cache';
import { getOptimizedImageUrl } from '../cinema-api';

interface CinemaIdleScreensaverProps {
  movies?: Movie[];
  idleTimeoutMs?: number;
  disabled?: boolean;
}

export default function CinemaIdleScreensaver({
  movies = [],
  idleTimeoutMs = 45000, // 45 seconds default idle time
  disabled = false,
}: CinemaIdleScreensaverProps) {
  const { lang, langCode } = useAuth();
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [activeMovies, setActiveMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Clock states
  const [timeHours, setTimeHours] = useState<string>('00');
  const [timeMinutes, setTimeMinutes] = useState<string>('00');
  const [timeSeconds, setTimeSeconds] = useState<string>('00');
  const [dateFormatted, setDateFormatted] = useState<string>('');

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Prepare movie list from props or cache
  useEffect(() => {
    let list: Movie[] = Array.isArray(movies) && movies.length > 0 ? movies : [];

    if (list.length === 0) {
      try {
        const bundle = getCinemaCache<Partial<Record<'hero' | 'top' | 'newReleases' | 'popularSeries', Movie[]>>>('home_bundle');
        if (bundle) {
          const combined = [
            ...(bundle.hero || []),
            ...(bundle.top || []),
            ...(bundle.newReleases || []),
            ...(bundle.popularSeries || []),
          ];
          const seen = new Set<string>();
          list = combined.filter((m: Movie) => {
            if (!m?.id || seen.has(String(m.id))) return false;
            seen.add(String(m.id));
            return Boolean(m.backdropUrl || m.posterUrl);
          });
        }
      } catch (e) {
        console.error('Failed to load cache in screensaver', e);
      }
    }

    // Shuffle active movies for variety
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    // Гидратация списка для заставки при монтировании/смене фильмов — сеттлер источник правды.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveMovies(shuffled);
  }, [movies]);

  // 2. Real-time Clock update
  useEffect(() => {
    const locale = langCode === 'en' ? 'en-US' : 'ru-RU';
    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');

      setTimeHours(h);
      setTimeMinutes(m);
      setTimeSeconds(s);
      setDateFormatted(formatter.format(now));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [langCode]);

  // 3. Slideshow Rotation when Idle
  useEffect(() => {
    if (!isIdle || activeMovies.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeMovies.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isIdle, activeMovies.length]);

  // 4. Idle Detection Activity Listeners
  useEffect(() => {
    const isWatchPage = typeof window !== 'undefined' && window.location.pathname.includes('/cinema/watch');
    const hasPlayingVideo = typeof document !== 'undefined' && Boolean(
      document.querySelector('video') || document.querySelector('iframe[src*="player"]')
    );

    if (disabled || isWatchPage || hasPlayingVideo) {
      // Принудительный сброс заставки — сеттлер здесь источник правды.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const resetIdleTimer = () => {
      setIsIdle(false);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, idleTimeoutMs);
    };

    // Initial timer setup
    resetIdleTimer();

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'pointermove',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetIdleTimer);
      });
    };
  }, [disabled, idleTimeoutMs]);

  const currentMovie = activeMovies[currentIndex] || activeMovies[0];

  return (
    <div
      aria-hidden={!isIdle}
      className={`fixed inset-0 z-[9999] bg-black transition-all duration-700 ease-in-out select-none pointer-events-none ${
        isIdle
          ? 'opacity-100 pointer-events-auto cursor-none'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* BACKGROUND MOVIES CAROUSEL WITH SMOOTH CROSSFADE & KEN BURNS ZOOM */}
      {activeMovies.map((movie, idx) => {
        const isActive = idx === currentIndex && isIdle;
        const bgImage = getOptimizedImageUrl(
          movie.backdropUrl || movie.posterUrl,
          '@w1280',
          movie.id
        );

        return (
          <div
            key={`screensaver-${movie.id}-${idx}`}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {isActive && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={bgImage}
                alt={movie.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (movie.id && !target.src.includes('yandex.net')) {
                    target.src = `https://st.kp.yandex.net/images/film_big/${movie.id}.jpg`;
                  }
                }}
                className="w-full h-full object-cover scale-105 animate-in zoom-in-100 fade-in duration-[8000ms] ease-out fill-mode-both"
              />
            )}
          </div>
        );
      })}

      {/* CLEAN VIGNETTE OVERLAYS (NO HEAVY PANELS) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/70 z-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 z-20 pointer-events-none" />

      {/* MINIMAL CONTENT LAYOUT */}
      <div className="relative z-30 w-full h-full p-8 sm:p-14 flex flex-col justify-between">
        {/* TOP RIGHT: PURE MINIMALIST CLOCK */}
        <div className="flex justify-end w-full">
          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-baseline text-6xl sm:text-8xl lg:text-9xl font-black text-white tracking-tight drop-shadow-2xl font-mono">
              <span>{timeHours}</span>
              <span className="animate-pulse text-indigo-400/90 font-sans mx-1">:</span>
              <span>{timeMinutes}</span>
              <span className="text-2xl sm:text-4xl font-bold text-indigo-400 font-mono ml-2">
                :{timeSeconds}
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold tracking-widest text-zinc-300 uppercase drop-shadow-md">
              {dateFormatted}
            </div>
          </div>
        </div>

        {/* BOTTOM LEFT: PURE MINIMALIST MOVIE TITLE & METADATA */}
        <div className="w-full flex items-end justify-between">
          {currentMovie && (
            <div key={`${currentMovie.id}-${currentIndex}`} className="max-w-3xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
              {/* MOVIE TITLE */}
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-2xl line-clamp-2">
                {currentMovie.title}
              </h2>

              {/* METADATA LINE: RATING • YEAR • GENRE */}
              <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-zinc-300 drop-shadow-lg">
                {currentMovie.rating && (
                  <span className="text-amber-400 font-black">★ {currentMovie.rating}</span>
                )}
                {currentMovie.rating && currentMovie.year && <span>•</span>}
                {currentMovie.year && <span>{currentMovie.year}</span>}
                {currentMovie.genres && currentMovie.genres.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-300 font-bold">{currentMovie.genres[0]}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
