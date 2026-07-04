'use client';

import React, { useEffect, useState } from 'react';
import { AncialAPI } from '../../../lib/api-v2';
import { useAuth } from '../../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PulseCreateEditAlbumPage() {
  const { lang, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const id = idParam ? parseInt(idParam, 10) : 0;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArtistsDropdown, setShowArtistsDropdown] = useState(false);
  
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [artistsIds, setArtistsIds] = useState<string[]>([]);
  const [desk, setDesk] = useState('');
  const [img, setImg] = useState('');
  const [genre, setGenre] = useState('');
  
  const [allArtists, setAllArtists] = useState<any[]>([]);
  const [albumTracks, setAlbumTracks] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated && id > 0) {
      Promise.all([
        AncialAPI.pulseManagement<any[]>('album', 'list', {}),
        AncialAPI.pulseManagement<any[]>('track', 'list', {}),
        AncialAPI.pulseManagement<any[]>('artist', 'list', {})
      ])
        .then(([albumsRes, tracksRes, artistsRes]) => {
          if (Array.isArray(artistsRes)) setAllArtists(artistsRes);
          
          if (Array.isArray(albumsRes)) {
            const album = albumsRes.find((a: any) => parseInt(a.id, 10) === id);
            if (album) {
              setName(album.name || '');
              setArtist(album.artist || '');
              setDesk(album.desk || '');
              setImg(album.img || '');
              setArtistsIds((album.artists_ids || '').split(',').filter(Boolean));
              
              const songIds = (album.songs || '').split('|').filter(Boolean).map((s: string) => parseInt(s, 10));
              let foundGenre = '';
              const myTracks = (Array.isArray(tracksRes) ? tracksRes : []).filter((t: any) => songIds.includes(parseInt(t.id, 10)));
              
              // Maintain order
              const sortedTracks = [];
              for (const sid of songIds) {
                const tr = myTracks.find((t: any) => parseInt(t.id, 10) === sid);
                if (tr) {
                  if (!foundGenre && tr.genre) foundGenre = tr.genre;
                  sortedTracks.push(tr);
                }
              }
              
              setGenre(foundGenre);
              setAlbumTracks(sortedTracks);
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
    const tempUrl = URL.createObjectURL(file);
    setImg(tempUrl);

    const formData = new FormData();
    formData.append('image', file);

    fetch('https://api.imgbb.com/1/upload?key=595c8d872da11fdaa5225badc67cc6e6', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(res => {
        if (res?.data?.url) setImg(res.data.url);
      })
      .catch(console.error);
  };

  const saveAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = {
      id,
      name,
      artist,
      artists_ids: artistsIds.length > 0 ? artistsIds.join(',') + ',' : '',
      desk,
      img,
      genre,
      tracks: JSON.stringify(albumTracks.map(t => ({
        id: t.id,
        artist: t.artist,
        name: t.name,
        lang: t.lang,
        explicit: t.explicit,
        status: t.status
      })))
    };

    AncialAPI.pulseManagement('album', 'update', data)
      .then(() => {
        router.push('/pulse/create/albums');
      })
      .catch((err: any) => {
        alert(err.error || 'Произошла ошибка');
        setSaving(false);
      });
  };

  const updateTrack = (index: number, field: string, value: any) => {
    const newTracks = [...albumTracks];
    newTracks[index] = { ...newTracks[index], [field]: value };
    setAlbumTracks(newTracks);
  };

  if (!isAuthenticated) return null;
  if (!id) return <div className="p-5 text-center text-zinc-500">Альбом не найден</div>;

  const selectedArtists = allArtists.filter(a => artistsIds.includes(String(a.id)));

  return (
    <div className="w-full flex flex-col gap-3 relative">
      <h5 className="text-2xl text-zinc-200 w-full">Редактировать альбом</h5>
      
      {loading ? (
        <div className="p-5 text-center text-zinc-500">Загрузка...</div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="w-full flex flex-col items-center justify-center">
            <input type="file" id="albumcover" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <label htmlFor="albumcover" className="w-64 h-64 bg-zinc-800/70 border border-zinc-600/30 rounded-3xl flex flex-col items-center justify-center gap-3 shadow cursor-pointer duration-300 active:scale-95 hover:bg-zinc-700/70 overflow-hidden relative group">
              <img className="w-64 h-64 object-cover absolute top-0 left-0" src={img} alt="Cover" />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                <span className="text-white text-sm font-medium">Нажмите, чтобы обновить обложку</span>
              </div>
            </label>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumtitle || 'Название альбома'}</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
            
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumartist || 'Исполнитель'}</span>
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
            
            <div className="flex flex-col w-full col-span-1 lg:col-span-2 -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumdesc || 'Описание'}</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input type="text" value={desk} onChange={e => setDesk(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
            
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumgenre || 'Жанр'}</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input type="text" placeholder="Например: Pop, Rock, Hip-Hop" value={genre} onChange={e => setGenre(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
          </div>

          <div className="w-full flex items-center gap-3">
            <h5 className="text-xl text-zinc-200 flex-grow">Треки</h5>
          </div>
          
          <div className="flex flex-col gap-2 border border-zinc-600/30 bg-zinc-800/50 rounded-3xl p-3">
            {albumTracks.length > 0 ? (
              albumTracks.map((t, idx) => (
                <div key={t.id} className="flex flex-wrap items-center w-full gap-2 border-b border-zinc-700/40 pb-2 last:border-0 last:pb-0">
                  <div className="text-lg text-zinc-400 w-8 text-center font-bold shrink-0">{idx + 1}</div>
                  <input type="text" value={t.artist} onChange={e => updateTrack(idx, 'artist', e.target.value)} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-200 p-2 placeholder-zinc-600 w-40 text-sm focus:outline-none" />
                  <input type="text" value={t.name} onChange={e => updateTrack(idx, 'name', e.target.value)} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-200 p-2 placeholder-zinc-600 w-40 text-sm focus:outline-none" />
                  
                  <select value={t.lang || '--'} onChange={e => updateTrack(idx, 'lang', e.target.value)} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-300 p-2 w-36 text-sm cursor-pointer focus:outline-none">
                    <option value="--">{lang?.tracklangNo || 'Без слов'}</option>
                    <option value="RU">{lang?.tracklangRu || 'Русский'}</option>
                    <option value="EN">{lang?.tracklangEn || 'Английский'}</option>
                  </select>
                  
                  <select value={t.explicit || '0'} onChange={e => updateTrack(idx, 'explicit', parseInt(e.target.value))} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-300 p-2 w-36 text-sm cursor-pointer focus:outline-none">
                    <option value="0">{lang?.trackexpN || 'Нет (0+)'}</option>
                    <option value="1">{lang?.trackexpY || 'Да (18+)'}</option>
                  </select>
                  
                  <select value={t.status || '1'} onChange={e => updateTrack(idx, 'status', parseInt(e.target.value))} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-300 p-2 w-32 text-sm cursor-pointer focus:outline-none">
                    <option value="1">Публичный</option>
                    <option value="0">Скрытый</option>
                  </select>
                </div>
              ))
            ) : (
              <span className="text-zinc-500 text-center py-4">Нет треков</span>
            )}
          </div>
          
          <button onClick={saveAlbum} disabled={saving} className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full w-full disabled:opacity-50">
            Сохранить изменения
          </button>
        </div>
      )}
    </div>
  );
}
