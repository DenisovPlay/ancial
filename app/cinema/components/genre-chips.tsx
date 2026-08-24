'use client';

import React from 'react';
import { useDragScroll } from '../../hooks/useDragScroll';

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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.59L1.41 13.18l1.41 1.41L12 5.41l9.18 9.18 1.41-1.41zM12 10.83l-5.18 5.18 1.41 1.41L12 13.66l3.77 3.77 1.41-1.41z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M7 2v11h3v9l7-12h-4l4-8z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 21l3.65-.89c1.2.57 2.56.89 4 0 4.97 0 9-4.03 9-9s-4.03-9-9-9zm-3 8c-.83 0-1.5-.67-1.5-1.5S8.17 8 9 8s1.5.67 1.5 1.5S9.83 11 9 11zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 8 15 8s1.5.67 1.5 1.5S15.83 11 15 11zm-3 5.5c-1.8 0-3.3-1.1-3.9-2.5h7.8c-.6 1.4-2.1 2.5-3.9 2.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.5s-5.5 4.5-5.5 10c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5c0-5.5-5.5-10-5.5-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0 2.5c-3.59 0-6.5-2.91-6.5-6.5h-2c0 4.69 3.81 8.5 8.5 8.5v-2z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.47 2 2 6.47 2 12c0 5.53 4.47 10 10 10s10-4.47 10-10C22 6.47 17.53 2 12 2zm-3.5 7c.83 0 1.5.67 1.5 1.5S9.33 12 8.5 12 7 11.33 7 10.5 7.67 9 8.5 9zm7 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3.5 9c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L7 17l2.81-7.19L17 7l-2.81 7.19zM12 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 21l3.65-.89c1.2.57 2.56.89 4 0 4.97 0 9-4.03 9-9s-4.03-9-9-9zm-3 8c-.83 0-1.5-.67-1.5-1.5S8.17 8 9 8s1.5.67 1.5 1.5S9.83 11 9 11zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 8 15 8s1.5.67 1.5 1.5S15.83 11 15 11zm-3 5.5c-1.8 0-3.3-1.1-3.9-2.5h7.8c-.6 1.4-2.1 2.5-3.9 2.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.5s-5.5 4.5-5.5 10c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5c0-5.5-5.5-10-5.5-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0 2.5c-3.59 0-6.5-2.91-6.5-6.5h-2c0 4.69 3.81 8.5 8.5 8.5v-2z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.5s-5.5 4.5-5.5 10c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5c0-5.5-5.5-10-5.5-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0 2.5c-3.59 0-6.5-2.91-6.5-6.5h-2c0 4.69 3.81 8.5 8.5 8.5v-2z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L7 17l2.81-7.19L17 7l-2.81 7.19zM12 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M7 2v11h3v9l7-12h-4l4-8z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 21l3.65-.89c1.2.57 2.56.89 4 0 4.97 0 9-4.03 9-9s-4.03-9-9-9zm-3 8c-.83 0-1.5-.67-1.5-1.5S8.17 8 9 8s1.5.67 1.5 1.5S9.83 11 9 11zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 8 15 8s1.5.67 1.5 1.5S15.83 11 15 11zm-3 5.5c-1.8 0-3.3-1.1-3.9-2.5h7.8c-.6 1.4-2.1 2.5-3.9 2.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.5s-5.5 4.5-5.5 10c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5c0-5.5-5.5-10-5.5-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0 2.5c-3.59 0-6.5-2.91-6.5-6.5h-2c0 4.69 3.81 8.5 8.5 8.5v-2z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.5s-5.5 4.5-5.5 10c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5c0-5.5-5.5-10-5.5-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-5-6c.78 2.34 2.72 4 5 4s4.22-1.66 5-4H7z" />
      </svg>
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
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
      </svg>
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
