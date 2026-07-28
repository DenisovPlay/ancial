'use client';

import React from 'react';
import { Movie } from '../types';

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
      className="group focusable-tv relative w-full aspect-[2/3] rounded-3xl overflow-hidden bg-zinc-950 border border-white/10 hover:border-indigo-500/80 cursor-pointer transition-all duration-300 active:scale-95 shadow-lg outline-none focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-white focus:scale-105 focus:z-30 focus:border-white focus:shadow-2xl"
    >
      {/* POSTER IMAGE WITH NO-REFERRER & KP FALLBACK */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={movie.posterUrl}
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
        <span className="px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-amber-400 font-extrabold text-[11px]">
          ★ {movie.rating}
        </span>
      </div>

      {/* PLAY BUTTON ON HOVER OR FOCUS */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 z-10">
        <button
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition-transform duration-300 active:scale-95 cursor-pointer"
        >
          <svg className="w-6 h-6 fill-black ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      {/* BOTTOM INFO */}
      <div className="absolute bottom-3 inset-x-3 space-y-1 z-10">
        <h3 className="text-sm font-extrabold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
          <span>{movie.year}</span>
        </div>
      </div>
    </div>
  );
}
