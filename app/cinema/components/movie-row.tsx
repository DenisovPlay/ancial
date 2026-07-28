'use client';

import React from 'react';
import { Movie } from '../types';
import MovieCard from './movie-card';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  myListIds: string[];
  onToggleList: (id: string, e?: React.MouseEvent) => void;
  onSelectMovie: (m: Movie) => void;
  onPlayMovie: (m: Movie) => void;
}

export default function MovieRow({
  title,
  movies,
  myListIds,
  onToggleList,
  onSelectMovie,
  onPlayMovie,
}: MovieRowProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between -mx-3 lg:mx-0">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto overflow-y-visible scrollbar-none -mx-6 px-3 lg:px-6 py-3">
        {movies.map((movie) => (
          <div key={movie.id} className="flex-none w-44 sm:w-56">
            <MovieCard
              movie={movie}
              isInMyList={myListIds.includes(movie.id)}
              onToggleList={(e) => onToggleList(movie.id, e)}
              onClick={() => onSelectMovie(movie)}
              onPlay={() => onPlayMovie(movie)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
