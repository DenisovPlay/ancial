'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { ActionIcon } from '../../pulse-components';

interface PulseAlbumRow {
  id: number | string;
  name?: string;
  artist?: string;
  img?: string;
  desk?: string;
  likes?: number | string;
  songs?: string;
  total_listens?: number | string;
}

export default function PulseCreateAlbumsPage() {
  const { lang, isAuthenticated } = useAuth();
  const { showNote } = useNotification();

  const [albums, setAlbums] = useState<PulseAlbumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<number | null>(null);

  const fetchAlbums = () => {
    setLoading(true);
    AncialAPI.pulseManagement<PulseAlbumRow[]>('album', 'list', {})
      .then((res) => {
        if (Array.isArray(res)) setAlbums(res);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
      fetchAlbums();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const confirmDelete = () => {
    if (albumToDelete !== null) {
      AncialAPI.pulseManagement('album', 'delete', { id: albumToDelete })
        .then(() => fetchAlbums())
        .catch((err) =>
          showNote({
            content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.errorhappend || 'Ошибка удаления'),
            type: 'error',
            time: 5,
          })
        )
        .finally(() => {
          setDeleteModalOpen(false);
          setAlbumToDelete(null);
        });
    }
  };

  const handleDelete = (id: number | string) => {
    setAlbumToDelete(typeof id === 'number' ? id : Number.parseInt(String(id), 10));
    setDeleteModalOpen(true);
  };

  const handleCopyLink = (albumId: number | string) => {
    const url = `${window.location.origin}/pulse/playlist/${albumId}`;
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

  const getSongsCount = (songsStr?: string) => {
    if (!songsStr) return 0;
    return songsStr.split('|').filter(Boolean).length;
  };

  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albums;
    const q = searchQuery.toLowerCase().trim();
    return albums.filter((alb) => {
      const nameMatch = (alb.name || '').toLowerCase().includes(q);
      const artistMatch = (alb.artist || '').toLowerCase().includes(q);
      const deskMatch = (alb.desk || '').toLowerCase().includes(q);
      return nameMatch || artistMatch || deskMatch;
    });
  }, [albums, searchQuery]);

  const formatNumber = (num: number | string | undefined) => {
    const val = typeof num === 'string' ? parseInt(num, 10) : num;
    return new Intl.NumberFormat('ru-RU').format(val || 0);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1. Toolbar */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">
            {lang?.albums || 'Альбомы'}
          </h1>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-800 border border-zinc-600/30 text-zinc-300">
            {filteredAlbums.length}
          </span>
        </div>

        <Link
          href="/pulse/create/upload?mode=album"
          className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 duration-300 flex items-center justify-center gap-2 shadow shrink-0"
        >
          <ActionIcon className="w-4 h-4 fill-black" name="IC-plus" />
          <span>{lang?.creators_create_album || 'Создать альбом'}</span>
        </Link>
      </div>

      {/* 2. Search */}
      <div className="w-full flex items-center gap-3">
        <div className="h-12 w-full flex items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 backdrop-blur-md backdrop-saturate-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang?.creators_search_albums || 'Поиск по альбомам...'}
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
      </div>

      {/* 3. Albums List */}
      {loading ? (
        <div className="p-6 text-center text-zinc-500 flex justify-center items-center">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      ) : filteredAlbums.length > 0 ? (
        <div className="flex flex-col gap-3 w-full">
          {filteredAlbums.map((album) => {
            const songsCount = getSongsCount(album.songs);
            const totalListens = album.total_listens ? parseInt(String(album.total_listens), 10) : 0;
            const likesCount = album.likes ? parseInt(String(album.likes), 10) : 0;

            return (
              <div
                key={album.id}
                className="w-full p-3 sm:pl-0 sm:py-0 border border-zinc-600/30 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-3xl sm:rounded-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 duration-300"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    className="rounded-full w-14 h-14 object-cover shrink-0"
                    src={album.img || '/img/pulse/artist.png'}
                    alt={album.name || 'Album cover'}
                  />

                  <Link
                    href={`/pulse/create/edit-album?id=${album.id}`}
                    className="flex flex-col justify-center min-w-0 flex-1 h-14 cursor-pointer group/title"
                  >
                    <span className="text-base font-semibold text-white leading-tight truncate group-hover/title:text-zinc-200 transition-colors">
                      {album.name}
                    </span>
                    <span className="text-sm text-zinc-400 leading-tight truncate mt-1 group-hover/title:text-zinc-300 transition-colors">
                      {album.artist || 'Неизвестный исполнитель'}
                    </span>
                  </Link>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-center">
                  <span className="px-3 py-1 rounded-full text-xs border border-zinc-600/30 bg-zinc-900/60 text-zinc-300 shrink-0">
                    {songsCount} {lang?.tracks || 'треков'}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                    <ActionIcon className="w-3.5 h-3.5 fill-zinc-400" name="IC-play" />
                    {formatNumber(totalListens)}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-rose-400 shrink-0">
                    <ActionIcon className="w-3.5 h-3.5 fill-rose-400" name="IC-heart-filled" />
                    {formatNumber(likesCount)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(album.id)}
                    aria-label={lang?.creators_copy_link || 'Копировать ссылку'}
                    title={lang?.creators_copy_link || 'Копировать ссылку'}
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-link" />
                  </button>

                  <Link
                    href={`/pulse/playlist/${album.id}`}
                    aria-label="Открыть в Pulse"
                    title="Открыть в Pulse"
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-eye" />
                  </Link>

                  <Link
                    href={`/pulse/create/edit-album?id=${album.id}`}
                    aria-label={lang?.edittrack || 'Редактировать альбом'}
                    title={lang?.edittrack || 'Редактировать'}
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-edit" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(album.id)}
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
            {searchQuery ? 'Ничего не найдено по вашему запросу' : lang?.creators_no_albums || 'У вас пока нет альбомов'}
          </span>
          {!searchQuery && (
            <Link
              href="/pulse/create/upload?mode=album"
              className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 duration-300 shadow"
            >
              {lang?.creators_create_album || 'Создать альбом'}
            </Link>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Удалить альбом?"
        description="Удаление альбома необратимо удалит его с серверов Zypo Pulse. Все привязанные треки также могут быть удалены."
      />
    </div>
  );
}
