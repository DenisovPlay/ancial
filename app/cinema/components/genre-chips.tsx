'use client';

import React from 'react';
import { useDragScroll } from '../../hooks/useDragScroll';
import Icon from '../../components/svg-icon';

export interface GenreItem {
  id: string;
  label: string;
  bgColor: string;
  activeBgColor: string;
  textColor: string;
  borderColor: string;
  iconSvg: React.ReactNode;
}

export const MOVIE_GENRES: GenreItem[] = [
  {
    id: 'all',
    label: 'Все фильмы',
    bgColor: 'bg-indigo-600/20 hover:bg-indigo-600/35',
    activeBgColor: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
    textColor: 'text-indigo-300',
    borderColor: 'border-indigo-500/30',
    iconSvg: (
      <Icon name="IC-genre-movies" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'боевик',
    label: 'Боевики',
    bgColor: 'bg-rose-600/20 hover:bg-rose-600/35',
    activeBgColor: 'bg-rose-600 text-white shadow-lg shadow-rose-600/30',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    iconSvg: (
      <Icon name="IC-genre-action" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'комедия',
    label: 'Комедии',
    bgColor: 'bg-amber-500/20 hover:bg-amber-500/35',
    activeBgColor: 'bg-amber-500 text-black shadow-lg shadow-amber-500/30',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/30',
    iconSvg: (
      <Icon name="IC-genre-comedy" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'драма',
    label: 'Драмы',
    bgColor: 'bg-cyan-600/20 hover:bg-cyan-600/35',
    activeBgColor: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-500/30',
    iconSvg: (
      <Icon name="IC-genre-drama" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'фантастика',
    label: 'Фантастика',
    bgColor: 'bg-purple-600/20 hover:bg-purple-600/35',
    activeBgColor: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/30',
    iconSvg: (
      <Icon name="IC-genre-scifi" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'ужасы',
    label: 'Ужасы',
    bgColor: 'bg-emerald-600/20 hover:bg-emerald-600/35',
    activeBgColor: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/30',
    iconSvg: (
      <Icon name="IC-genre-horror" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'приключения',
    label: 'Приключения',
    bgColor: 'bg-yellow-600/20 hover:bg-yellow-600/35',
    activeBgColor: 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-500/30',
    iconSvg: (
      <Icon name="IC-genre-adventure" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'триллер',
    label: 'Триллеры',
    bgColor: 'bg-slate-700/30 hover:bg-slate-700/50',
    activeBgColor: 'bg-slate-700 text-white shadow-lg shadow-slate-500/30',
    textColor: 'text-slate-200',
    borderColor: 'border-slate-500/30',
    iconSvg: (
      <Icon name="IC-genre-thriller" className="w-5 h-5 fill-current" />
    ),
  },
];

export const SERIES_GENRES: GenreItem[] = [
  {
    id: 'all',
    label: 'Все сериалы',
    bgColor: 'bg-indigo-600/20 hover:bg-indigo-600/35',
    activeBgColor: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
    textColor: 'text-indigo-300',
    borderColor: 'border-indigo-500/30',
    iconSvg: (
      <Icon name="IC-series" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'драма',
    label: 'Драмы',
    bgColor: 'bg-cyan-600/20 hover:bg-cyan-600/35',
    activeBgColor: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-500/30',
    iconSvg: (
      <Icon name="IC-genre-drama" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'комедия',
    label: 'Комедии',
    bgColor: 'bg-amber-500/20 hover:bg-amber-500/35',
    activeBgColor: 'bg-amber-500 text-black shadow-lg shadow-amber-500/30',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/30',
    iconSvg: (
      <Icon name="IC-genre-comedy" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'фантастика',
    label: 'Фантастика',
    bgColor: 'bg-purple-600/20 hover:bg-purple-600/35',
    activeBgColor: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/30',
    iconSvg: (
      <Icon name="IC-genre-scifi" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'детектив',
    label: 'Детективы',
    bgColor: 'bg-blue-600/20 hover:bg-blue-600/35',
    activeBgColor: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30',
    textColor: 'text-blue-300',
    borderColor: 'border-blue-500/30',
    iconSvg: (
      <Icon name="IC-search-material" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'триллер',
    label: 'Триллеры',
    bgColor: 'bg-slate-700/30 hover:bg-slate-700/50',
    activeBgColor: 'bg-slate-700 text-white shadow-lg shadow-slate-500/30',
    textColor: 'text-slate-200',
    borderColor: 'border-slate-500/30',
    iconSvg: (
      <Icon name="IC-genre-thriller" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'криминал',
    label: 'Криминал',
    bgColor: 'bg-red-700/20 hover:bg-red-700/35',
    activeBgColor: 'bg-red-700 text-white shadow-lg shadow-red-500/30',
    textColor: 'text-red-300',
    borderColor: 'border-red-500/30',
    iconSvg: (
      <Icon name="IC-genre-crime" className="w-5 h-5 fill-current" />
    ),
  },
];

export const ANIME_GENRES: GenreItem[] = [
  {
    id: 'all',
    label: 'Всё аниме',
    bgColor: 'bg-pink-600/20 hover:bg-pink-600/35',
    activeBgColor: 'bg-pink-600 text-white shadow-lg shadow-pink-500/30',
    textColor: 'text-pink-300',
    borderColor: 'border-pink-500/30',
    iconSvg: (
      <Icon name="IC-genre-anime" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'фэнтези',
    label: 'Фэнтези',
    bgColor: 'bg-purple-600/20 hover:bg-purple-600/35',
    activeBgColor: 'bg-purple-600 text-white shadow-lg shadow-purple-500/30',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/30',
    iconSvg: (
      <Icon name="IC-genre-scifi" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'приключения',
    label: 'Приключения',
    bgColor: 'bg-emerald-600/20 hover:bg-emerald-600/35',
    activeBgColor: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/30',
    iconSvg: (
      <Icon name="IC-genre-adventure" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'боевик',
    label: 'Боевики',
    bgColor: 'bg-rose-600/20 hover:bg-rose-600/35',
    activeBgColor: 'bg-rose-600 text-white shadow-lg shadow-rose-500/30',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    iconSvg: (
      <Icon name="IC-genre-action" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'комедия',
    label: 'Комедии',
    bgColor: 'bg-amber-500/20 hover:bg-amber-500/35',
    activeBgColor: 'bg-amber-500 text-black shadow-lg shadow-amber-500/30',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/30',
    iconSvg: (
      <Icon name="IC-genre-comedy" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'драма',
    label: 'Драмы',
    bgColor: 'bg-cyan-600/20 hover:bg-cyan-600/35',
    activeBgColor: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-500/30',
    iconSvg: (
      <Icon name="IC-genre-drama" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'фантастика',
    label: 'Фантастика',
    bgColor: 'bg-indigo-600/20 hover:bg-indigo-600/35',
    activeBgColor: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30',
    textColor: 'text-indigo-300',
    borderColor: 'border-indigo-500/30',
    iconSvg: (
      <Icon name="IC-genre-scifi" className="w-5 h-5 fill-current" />
    ),
  },
];

export const CARTOON_GENRES: GenreItem[] = [
  {
    id: 'all',
    label: 'Все мультфильмы',
    bgColor: 'bg-emerald-600/20 hover:bg-emerald-600/35',
    activeBgColor: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/30',
    iconSvg: (
      <Icon name="IC-genre-cartoons" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'семейный',
    label: 'Семейные',
    bgColor: 'bg-amber-500/20 hover:bg-amber-500/35',
    activeBgColor: 'bg-amber-500 text-black shadow-lg shadow-amber-500/30',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/30',
    iconSvg: (
      <Icon name="IC-genre-family" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'сказка',
    label: 'Сказки и фэнтези',
    bgColor: 'bg-purple-600/20 hover:bg-purple-600/35',
    activeBgColor: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/30',
    iconSvg: (
      <Icon name="IC-genre-fairytale" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'комедия',
    label: 'Смешные',
    bgColor: 'bg-rose-600/20 hover:bg-rose-600/35',
    activeBgColor: 'bg-rose-600 text-white shadow-lg shadow-rose-600/30',
    textColor: 'text-rose-300',
    borderColor: 'border-rose-500/30',
    iconSvg: (
      <Icon name="IC-genre-comedy-kids" className="w-5 h-5 fill-current" />
    ),
  },
  {
    id: 'приключения',
    label: 'Приключения',
    bgColor: 'bg-sky-600/20 hover:bg-sky-600/35',
    activeBgColor: 'bg-sky-600 text-white shadow-lg shadow-sky-600/30',
    textColor: 'text-sky-300',
    borderColor: 'border-sky-500/30',
    iconSvg: (
      <Icon name="IC-genre-adventure-kids" className="w-5 h-5 fill-current" />
    ),
  },
];


interface GenreChipsProps {
  genres: GenreItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function GenreChips({ genres, selectedId, onSelect }: GenreChipsProps) {
  const scrollRef = useDragScroll({ speed: 2 });

  return (
    <div
      ref={scrollRef}
      className="viewport dragscroll flex items-center gap-3 overflow-x-auto scrollbar-none py-2 -mx-3 px-3 lg:-mx-6 lg:px-6 select-none"
    >
      {genres.map((g) => {
        const isSelected = selectedId === g.id;
        return (
          <button
            key={g.id}
            tabIndex={0}
            onClick={() => onSelect(g.id)}
            className={`focusable-tv relative flex items-center gap-2.5 px-5 py-3 rounded-full font-bold text-sm sm:text-base whitespace-nowrap border transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-white ${isSelected
              ? `${g.activeBgColor} border-transparent scale-[1.02] z-10`
              : `${g.bgColor} ${g.textColor} ${g.borderColor}`
              }`}
          >
            <span className="shrink-0">{g.iconSvg}</span>
            <span className="tracking-tight">{g.label}</span>
          </button>
        );
      })}
    </div>
  );
}
