'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { getPulseBackgroundColorByMood, ActionIcon } from '../../pulse-components';

interface PulseTrackRow {
  id: number | string;
  name?: string;
  artist?: string;
  img?: string;
  src?: string;
  listens?: number | string;
  status?: number | string;
  genre?: string;
  mood?: string;
}

export default function PulseCreateTracksPage() {
  const { lang, isAuthenticated } = useAuth();
  const { showNote } = useNotification();

  const [tracks, setTracks] = useState<PulseTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'public' | 'hidden'>('all');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<number | null>(null);

  // In-line preview audio state
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchTracks = () => {
    setLoading(true);
    AncialAPI.pulseManagement<PulseTrackRow[]>('track', 'list', {})
      .then((res) => {
        if (Array.isArray(res)) setTracks(res);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
      fetchTracks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlayPreview = (track: PulseTrackRow) => {
    const numId = Number(track.id);
    if (!track.src) return;

    if (playingTrackId === numId) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPlayingTrackId(null);
      audioRef.current.onerror = () => {
        setPlayingTrackId(null);
        showNote({ content: lang?.errorhappend || 'Ошибка воспроизведения', type: 'error', time: 3 });
      };
    }

    audioRef.current.src = track.src;
    audioRef.current.play()
      .then(() => setPlayingTrackId(numId))
      .catch(() => setPlayingTrackId(null));
  };

  const handleCopyLink = (trackId: number | string) => {
    const url = `${window.location.origin}/pulse/track/${trackId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => {
          showNote({
            content: lang?.creators_link_copied || 'Ссылка скопирована в буфер',
            type: 'success',
            time: 3,
          });
        })
        .catch(() => {
          showNote({ content: url, type: 'info', time: 5 });
        });
    }
  };

  const confirmDelete = () => {
    if (trackToDelete !== null) {
      if (playingTrackId === trackToDelete && audioRef.current) {
        audioRef.current.pause();
        setPlayingTrackId(null);
      }

      AncialAPI.pulseManagement('track', 'delete', { id: trackToDelete })
        .then(() => fetchTracks())
        .catch((err) =>
          showNote({
            content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.errorhappend || 'Ошибка удаления'),
            type: 'error',
            time: 5,
          })
        )
        .finally(() => {
          setDeleteModalOpen(false);
          setTrackToDelete(null);
        });
    }
  };

  const handleDelete = (id: number | string) => {
    setTrackToDelete(typeof id === 'number' ? id : Number.parseInt(String(id), 10));
    setDeleteModalOpen(true);
  };

  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const isPublic = Number(track.status ?? 0) === 1;
      if (statusFilter === 'public' && !isPublic) return false;
      if (statusFilter === 'hidden' && isPublic) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = (track.name || '').toLowerCase().includes(query);
      const artistMatch = (track.artist || '').toLowerCase().includes(query);
      const genreMatch = (track.genre || '').toLowerCase().includes(query);
      return nameMatch || artistMatch || genreMatch;
    });
  }, [tracks, searchQuery, statusFilter]);

  const formatNumber = (num: number | string | undefined) => {
    const val = typeof num === 'string' ? parseInt(num, 10) : num;
    return new Intl.NumberFormat('ru-RU').format(val || 0);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1. Header Toolbar */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">
            {lang?.tracks || 'Треки'}
          </h1>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-800 border border-zinc-600/30 text-zinc-300">
            {filteredTracks.length}
          </span>
        </div>

        <Link
          href="/pulse/create/upload?mode=single"
          className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 duration-300 flex items-center justify-center gap-2 shadow shrink-0"
        >
          <ActionIcon className="w-4 h-4 fill-black" name="IC-plus" />
          <span>{lang?.uploadtrack || 'Загрузить трек'}</span>
        </Link>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="h-12 flex-1 flex items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 backdrop-blur-md backdrop-saturate-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang?.creators_search_placeholder || 'Поиск по названию или артисту...'}
            className="w-full bg-transparent pl-3 text-white placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 text-sm"
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-zinc-700 active:scale-95"
              aria-label="Очистить поиск"
            >
              <ActionIcon className="h-8 w-8 cursor-pointer" name="IC-times" />
            </button>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <ActionIcon className="h-8 w-8 cursor-pointer" name="IC-search" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-full font-semibold border duration-300 cursor-pointer active:scale-95 ${statusFilter === 'all'
              ? 'bg-white text-black border-white shadow'
              : 'bg-zinc-900/40 text-zinc-400 border-zinc-600/30 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            {lang?.creators_filter_all || 'Все'}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('public')}
            className={`px-4 py-2 rounded-full font-semibold border duration-300 cursor-pointer active:scale-95 ${statusFilter === 'public'
              ? 'bg-white text-black border-white shadow'
              : 'bg-zinc-900/40 text-zinc-400 border-zinc-600/30 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            {lang?.creators_filter_public || 'Публичные'}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('hidden')}
            className={`px-4 py-2 rounded-full font-semibold border duration-300 cursor-pointer active:scale-95 ${statusFilter === 'hidden'
              ? 'bg-white text-black border-white shadow'
              : 'bg-zinc-900/40 text-zinc-400 border-zinc-600/30 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            {lang?.creators_filter_hidden || 'Скрытые'}
          </button>
        </div>
      </div>

      {/* 3. Tracks List */}
      {loading ? (
        <div className="p-6 text-center text-zinc-500 flex justify-center items-center">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      ) : filteredTracks.length > 0 ? (
        <div className="flex flex-col gap-3 w-full">
          {filteredTracks.map((track) => {
            const numId = Number(track.id);
            const isPublic = Number(track.status ?? 0) === 1;
            const isPlaying = playingTrackId === numId;

            return (
              <div
                key={track.id}
                className="w-full p-3 sm:pl-0 sm:py-0 border border-zinc-600/30 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-3xl sm:rounded-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 duration-300"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-14 h-14 shrink-0 group">
                    <img
                      className="rounded-full w-14 h-14 object-cover"
                      src={track.img || '/img/pulse/artist.png'}
                      alt={track.name || 'Cover'}
                    />
                    {track.src && (
                      <button
                        type="button"
                        onClick={() => togglePlayPreview(track)}
                        aria-label={isPlaying ? 'Pause' : 'Play preview'}
                        className={`absolute inset-0 m-auto w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 ${isPlaying
                          ? 'bg-white text-black opacity-100 shadow-lg'
                          : 'bg-black/60 text-white opacity-0 group-hover:opacity-100 backdrop-blur-sm'
                          }`}
                      >
                        {isPlaying ? (
                          <ActionIcon className="w-5 h-5 fill-current" name="IC-pause" />
                        ) : (
                          <ActionIcon className="w-5 h-5 fill-current ml-0.5" name="IC-play" />
                        )}
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/pulse/create/edit-track?id=${track.id}`}
                    className="flex flex-col justify-center min-w-0 flex-1 h-14 cursor-pointer group/title"
                  >
                    <span className="text-base font-semibold text-white leading-tight truncate group-hover/title:text-zinc-200 transition-colors">
                      {track.name}
                    </span>
                    <span className="text-sm text-zinc-400 leading-tight truncate mt-1 group-hover/title:text-zinc-300 transition-colors">
                      {track.artist}
                    </span>
                  </Link>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-center flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${isPublic
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30'
                      }`}
                  >
                    {isPublic
                      ? lang?.creators_status_public || 'Публичный'
                      : lang?.creators_status_hidden || 'Скрытый'}
                  </span>

                  {track.genre && (
                    <span className="px-3 py-1 rounded-full text-xs border border-zinc-600/30 bg-zinc-900/60 text-zinc-300 hidden md:inline-flex">
                      {track.genre}
                    </span>
                  )}

                  {track.mood && (
                    <span
                      className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-zinc-600/30 text-zinc-200 ${getPulseBackgroundColorByMood(track.mood)}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                      {track.mood}
                    </span>
                  )}

                  <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                    <ActionIcon className="w-3.5 h-3.5 fill-zinc-400" name="IC-play" />
                    {formatNumber(track.listens)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(track.id)}
                    aria-label={lang?.creators_copy_link || 'Копировать ссылку'}
                    title={lang?.creators_copy_link || 'Копировать ссылку'}
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-link" />
                  </button>

                  <Link
                    href={`/pulse/track/${track.id}`}
                    aria-label="Открыть в Pulse"
                    title="Открыть в Pulse"
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-eye" />
                  </Link>

                  <Link
                    href={`/pulse/create/edit-track?id=${track.id}`}
                    aria-label={lang?.edittrack || 'Редактировать трек'}
                    title={lang?.edittrack || 'Редактировать'}
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-edit" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(track.id)}
                    aria-label={lang?.delete || 'Удалить'}
                    title={lang?.delete || 'Удалить'}
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-500/20 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-zinc-600/30 p-6 bg-zinc-800/30 rounded-3xl flex flex-col items-center justify-center gap-3 text-center">
          <span className="text-zinc-400 text-sm">
            {searchQuery ? 'Ничего не найдено по вашему запросу' : lang?.creators_no_tracks || 'У вас пока нет загруженных треков'}
          </span>
          {!searchQuery && (
            <Link
              href="/pulse/create/upload?mode=single"
              className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 duration-300 shadow"
            >
              {lang?.creators_upload_first_track || 'Загрузить первый трек'}
            </Link>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Удалить трек?"
        description="Удаление трека необратимо удалит его с серверов Zypo Pulse."
      />
    </div>
  );
}
