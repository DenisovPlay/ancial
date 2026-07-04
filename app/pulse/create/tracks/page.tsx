'use client';

import React, { useEffect, useState } from 'react';
import { AncialAPI } from '../../../lib/api-v2';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '../../../components/modal';

export default function PulseCreateTracksPage() {
  const { lang, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<number | null>(null);

  const fetchTracks = () => {
    setLoading(true);
    AncialAPI.pulseManagement<any[]>('track', 'list', {})
      .then((res) => {
        if (Array.isArray(res)) setTracks(res);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTracks();
    }
  }, [isAuthenticated]);

  const confirmDelete = () => {
    if (trackToDelete !== null) {
      AncialAPI.pulseManagement('track', 'delete', { id: trackToDelete })
        .then(() => fetchTracks())
        .catch((err) => alert(err.error || 'Ошибка удаления'))
        .finally(() => {
          setDeleteModalOpen(false);
          setTrackToDelete(null);
        });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setTrackToDelete(id);
    setDeleteModalOpen(true);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full flex items-center gap-3">
        <h5 className="text-2xl text-zinc-200 flex-grow">{lang?.tracks || 'Треки'}</h5>
        <Link href="/pulse/create/upload" className="flex items-center gap-2 px-4 py-2 text-sm rounded-3xl bg-purple-700 hover:bg-purple-600 text-white duration-300 active:scale-95 cursor-pointer border border-zinc-600/30">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center w-full border border-zinc-600/30 bg-zinc-800/50 lg:bg-zinc-800/70 rounded-3xl overflow-hidden duration-300">
        {loading ? (
          <div className="p-5 text-center text-zinc-500">Загрузка...</div>
        ) : tracks.length > 0 ? (
          tracks.map(track => (
            <div
              key={track.id}
              className="w-full p-3 relative gap-3 flex items-center hover:bg-zinc-700/50 duration-300 cursor-pointer active:scale-[0.99]"
              onClick={() => router.push(`/pulse/create/edit-track?id=${track.id}`)}
            >
              <img className="rounded-2xl h-14 w-14 object-cover shrink-0" src={track.img || '/includes/img/Pulse_art.png'} alt={track.name} />
              <div className="flex-grow min-w-0 flex flex-col justify-center">
                <span className="text-zinc-100 md:text-xl leading-tight truncate">{track.name}</span>
                <span className="text-sm text-zinc-400 leading-tight truncate">{track.artist}</span>
                <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                  <span>{track.listens ? parseInt(track.listens, 10) : 0} прослушиваний</span>
                  {parseInt(track.status || 0, 10) === 1 ? (
                    <span className="text-xs text-green-400">Публичный</span>
                  ) : (
                    <span className="text-xs text-zinc-500">Скрытый</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/pulse/track/${track.id}`);
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
                  onClick={(e) => handleDelete(e, track.id)}
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
          <div className="p-5 text-center text-zinc-500">Нет треков. Загрузите первый!</div>
        )}
      </div>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Удалить трек?">
        <div className="flex flex-col gap-4 text-center">
          <span className="text-sm text-zinc-400">
            Удаление трека необратимо удалит его с серверов Ancial Pulse.
          </span>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="cursor-pointer flex-1 py-2 rounded-3xl bg-zinc-800/80 hover:bg-zinc-700/80 text-white duration-300 active:scale-95 border border-zinc-600/30"
            >
              Отмена
            </button>
            <button
              onClick={confirmDelete}
              className="cursor-pointer flex-1 py-2 rounded-3xl bg-red-600/80 hover:bg-red-500/80 text-white duration-300 active:scale-95 border border-red-500/30"
            >
              Удалить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
