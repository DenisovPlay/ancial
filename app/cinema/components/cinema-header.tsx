'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { ContentType } from '../types';

interface CinemaHeaderProps {
  activeTab?: ContentType;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function CinemaHeader({
  activeTab,
  searchQuery,
  onSearchChange,
  showBackButton = false,
  onBack,
}: CinemaHeaderProps) {
  const { lang } = useAuth();

  return (
    <header className="sticky top-0 z-[100] w-full px-4 lg:px-6 py-3 flex items-center justify-between gap-3 bg-gradient-to-b from-black via-black/90 to-transparent">
      {/* MOBILE: LOGO CENTERED */}
      <div className="flex lg:hidden w-full justify-center items-center relative">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            tabIndex={0}
            data-cinema-back="true"
            aria-label="Назад"
            className="focusable-tv absolute left-0 p-2 flex items-center justify-center rounded-full cursor-pointer active:scale-95 transition-all duration-300 bg-zinc-900/90 border border-white/20 hover:bg-zinc-800 text-white h-10 w-10 shrink-0 outline-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-xl z-50"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <Link href="/cinema" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/branding/frame.svg" alt="Frame" className="h-8 w-auto" />
        </Link>
      </div>

      {/* DESKTOP (LG+): FULL NAVIGATION HEADER */}
      <div className="hidden lg:flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {showBackButton && onBack ? (
            <button
              onClick={onBack}
              tabIndex={0}
              data-cinema-back="true"
              aria-label="Назад"
              className="focusable-tv p-2 flex items-center justify-center rounded-full cursor-pointer active:scale-95 transition-all duration-300 bg-zinc-900/90 border border-white/20 hover:bg-zinc-800 text-white h-10 w-10 shrink-0 z-50 outline-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-xl"
            >
              <svg className="w-5 h-5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <>
              <Link
                href="/cinema"
                tabIndex={-1}
                className="flex items-center gap-3 cursor-pointer group mr-3 outline-none focus:outline-none border-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/branding/frame.svg" alt="Frame" className="h-10 outline-none border-0" />
              </Link>

              <nav className="flex items-center gap-2 sm:gap-3 py-1 px-1">
                {[
                  { id: 'all', href: '/cinema', label: lang?.frame_tab_home || 'Главная' },
                  { id: 'movie', href: '/cinema/movies', label: lang?.frame_tab_movies || 'Фильмы' },
                  { id: 'series', href: '/cinema/series', label: lang?.frame_tab_series || 'Сериалы' },
                  { id: 'cartoons', href: '/cinema/cartoons', label: lang?.frame_tab_cartoons || 'Мультфильмы' },
                  { id: 'anime', href: '/cinema/anime', label: lang?.frame_tab_anime || 'Аниме' },
                ].map((tab) => (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    tabIndex={0}
                    data-cinema-nav={tab.href}
                    data-active-nav={activeTab === tab.id ? 'true' : 'false'}
                    className={`flex items-center justify-center px-4 py-1.5 rounded-full font-bold text-sm cursor-pointer transition-all duration-200 outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-white text-black shadow-md focus:ring-blue-500'
                        : 'text-zinc-400 hover:text-white hover:bg-white/10 focus:text-white focus:bg-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
            </>
          )}
        </div>

        {!showBackButton && (
          <div className="flex items-center gap-3">
            <Link
              href="/cinema/search"
              tabIndex={0}
              data-cinema-search="true"
              aria-label="Поиск"
              className="focusable-tv flex items-center justify-center p-2.5 rounded-full bg-zinc-900/80 border border-zinc-700/60 hover:bg-zinc-800 text-white transition-all duration-200 outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-110 shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
