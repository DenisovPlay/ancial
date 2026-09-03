'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AncialAPI } from '../../lib/api-v2';
import { useAuth } from '../../context/AuthContext';
import { getPulseBackgroundColorByMood, ActionIcon } from '../pulse-components';

type StatsData = {
  total_listens: number;
  total_artists: number;
  total_albums: number;
  total_album_likes: number;
  total_tracks: number;
};

type RecentTrack = {
  id: number;
  name: string;
  artist: string;
  img?: string;
  listens?: number;
  status?: number;
  genre?: string;
  mood?: string;
};

export default function PulseCreateOverviewPage() {
  const { lang, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([
        AncialAPI.pulseManagement<StatsData>('stats', 'get', {}),
        AncialAPI.pulseManagement<RecentTrack[]>('track', 'list', {}),
      ])
        .then(([statsRes, tracksRes]) => {
          if (statsRes) {
            setStats(statsRes);
          }
          if (Array.isArray(tracksRes)) {
            setRecentTracks(tracksRes.slice(0, 5));
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
      {/* 1. Key Metrics */}
      <div className="w-full flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-100">
          {lang?.creators_overview || 'Обзор'}
        </h1>
      </div>

      {loading ? (
        <div className="flex w-full items-center justify-center p-6">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <div className="border border-zinc-600/30 bg-zinc-800/50 rounded-3xl flex gap-3 overflow-hidden">
              <div className="py-3 pl-3 flex flex-col w-full">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-200">{lang?.creators_stat_listens || 'Прослушивания'}</span>
                </div>
                <span className="text-3xl font-bold text-white">{formatNumber(stats?.total_listens || 0)}</span>
              </div>
              <span className="text-blue-400 relative p-3 bg-zinc-900 h-fit border-l border-b border-zinc-600/30 rounded-bl-3xl">
                <ActionIcon className="w-10 h-10 fill-blue-400 z-30 relative" name="IC-play" />
                <div className="z-10 w-10 h-10 blur-xl bg-blue-400 absolute top-1.5 right-1.5 /animate-pulse"></div>
              </span>
            </div>

            <Link
              href="/pulse/create/tracks"
              className="border border-zinc-600/30 bg-zinc-800/50 rounded-3xl flex gap-3 overflow-hidden hover:bg-zinc-700/50 duration-300 cursor-pointer active:scale-95"
            >
              <div className="py-3 pl-3 flex flex-col w-full">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-200">{lang?.creators_stat_tracks || 'Всего треков'}</span>
                </div>
                <span className="text-3xl font-bold text-white">{formatNumber(stats?.total_tracks || 0)}</span>
              </div>
              <span className="text-purple-400 relative p-3 bg-zinc-900 h-fit border-l border-b border-zinc-600/30 rounded-bl-3xl">
                <ActionIcon className="w-10 h-10 fill-purple-400 z-30 relative" name="IC-music" />
                <div className="z-10 w-10 h-10 blur-xl bg-purple-400 absolute top-1.5 right-1.5 /animate-pulse"></div>
              </span>
            </Link>

            <Link
              href="/pulse/create/artists"
              className="border border-zinc-600/30 bg-zinc-800/50 rounded-3xl flex gap-3 overflow-hidden hover:bg-zinc-700/50 duration-300 cursor-pointer active:scale-95"
            >
              <div className="py-3 pl-3 flex flex-col w-full">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-200">{lang?.creators_stat_artists || 'Артисты'}</span>
                </div>
                <span className="text-3xl font-bold text-white">{formatNumber(stats?.total_artists || 0)}</span>
              </div>
              <span className="text-emerald-400 relative p-3 bg-zinc-900 h-fit border-l border-b border-zinc-600/30 rounded-bl-3xl">
                <ActionIcon className="w-10 h-10 fill-emerald-400 z-30 relative" name="IC-user" />
                <div className="z-10 w-10 h-10 blur-xl bg-emerald-400 absolute top-1.5 right-1.5 /animate-pulse"></div>
              </span>
            </Link>

            <Link
              href="/pulse/create/albums"
              className="border border-zinc-600/30 bg-zinc-800/50 rounded-3xl flex gap-3 overflow-hidden hover:bg-zinc-700/50 duration-300 cursor-pointer active:scale-95"
            >
              <div className="py-3 pl-3 flex flex-col w-full">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-200">{lang?.creators_stat_album_likes || 'Лайки релизов'}</span>
                </div>
                <span className="text-3xl font-bold text-white">{formatNumber(stats?.total_album_likes || 0)}</span>
              </div>
              <span className="text-rose-400 relative p-3 bg-zinc-900 h-fit border-l border-b border-zinc-600/30 rounded-bl-3xl">
                <ActionIcon className="w-10 h-10 fill-rose-400 z-30 relative" name="IC-heart-filled" />
                <div className="z-10 w-10 h-10 blur-xl bg-rose-400 absolute top-1.5 right-1.5 /animate-pulse"></div>
              </span>
            </Link>
          </div>

          {/* 2. Quick Actions */}
          <div className="w-full flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <Link
                href="/pulse/create/upload?mode=single"
                className="border border-zinc-600/30 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-full flex flex-col justify-between gap-3 duration-300 active:scale-95 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 duration-300">
                    <ActionIcon className="w-6 h-6 fill-purple-400" name="IC-music" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-white">
                      {lang?.creators_upload_single || 'Загрузить сингл'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {lang?.creators_upload_single_desc || 'Опубликуйте один трек со своей обложкой'}
                    </span>
                  </div>
                </div>
              </Link>

              <Link
                href="/pulse/create/upload?mode=album"
                className="border border-zinc-600/30 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-full flex flex-col justify-between gap-3 duration-300 active:scale-95 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 duration-300">
                    <ActionIcon className="w-6 h-6 fill-blue-400" name="IC-album" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-white">
                      {lang?.creators_create_album || 'Создать альбом'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {lang?.creators_create_album_desc || 'Соберите релиз или EP из нескольких треков'}
                    </span>
                  </div>
                </div>
              </Link>

              <Link
                href="/pulse/create/edit-artist"
                className="border border-zinc-600/30 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-full flex flex-col justify-between gap-3 duration-300 active:scale-95 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 duration-300">
                    <ActionIcon className="w-6 h-6 fill-emerald-400" name="IC-user" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-white">
                      {lang?.creators_new_artist || 'Новый артист'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {lang?.creators_new_artist_desc || 'Создайте карточку артиста для дистрибуции'}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* 3. Recent Tracks */}
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl font-bold text-zinc-200">
                {lang?.creators_recent_tracks || 'Недавние треки'}
              </span>
              <div className="flex flex-nowrap items-center gap-3 overflow-x-auto viewport px-3 lg:px-0 duration-300">
                <Link
                  href="/pulse/create/tracks"
                  className="shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 border border-zinc-600/30 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95"
                >
                  <ActionIcon className="w-5 h-5 fill-current" name="IC-chevron-right" />
                  <span>{lang?.all || 'Все'}</span>
                </Link>
              </div>
            </div>

            {recentTracks.length === 0 ? (
              <div className="border border-zinc-600/30 p-6 bg-zinc-800/30 rounded-3xl flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-zinc-400 text-sm">
                  {lang?.creators_no_tracks || 'У вас пока нет загруженных треков'}
                </span>
                <Link
                  href="/pulse/create/upload?mode=single"
                  className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 duration-300 shadow"
                >
                  {lang?.creators_upload_first_track || 'Загрузить первый трек'}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                {recentTracks.map((track) => {
                  const isPublic = Number(track.status) === 1;
                  return (
                    <div
                      key={track.id}
                      className="border border-zinc-600/30 pr-3 bg-zinc-800/50 hover:bg-zinc-800/80 rounded-full flex items-center justify-between gap-3 duration-300"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {track.img ? (
                          <img
                            src={track.img}
                            alt={track.name}
                            className="w-14 h-14 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 text-zinc-400">
                            <ActionIcon className="w-6 h-6 fill-zinc-400" name="IC-music" />
                          </div>
                        )}

                        <Link
                          href={`/pulse/create/edit-track?id=${track.id}`}
                          className="flex flex-col min-w-0 group/title cursor-pointer"
                        >
                          <span className="text-base font-semibold text-white truncate group-hover/title:text-zinc-200 transition-colors">
                            {track.name}
                          </span>
                          <span className="text-xs text-zinc-400 truncate group-hover/title:text-zinc-300 transition-colors">
                            {track.artist}
                          </span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {track.genre && (
                          <span className="hidden sm:inline-block px-3 py-1.5 rounded-full text-xs border border-zinc-600/30 bg-zinc-900/60 text-zinc-300">
                            {track.genre}
                          </span>
                        )}

                        {track.mood && (
                          <span
                            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-zinc-600/30 text-zinc-200 ${getPulseBackgroundColorByMood(track.mood)}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-white/70" />
                            {track.mood}
                          </span>
                        )}

                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${isPublic
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30'
                            }`}
                        >
                          {isPublic
                            ? lang?.creators_status_public || 'Публичный'
                            : lang?.creators_status_hidden || 'Скрытый'}
                        </span>

                        <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-400">
                          <ActionIcon className="w-3.5 h-3.5 fill-zinc-400" name="IC-play" />
                          {formatNumber(track.listens || 0)}
                        </span>

                        <Link
                          href={`/pulse/create/edit-track?id=${track.id}`}
                          aria-label={lang?.edittrack || 'Редактировать трек'}
                          className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                        >
                          <ActionIcon className="w-4 h-4 fill-current" name="IC-edit" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Release Guidelines */}
          <div className="border border-zinc-600/30 p-3 bg-amber-400/15 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-amber-400">
                <ActionIcon className="w-10 h-10 fill-amber-400" name="IC-warning" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-amber-400">
                  {lang?.creators_guidelines_title || 'Требования к релизу'}
                </span>
                <span className="text-xs text-amber-400/80">
                  {lang?.creators_guidelines_desc ||
                    'Аудиофайл в формате MP3 до 320 kbps. Обложка квадратная, от 1000x1000 px, без посторонних надписей и водяных знаков.'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
