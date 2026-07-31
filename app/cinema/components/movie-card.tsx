'use client';

import React from 'react';
import { Movie } from '../types';
import { getOptimizedImageUrl } from '../cinema-api';

interface MovieCardProps {
  movie: Movie;
  rankNumber?: number;
  isInMyList?: boolean;
  onToggleList?: (e: React.MouseEvent) => void;
  onClick: () => void;
  onPlay: () => void;
}

export default function MovieCard({
  movie,
  rankNumber,
  onClick,
  onPlay,
}: MovieCardProps) {
  const posterSrc = getOptimizedImageUrl(movie.posterUrl, '@w300', movie.id);
  let updateBadgeText: string | null = null;
  if (movie.updateBadge) {
    if (movie.updateBadge.translationTitle === 'Новые серии') {
      updateBadgeText = 'Новые серии';
    } else if (movie.updateBadge.season && movie.updateBadge.episode) {
      const isSerial =
        movie.type === 'series' ||
        movie.type === 'animeserial' ||
        movie.type === 'showserial' ||
        Boolean(movie.genres && movie.genres.some((g) => g.toLowerCase().includes('сериал') || g.toLowerCase().includes('новые серии')));

      updateBadgeText = isSerial ? 'Новые серии' : `С${movie.updateBadge.season} Э${movie.updateBadge.episode}`;
    } else {
      updateBadgeText = movie.updateBadge.translationTitle || null;
    }
  }

  return (
    <div
      tabIndex={0}
      data-movie-card="true"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group focusable-tv relative w-full aspect-[2/3] rounded-3xl overflow-hidden bg-zinc-950 border border-white/10 hover:border-indigo-500/80 cursor-pointer transition-all duration-300 active:scale-95 shadow-lg outline-none focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-white focus:scale-105 focus:z-20 focus:border-white focus:shadow-2xl"
    >
      {/* POSTER IMAGE WITH NO-REFERRER & KP FALLBACK */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterSrc}
        alt={movie.title}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.currentTarget;
          if (movie.id && !target.src.includes('yandex.net')) {
            target.src = `https://st.kp.yandex.net/images/film_big/${movie.id}.jpg`;
          }
        }}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />

      {/* GRADIENT OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />

      {/* RATING BADGE & RANK */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        {rankNumber && (
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-black text-xs shadow-lg shadow-rose-500/20">
            #{rankNumber}
          </span>
        )}
        <span className="px-3 py-1 rounded-full bg-amber-800/90 backdrop-blur-md backdrop-saturate-200 backdrop-hue-200 border border-amber-500/40 text-amber-400 font-extrabold text-[11px]">
          ★ {movie.rating}
        </span>
      </div>

      {/* UPDATE BADGE (e.g. S2 E5) */}
      {updateBadgeText && (
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md border border-indigo-400/40 text-white font-black text-[10px] uppercase shadow-lg">
            {updateBadgeText}
          </span>
        </div>
      )}

      {/* BOTTOM INFO */}
      <div className="absolute bottom-3 inset-x-3 space-y-1 z-10">
        <h3 className="text-sm font-extrabold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
          <span>{movie.year}</span>
          {(() => {
            const isSerialType =
              movie.type === 'series' ||
              movie.type === 'serial' ||
              movie.type === 'animeserial' ||
              movie.type === 'showserial' ||
              movie.type === 'tv-series' ||
              Boolean(movie.updateBadge?.season || movie.updateBadge?.episode) ||
              Boolean(movie.genres && movie.genres.some((g) => g.toLowerCase().includes('сериал')));

            const isAnimeType =
              movie.type === 'anime' ||
              movie.type === 'animeserial' ||
              Boolean(movie.genres && movie.genres.some((g) => g.toLowerCase().includes('аниме')));

            const isCartoonType =
              movie.type === 'cartoons' ||
              movie.type === 'cartoon' ||
              Boolean(movie.genres && movie.genres.some((g) => g.toLowerCase().includes('мульт')));

            const realGenre = movie.genres?.find(
              (g) =>
                g &&
                g !== 'Новые серии' &&
                g !== 'Обновлено' &&
                g !== 'Фильм' &&
                g !== 'Кино' &&
                g !== 'Сериал'
            );

            let defaultTypeLabel = 'Фильм';
            if (isAnimeType) {
              defaultTypeLabel = isSerialType ? 'Аниме-сериал' : 'Аниме';
            } else if (isCartoonType) {
              defaultTypeLabel = isSerialType ? 'Мультсериал' : 'Мультфильм';
            } else if (isSerialType) {
              defaultTypeLabel = 'Сериал';
            }

            const displayGenre = realGenre || defaultTypeLabel;
            return displayGenre ? (
              <span className="truncate max-w-[60%] text-zinc-400 text-[11px] font-semibold">{displayGenre}</span>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}

