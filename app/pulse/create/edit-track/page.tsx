'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AncialAPI } from '../../../lib/api-v2';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PulseCreateEditTrackPage() {
  const { lang, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const id = idParam ? parseInt(idParam, 10) : 0;
  const { showNote } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArtistsDropdown, setShowArtistsDropdown] = useState(false);
  
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [artistsIds, setArtistsIds] = useState<string[]>([]);
  const [img, setImg] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [trackLang, setTrackLang] = useState('');
  const [explicit, setExplicit] = useState('0');
  const [status, setStatus] = useState('1');
  const [src, setSrc] = useState('');
  
  const [allArtists, setAllArtists] = useState<any[]>([]);
  const blobUrlRef = useRef<string | null>(null);

  const cleanupBlobUrl = () => {
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupBlobUrl();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && id > 0) {
      Promise.all([
        AncialAPI.pulseManagement<any[]>('track', 'list', {}),
        AncialAPI.pulseManagement<any[]>('artist', 'list', {})
      ])
        .then(([tracksRes, artistsRes]) => {
          if (Array.isArray(artistsRes)) setAllArtists(artistsRes);
          
          if (Array.isArray(tracksRes)) {
            const track = tracksRes.find((t: any) => parseInt(t.id, 10) === id);
            if (track) {
              setName(track.name || '');
              setArtist(track.artist || '');
              setImg(track.img || '');
              setGenre(track.genre || '');
              setMood(track.mood || '');
              setTrackLang(track.lang || '--');
              setExplicit(track.explicit ? String(track.explicit) : '0');
              setStatus(track.status !== undefined ? String(track.status) : '1');
              setArtistsIds((track.artists_ids || '').split(',').filter(Boolean));
              setSrc(track.src || '');
            }
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    cleanupBlobUrl();
    const tempUrl = URL.createObjectURL(file);
    blobUrlRef.current = tempUrl;
    setImg(tempUrl);

    const formData = new FormData();
    formData.append('image', file);

    fetch('https://api.imgbb.com/1/upload?key=595c8d872da11fdaa5225badc67cc6e6', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(res => {
        if (res?.data?.url) {
          cleanupBlobUrl();
          setImg(res.data.url);
        }
      })
      .catch(console.error);
  };

  const saveTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = {
      id,
      name,
      artist,
      artists_ids: artistsIds.length > 0 ? artistsIds.join(',') + ',' : '',
      img,
      genre,
      mood, // Not supported by Management.php yet, but keeping state just in case
      lang: trackLang,
      explicit,
      status
    };

    AncialAPI.pulseManagement('track', 'update', data)
      .then(() => {
        router.push('/pulse/create/tracks');
      })
      .catch((err: any) => {
        showNote({ content: err?.error || 'Произошла ошибка', type: 'error', time: 5 });
        setSaving(false);
      });
  };

  if (!isAuthenticated) return null;
  if (!id) return <div className="p-5 text-center text-zinc-500">Трек не найден</div>;

  const selectedArtists = allArtists.filter(a => artistsIds.includes(String(a.id)));

  return (
    <div className="w-full flex flex-col gap-3 relative">
      <h5 className="text-2xl text-zinc-200 w-full">Редактировать трек</h5>
      
      {loading ? (
        <div className="p-5 text-center text-zinc-500">Загрузка...</div>
      ) : (
        <form onSubmit={saveTrack} className="flex flex-col gap-4 w-full">
          <div className="w-full flex flex-col items-center justify-center">
            <input type="file" id="trackcover" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <label htmlFor="trackcover" className="w-64 h-64 bg-zinc-800/70 border border-zinc-600/30 rounded-3xl flex flex-col items-center justify-center gap-3 shadow cursor-pointer duration-300 active:scale-95 hover:bg-zinc-700/70 overflow-hidden relative group">
              <img className={`w-64 h-64 object-cover absolute top-0 left-0 ${img ? '' : 'hidden'}`} src={img} alt="Cover" />
              
              <div className={`${img ? 'hidden' : 'flex flex-col items-center justify-center'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-zinc-500 text-sm">Загрузить обложку</span>
              </div>

              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                <span className="text-white text-sm font-medium">Нажмите, чтобы обновить обложку</span>
              </div>
            </label>
            
            {src && (
              <div className="w-full max-w-md mt-4">
                <audio controls src={src} className="w-full" />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.trackName || 'Название трека'}</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
            
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.trackArtists || 'Исполнитель'}</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input required type="text" value={artist} onChange={e => setArtist(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>

            {allArtists.length > 0 && (
              <div className="flex flex-col w-full col-span-1 lg:col-span-2 -mt-1.5 relative" style={{ zIndex: 50 }}>
                <span className="text-zinc-400 pl-4 z-20 text-sm">Привязка к страницам артистов</span>
                <div className="relative w-full -mt-3">
                  <div 
                    onClick={() => setShowArtistsDropdown(!showArtistsDropdown)} 
                    className="flex bg-zinc-800/90 rounded-3xl w-full p-1 min-h-[48px] border border-zinc-600/30 cursor-pointer items-center transition-colors hover:bg-zinc-700/50"
                  >
                    <div className="flex flex-wrap gap-1.5 pl-3 pr-8 w-full pointer-events-none py-1.5 min-h-[32px] items-center">
                      {selectedArtists.length === 0 ? (
                        <span className="text-zinc-500 text-sm">Выбрать артистов...</span>
                      ) : (
                        selectedArtists.map(a => (
                          <span key={a.id} className="bg-purple-600/80 border border-purple-500 text-white text-xs px-3 py-1.5 rounded-full">{a.name}</span>
                        ))
                      )}
                    </div>
                    <svg className={`w-6 h-6 fill-zinc-500 absolute right-3 pointer-events-none transition-transform duration-200 ${showArtistsDropdown ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"></path></svg>
                  </div>
                  
                  {showArtistsDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowArtistsDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-800/95 backdrop-blur-md border border-zinc-600/30 rounded-2xl shadow-xl shadow-black/50 max-h-56 overflow-y-auto z-50 py-1">
                        {allArtists.map(a => (
                          <label key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/50 cursor-pointer border-b border-zinc-700/30 last:border-0 text-zinc-200 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={artistsIds.includes(String(a.id))}
                              onChange={(e) => {
                                if (e.target.checked) setArtistsIds([...artistsIds, String(a.id)]);
                                else setArtistsIds(artistsIds.filter(id => id !== String(a.id)));
                              }}
                              className="w-4 h-4 rounded bg-zinc-900 border-zinc-500 text-purple-600 focus:ring-purple-600 focus:ring-offset-zinc-800 cursor-pointer" 
                            />
                            <span className="text-sm ml-1">{a.name}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumgenre || 'Жанр'}</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input type="text" value={genre} onChange={e => setGenre(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
            
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">Mood</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input type="text" value={mood} onChange={e => setMood(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
            
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.tracklang || 'Язык трека'}</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30 overflow-hidden">
                <select value={trackLang} onChange={e => setTrackLang(e.target.value)} className="rounded-3xl bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 cursor-pointer">
                  <option value="--">{lang?.tracklangNo || 'Без слов'}</option>
                  <option value="RU">{lang?.tracklangRu || 'Русский'}</option>
                  <option value="EN">{lang?.tracklangEn || 'Английский'}</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.trackexp || 'Explicit (18+)'}</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30 overflow-hidden">
                <select value={explicit} onChange={e => setExplicit(e.target.value)} className="rounded-3xl bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 cursor-pointer">
                  <option value="0">{lang?.trackexpN || 'Нет (0+)'}</option>
                  <option value="1">{lang?.trackexpY || 'Да (18+)'}</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col w-full -mt-1.5 col-span-1 lg:col-span-2">
              <span className="text-zinc-400 pl-4 z-20 text-sm">Статус</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30 overflow-hidden">
                <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-3xl bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 cursor-pointer">
                  <option value="1">Публичный</option>
                  <option value="0">Скрытый</option>
                </select>
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={saving} className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full w-full disabled:opacity-50 mt-2">
            Сохранить изменения
          </button>
        </form>
      )}
    </div>
  );
}
