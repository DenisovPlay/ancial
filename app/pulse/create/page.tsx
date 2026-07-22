'use client';

import React, { useEffect, useState } from 'react';
import { AncialAPI } from '../../lib/api-v2';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

type StatsData = {
  total_listens: number;
  total_artists: number;
  total_albums: number;
  total_album_likes: number;
  total_tracks: number;
};

export default function PulseCreateOverviewPage() {
  const { lang, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      AncialAPI.pulseManagement<StatsData>('stats', 'get', {})
        .then((res) => {
          if (res) {
            setStats(res);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num || 0);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full flex items-center gap-3">
        <h5 className="text-2xl text-zinc-200 flex-grow">{lang?.stats_title || 'Статистика'}</h5>
      </div>
      
      {loading ? (
        <div className="flex w-full items-center justify-center p-10">
          <svg className="h-8 w-8 animate-spin text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          <div className="border border-zinc-600/30 p-5 bg-zinc-800/50 rounded-3xl flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-sm mb-1">{lang?.total_plays || 'Прослушивания'}</span>
            <span className="text-4xl font-bold text-white">{formatNumber(stats?.total_listens || 0)}</span>
          </div>
          <div className="border border-zinc-600/30 p-5 bg-zinc-800/50 rounded-3xl flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-sm mb-1">{lang?.total_tracks || 'Всего треков'}</span>
            <span className="text-4xl font-bold text-white">{formatNumber(stats?.total_tracks || 0)}</span>
          </div>
          <Link href="/pulse/create/artists" className="border border-zinc-600/30 p-5 bg-zinc-800/50 rounded-3xl flex flex-col items-center justify-center hover:bg-zinc-700/50 duration-300 cursor-pointer active:scale-[0.98]">
            <span className="text-zinc-400 text-sm mb-1">{lang?.your_artists || 'Ваши артисты'}</span>
            <span className="text-4xl font-bold text-white">{formatNumber(stats?.total_artists || 0)}</span>
          </Link>
          <Link href="/pulse/create/albums" className="border border-zinc-600/30 p-5 bg-zinc-800/50 rounded-3xl flex flex-col items-center justify-center hover:bg-zinc-700/50 duration-300 cursor-pointer active:scale-[0.98]">
            <span className="text-zinc-400 text-sm mb-1">{lang?.album_likes || 'Лайки на альбомах'}</span>
            <span className="text-4xl font-bold text-white">{formatNumber(stats?.total_album_likes || 0)}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
