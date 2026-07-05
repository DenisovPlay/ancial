'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from './modal';
import { AncialAPI } from '../lib/api-v2';
import { useAuth } from '../context/AuthContext';
import { SvgIcon } from '../feed/editor-shared';

type TrackSearchResult = {
  id: number;
  name: string;
  artist: string;
  img: string;
  src: string;
};

// Pulse API response format
type PulseTrack = {
  sid: number;
  title: string;
  artist: string;
  src: string;
  artwork: { src: string }[];
};

export type MusicWidgetDraft = {
  type: 'music';
  track_id: number;
  track_name: string;
  artist_name: string;
  track_img: string;
};

type PostWidgetMusicModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (music: MusicWidgetDraft) => void;
};

export default function PostWidgetMusicModal({ isOpen, onClose, onAdd }: PostWidgetMusicModalProps) {
  const { lang } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [favorites, setFavorites] = useState<TrackSearchResult[]>([]);

  const fetchFavorites = useCallback(async () => {
    try {
      // Directly request Library.php to get full track objects, since pulseGetLibrary returns only IDs for favorites
      const res = await AncialAPI.request<{ favorites?: PulseTrack[] }>('/pulse/Library.php?type=favorites');
      if (res?.favorites) {
        setFavorites(res.favorites.map(t => ({
          id: t.sid,
          name: t.title,
          artist: t.artist,
          src: t.src,
          img: t.artwork?.[0]?.src || '/img/noimg.png'
        })));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSearching(false);
      void fetchFavorites();
    }
  }, [isOpen, fetchFavorites]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await AncialAPI.pulseSearch<{ tracks?: PulseTrack[] }>(q);
      if (res?.tracks) {
        setResults(res.tracks.map(t => ({
          id: t.sid,
          name: t.title,
          artist: t.artist,
          src: t.src,
          img: t.artwork?.[0]?.src || '/img/noimg.png'
        })));
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelect = (track: TrackSearchResult) => {
    onAdd({
      type: 'music',
      track_id: track.id,
      track_name: track.name,
      artist_name: track.artist,
      track_img: track.img,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang?.attach_audio || "Прикрепить аудиозапись"} width="md">
      <div className="flex flex-col gap-3 relative">
        <div className="relative sticky top-0 z-[90]">
          <div className="relative border border-zinc-600/30 flex bg-zinc-900/50 backdrop-blur-sm backdrop-saturate-200 rounded-full w-full p-1 h-12">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              {searching ? (
                <div className="w-5 h-5 rounded-full border-2 border-zinc-500/30 border-t-purple-500 animate-spin" />
              ) : (
                <SvgIcon className="w-5 h-5 fill-zinc-500" id="IC-search" />
              )}
            </div>
            <input
              type="text"
              autoComplete="off"
              placeholder={lang?.search_tracks || "Поиск треков..."}
              value={query}
              onChange={e => void handleSearch(e.target.value)}
              className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-10 pr-2 placeholder-zinc-600 text-white text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {query.trim().length > 0 && results.length === 0 && !searching && (
            <div className="w-full flex items-center justify-center py-6 text-sm text-zinc-500">
              {lang?.nothing_found || "Ничего не найдено"}
            </div>
          )}

          {(query.trim().length === 0 ? favorites : results).map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => handleSelect(track)}
              className="flex items-center gap-3 rounded-3xl hover:bg-zinc-800/80 transition-colors cursor-pointer active:scale-95 duration-300 text-left w-full border border-transparent hover:border-zinc-600/30 group"
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl overflow-hidden bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={track.img} alt={track.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-sm font-medium text-zinc-100 truncate">{track.name}</span>
                <span className="text-xs text-zinc-400 truncate">{track.artist}</span>
              </div>
              <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 border border-zinc-600/30 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-500 transition-colors duration-300">
                <SvgIcon className="w-4 h-4 fill-current" id="IC-plus" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
