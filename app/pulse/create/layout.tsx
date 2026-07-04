'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { PulseLogo, cn } from '../pulse-components';

export default function PulseCreateLayout({ children }: { children: React.ReactNode }) {
  const { lang, isAuthenticated } = useAuth();
  const pathname = usePathname();

  const getTabClass = (path: string) => {
    return cn(
      "px-3 py-2 cursor-pointer shrink-0 flex items-center justify-center border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full",
      pathname === path ? "bg-zinc-700/70" : "bg-zinc-900/20"
    );
  };

  if (isAuthenticated === false) {
    return null; // Handle unauth if needed, mostly App router layout doesn't easily redirect client-side without useEffect
  }

  return (
    <div className="px-3 lg:px-0 flex flex-col justify-start items-center gap-3 pb-64 duration-300 min-h-screen">
      <div className="w-full flex items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent sticky top-0 pt-3" style={{ zIndex: 20 }}>
        <div className="w-full max-w-screen-2xl">
          <Link href="/pulse/my" className="flex items-center gap-3 hover:opacity-80 duration-300 cursor-pointer active:scale-95 w-fit">
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z"></path>
            </svg>
            <PulseLogo className="shrink-0 w-32 sm:w-48" />
          </Link>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3 duration-300 max-w-screen-2xl">
        <div className="flex gap-3 flex-nowrap overflow-x-auto w-full max-w-3xl py-3 -my-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Link href="/pulse/create" className={getTabClass('/pulse/create')}>
            <span className="text-lg">Обзор</span>
          </Link>
          <Link href="/pulse/create/artists" className={getTabClass('/pulse/create/artists')}>
            <span className="text-lg">{lang?.artists || 'Артисты'}</span>
          </Link>
          <Link href="/pulse/create/albums" className={getTabClass('/pulse/create/albums')}>
            <span className="text-lg">{lang?.albums || 'Альбомы'}</span>
          </Link>
          <Link href="/pulse/create/tracks" className={getTabClass('/pulse/create/tracks')}>
            <span className="text-lg">{lang?.tracks || 'Треки'}</span>
          </Link>
          <Link href="/legal/contacts" className="px-3 py-2 cursor-pointer shrink-0 flex items-center justify-center border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full bg-zinc-900/20">
            <span className="text-lg">{lang?.support || 'Поддержка'}</span>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
