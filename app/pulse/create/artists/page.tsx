'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { ActionIcon, cn } from '../../pulse-components';

interface PulseArtistRow {
  id: number | string;
  name?: string;
  img?: string;
  desk?: string;
  verify?: number | string;
}

export default function PulseCreateArtistsPage() {
  const { lang, isAuthenticated } = useAuth();
  const { showNote } = useNotification();

  const [artists, setArtists] = useState<PulseArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<number | null>(null);

  const fetchArtists = () => {
    setLoading(true);
    AncialAPI.pulseManagement<PulseArtistRow[]>('artist', 'list', {})
      .then((res) => {
        if (Array.isArray(res)) setArtists(res);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
      fetchArtists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const confirmDelete = () => {
    if (artistToDelete !== null) {
      AncialAPI.pulseManagement('artist', 'delete', { id: artistToDelete })
        .then(() => fetchArtists())
        .catch((err) => {
          const rawMsg =
            err instanceof Error
              ? err.message
              : typeof err === 'object' && err !== null && 'error' in err
                ? String((err as { error?: unknown }).error)
                : null;
          showNote({
            content: getApiMessage(rawMsg, lang, lang?.errorhappend || 'Ошибка удаления'),
            type: 'error',
            time: 5,
          });
        })
        .finally(() => {
          setDeleteModalOpen(false);
          setArtistToDelete(null);
        });
    }
  };

  const handleDelete = (id: number | string) => {
    setArtistToDelete(typeof id === 'number' ? id : Number.parseInt(String(id), 10));
    setDeleteModalOpen(true);
  };

  const handleCopyLink = (artistId: number | string) => {
    const url = `${window.location.origin}/pulse/artist/${artistId}`;
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

  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists;
    const q = searchQuery.toLowerCase().trim();
    return artists.filter((art) => {
      const nameMatch = (art.name || '').toLowerCase().includes(q);
      const deskMatch = (art.desk || '').toLowerCase().includes(q);
      return nameMatch || deskMatch;
    });
  }, [artists, searchQuery]);

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1. Toolbar */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">
            {lang?.artists || 'Артисты'}
          </h1>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-800 border border-zinc-600/30 text-zinc-300">
            {filteredArtists.length}
          </span>
        </div>

        <Link
          href="/pulse/create/edit-artist"
          className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 duration-300 flex items-center justify-center gap-2 shadow shrink-0"
        >
          <ActionIcon className="w-4 h-4 fill-black" name="IC-plus" />
          <span>{lang?.creators_new_artist || 'Новый артист'}</span>
        </Link>
      </div>

      {/* 2. Search */}
      <div className="w-full flex items-center gap-3">
        <div className="h-12 w-full flex items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 backdrop-blur-md backdrop-saturate-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang?.creators_search_artists || 'Поиск по артистам...'}
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

      {/* 3. Artists List */}
      {loading ? (
        <div className="p-6 text-center text-zinc-500 flex justify-center items-center">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      ) : filteredArtists.length > 0 ? (
        <div className="flex flex-col gap-3 w-full">
          {filteredArtists.map((artist) => {
            const verifyStatus = artist.verify !== undefined && artist.verify !== null ? String(artist.verify) : '';
            const hasVerification = verifyStatus === '0' || verifyStatus === '1';

            return (
              <div
                key={artist.id}
                className="w-full p-3 sm:pl-0 sm:py-0 border border-zinc-600/30 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-3xl sm:rounded-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 duration-300"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    className="h-14 w-14 rounded-full object-cover shrink-0"
                    src={artist.img || '/img/pulse/artist.png'}
                    alt={artist.name || 'Artist avatar'}
                  />

                  <Link
                    href={`/pulse/create/edit-artist?id=${artist.id}`}
                    className="flex flex-col justify-center min-w-0 flex-1 h-14 cursor-pointer group/title"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white truncate group-hover/title:text-zinc-200 transition-colors">
                        {artist.name}
                      </span>
                      {hasVerification && (
                        <ActionIcon
                          className={cn(
                            'w-5 h-5 shrink-0',
                            verifyStatus === '1' ? 'fill-blue-500' : 'fill-amber-500'
                          )}
                          name="IC-verify"
                        />
                      )}
                    </div>

                    {artist.desk ? (
                      <span className="text-sm text-zinc-400 leading-tight truncate mt-1 group-hover/title:text-zinc-300 transition-colors">
                        {artist.desk}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 leading-tight truncate mt-1">
                        {lang?.creators_edit_artist || 'Редактировать профиль'}
                      </span>
                    )}
                  </Link>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(artist.id)}
                    aria-label={lang?.creators_copy_link || 'Копировать ссылку'}
                    title={lang?.creators_copy_link || 'Копировать ссылку'}
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-link" />
                  </button>

                  <Link
                    href={`/pulse/artist/${artist.id}`}
                    aria-label="Открыть в Pulse"
                    title="Открыть в Pulse"
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-eye" />
                  </Link>

                  <Link
                    href={`/pulse/create/edit-artist?id=${artist.id}`}
                    aria-label={lang?.edittrack || 'Редактировать артиста'}
                    title={lang?.edittrack || 'Редактировать'}
                    className="w-9 h-9 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                  >
                    <ActionIcon className="w-4 h-4 fill-current" name="IC-edit" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(artist.id)}
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
            {searchQuery ? 'Ничего не найдено по вашему запросу' : lang?.creators_no_artists || 'У вас пока нет профилей артистов'}
          </span>
          {!searchQuery && (
            <Link
              href="/pulse/create/edit-artist"
              className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 duration-300 shadow"
            >
              {lang?.creators_new_artist || 'Новый артист'}
            </Link>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Удалить артиста?"
        description="Удаление профиля артиста необратимо удалит его с серверов Zypo Pulse. Привязанные треки и альбомы останутся."
      />
    </div>
  );
}
