'use client';

import React, { useEffect, useState } from 'react';
import { AncialAPI } from '../../../lib/api-v2';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDeleteModal from '../../../components/confirm-delete-modal';

export default function PulseCreateArtistsPage() {
  const { lang, isAuthenticated } = useAuth();
  const router = useRouter();
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<number | null>(null);

  const fetchArtists = () => {
    setLoading(true);
    AncialAPI.pulseManagement<any[]>('artist', 'list', {})
      .then((res) => {
        if (Array.isArray(res)) setArtists(res);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchArtists();
    }
  }, [isAuthenticated]);

  const confirmDelete = () => {
    if (artistToDelete !== null) {
      AncialAPI.pulseManagement('artist', 'delete', { id: artistToDelete })
        .then(() => fetchArtists())
        .catch((err) => alert(err.error || 'Ошибка удаления'))
        .finally(() => {
          setDeleteModalOpen(false);
          setArtistToDelete(null);
        });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setArtistToDelete(id);
    setDeleteModalOpen(true);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full flex items-center gap-3">
        <h5 className="text-2xl text-zinc-200 flex-grow">{lang?.artists || 'Артисты'}</h5>
        <Link href="/pulse/create/edit-artist" className="flex items-center gap-2 px-4 py-2 text-sm rounded-3xl bg-purple-700 hover:bg-purple-600 text-white duration-300 active:scale-95 cursor-pointer border border-zinc-600/30">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center w-full border border-zinc-600/30 bg-zinc-800/50 lg:bg-zinc-800/70 rounded-3xl overflow-hidden duration-300">
        {loading ? (
          <div className="p-5 text-center text-zinc-500">Загрузка...</div>
        ) : artists.length > 0 ? (
          artists.map(artist => (
            <div
              key={artist.id}
              className="w-full p-3 relative gap-3 flex items-center hover:bg-zinc-700/50 duration-300 cursor-pointer active:scale-[0.99]"
              onClick={() => router.push(`/pulse/create/edit-artist?id=${artist.id}`)}
            >
              <img className="h-14 w-14 rounded-2xl object-cover shrink-0" src={artist.img || '/includes/img/Pulse_art.png'} alt={artist.name} />
              <div className="flex-grow min-w-0">
                <span className="md:text-xl text-zinc-100 truncate block">{artist.name}</span>
                <span className="text-sm text-zinc-400 truncate block">{artist.desk?.length > 60 ? artist.desk.substring(0, 60) + '...' : artist.desk}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/pulse/artist/${artist.id}`);
                  }}
                  className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-600/60 duration-300 cursor-pointer"
                  title="Открыть в Pulse"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(e, artist.id)}
                  className="p-2 rounded-full text-red-500 hover:bg-red-500/20 duration-300 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-5 text-center text-zinc-500">Нет артистов. Создайте первого!</div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Удалить артиста?"
        description="Удаление профиля артиста необратимо удалит его с серверов Ancial Pulse. Привязанные треки и альбомы останутся."
      />
    </div>
  );
}
