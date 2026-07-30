'use client';

import React from 'react';
import { Movie } from '../types';
import MovieCard from './movie-card';
import { useDragScroll } from '../../hooks/useDragScroll';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  myListIds?: string[];
  onToggleList?: (id: string, e?: React.MouseEvent) => void;
  onSelectMovie: (m: Movie) => void;
  onPlayMovie: (m: Movie) => void;
}

export default function MovieRow({
  title,
  movies,
  myListIds = [],
  onToggleList,
  onSelectMovie,
  onPlayMovie,
}: MovieRowProps) {
  const scrollRef = useDragScroll({ speed: 2 });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {title}
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="viewport dragscroll flex items-center gap-3 overflow-x-auto overflow-y-visible scrollbar-none -mx-3 px-3 lg:-mx-6 lg:px-6 py-3 select-none"
      >
        {movies.map((movie, idx) => (
          <div key={`${movie.id}-${idx}`} className="flex-none w-40 sm:w-56">
            <MovieCard
              movie={movie}
              isInMyList={myListIds.includes(movie.id)}
              onToggleList={onToggleList ? (e) => onToggleList(movie.id, e) : undefined}
              onClick={() => onSelectMovie(movie)}
              onPlay={() => onPlayMovie(movie)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
