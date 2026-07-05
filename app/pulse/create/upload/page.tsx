'use client';

import React, { useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useRouter } from 'next/navigation';
import { AncialAPI } from '../../../lib/api-v2';

const MEDIA_TAGS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';

function loadMediaTags(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).jsmediatags) return Promise.resolve((window as any).jsmediatags);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = MEDIA_TAGS_SRC;
    script.onload = () => resolve((window as any).jsmediatags ?? null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

export default function PulseCreateUploadPage() {
  const { lang, isAuthenticated } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Ожидание');
  const [img, setImg] = useState('');
  
  const [albumName, setAlbumName] = useState('');
  const [albumArtist, setAlbumArtist] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumGenre, setAlbumGenre] = useState('');
  const [albumLang, setAlbumLang] = useState('');

  const [tracks, setTracks] = useState([{
    localId: 'track_1',
    id: '',
    artist: '',
    name: '',
    lang: '',
    exp: '',
    audioId: '',
    audioUrl: '',
    uploading: false
  }]);

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

  const addTrack = () => {
    if (tracks.length < 15) {
      setTracks((prevTracks) => [
        ...prevTracks,
        {
          localId: `track_${Date.now()}_${Math.random()}`,
          id: '',
          artist: '',
          name: '',
          lang: '',
          exp: '',
          audioId: '',
          audioUrl: '',
          uploading: false
        }
      ]);
    }
  };

  const updateTrack = (index: number, field: string, value: any) => {
    setTracks((prevTracks) => {
      const newTracks = [...prevTracks];
      if (newTracks[index]) {
        newTracks[index] = { ...newTracks[index], [field]: value };
      }
      return newTracks;
    });
  };

  const handleAudioUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const audioUrl = URL.createObjectURL(file);
    updateTrack(index, 'audioUrl', audioUrl);

    try {
      const mediaTags = await loadMediaTags();
      if (mediaTags) {
        mediaTags.read(file, {
          onSuccess: (tag: any) => {
            const title = tag.tags?.title;
            const artist = tag.tags?.artist;
            setTracks((prevTracks) => {
              const newTracks = [...prevTracks];
              if (newTracks[index]) {
                newTracks[index] = {
                  ...newTracks[index],
                  name: title && !newTracks[index].name ? title : newTracks[index].name,
                  artist: artist && !newTracks[index].artist ? artist : newTracks[index].artist,
                };
              }
              return newTracks;
            });
          },
          onError: () => {}
        });
      }
    } catch (err) {}

    updateTrack(index, 'uploading', true);
    setStatusText('Загрузка аудио...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await AncialAPI.pulseManagement<{ id?: string | number; src?: string; message?: string }>('file', 'upload', formData);
      if (res.src && res.src !== 'Failure') {
        setTracks((prevTracks) => {
          const newTracks = [...prevTracks];
          if (newTracks[index]) {
            newTracks[index] = {
              ...newTracks[index],
              audioId: res.src || '',
              id: res.id ? String(res.id) : newTracks[index].id,
            };
          }
          return newTracks;
        });
        setStatusText('Трек загружен');
      } else {
        showNote({ content: 'Ошибка при загрузке аудио на сервер', type: 'error', time: 5 });
        setStatusText('Ошибка');
      }
    } catch (error) {
      console.error(error);
      showNote({ content: 'Ошибка при загрузке аудио', type: 'error', time: 5 });
      setStatusText('Ошибка');
    } finally {
      updateTrack(index, 'uploading', false);
    }
  };

  const handlePublish = async () => {
    if (!img) {
      showNote({ content: lang?.albumcoverupload || 'Загрузите обложку альбома!', type: 'error', time: 5 });
      return;
    }
    
    let allUploaded = true;
    for (const t of tracks) {
      if (!t.audioId) {
        allUploaded = false;
        break;
      }
    }

    if (!allUploaded) {
      showNote({ content: lang?.albumUploadNT || 'Не все аудиофайлы загружены', type: 'error', time: 5 });
      return;
    }

    const tracksData = tracks.map(t => ({
      id: t.id,
      name: t.name,
      artist: t.artist,
      lang: t.lang,
      explicit: t.exp
    }));

    setLoading(true);
    setStatusText('Создание альбома...');
    
    try {
      await AncialAPI.pulseManagement('album', 'create', {
        name: albumName,
        artist: albumArtist,
        img,
        desk: albumDesc,
        genre: albumGenre,
        lang: albumLang,
        artists_ids: '',
        tracks_data: JSON.stringify(tracksData)
      });
      
      router.push('/pulse/create/albums');
    } catch (err: any) {
      showNote({ content: err?.error || 'Ошибка сохранения', type: 'error', time: 5 });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3 relative">
      <h5 className="text-2xl text-zinc-200 w-full">{lang?.uploadTitle || 'Загрузка'}</h5>
      
      <div className="flex flex-col gap-3">
        <div className="w-full flex flex-col items-center justify-center">
          <input type="file" id="albumcover" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <label htmlFor="albumcover" className="w-64 h-64 bg-zinc-800/70 border border-zinc-600/30 rounded-3xl flex flex-col items-center justify-center gap-3 shadow cursor-pointer duration-300 active:scale-95 hover:bg-zinc-700/70 overflow-hidden relative group">
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
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="flex flex-col w-full -mt-1.5">
            <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumtitle || 'Название альбома'}</span>
            <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input required type="text" value={albumName} onChange={e => setAlbumName(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
            </div>
          </div>
          
          <div className="flex flex-col w-full -mt-1.5">
            <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumartist || 'Исполнитель'}</span>
            <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input required type="text" value={albumArtist} onChange={e => setAlbumArtist(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
            </div>
          </div>
          
          <div className="flex flex-col w-full col-span-1 lg:col-span-2 -mt-1.5">
            <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumdesc || 'Описание'}</span>
            <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input type="text" value={albumDesc} onChange={e => setAlbumDesc(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
            </div>
          </div>
          
          <div className="flex flex-col w-full -mt-1.5">
            <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumgenre || 'Жанр'}</span>
            <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input type="text" placeholder="Например: Pop, Rock, Hip-Hop" value={albumGenre} onChange={e => setAlbumGenre(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
            </div>
          </div>

          <div className="flex flex-col w-full -mt-1.5">
            <span className="text-zinc-400 pl-4 z-20 text-sm">{lang?.albumlang || 'Язык альбома (опц.)'}</span>
            <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <select value={albumLang} onChange={e => setAlbumLang(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600 cursor-pointer">
                <option value="" disabled>{lang?.tracklang || 'Язык'}</option>
                <option value="--">{lang?.tracklangNo || 'Без слов'}</option>
                <option value="RU">{lang?.tracklangRu || 'Русский'}</option>
                <option value="EN">{lang?.tracklangEn || 'Английский'}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="w-full flex items-center gap-3">
          <h5 className="text-xl text-zinc-200 flex-grow">Треки</h5>
          <span className="text-zinc-400 text-sm">{statusText}</span>
        </div>
        
        <div className="flex flex-col gap-2 border border-zinc-600/30 bg-zinc-800/50 rounded-3xl p-3">
          {tracks.map((t, idx) => (
            <div key={t.localId} className="flex flex-wrap items-center w-full gap-2 border-b border-zinc-700/40 pb-2 last:border-0 last:pb-0">
              <div className="text-lg text-zinc-400 w-8 text-center font-bold shrink-0">{idx + 1}</div>
              <input type="text" placeholder={lang?.trackArtists || 'Артист(ы) трека'} value={t.artist} onChange={e => updateTrack(idx, 'artist', e.target.value)} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-200 p-2 placeholder-zinc-600 w-40 text-sm focus:outline-none" />
              <input type="text" placeholder={lang?.trackName || 'Название трека'} value={t.name} onChange={e => updateTrack(idx, 'name', e.target.value)} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-200 p-2 placeholder-zinc-600 w-40 text-sm focus:outline-none" />
              
              <select value={t.lang} onChange={e => updateTrack(idx, 'lang', e.target.value)} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-300 p-2 w-36 text-sm cursor-pointer focus:outline-none">
                <option value="" disabled>{lang?.tracklang || 'Язык трека'}</option>
                <option value="--">{lang?.tracklangNo || 'Без слов'}</option>
                <option value="RU">{lang?.tracklangRu || 'Русский'}</option>
                <option value="EN">{lang?.tracklangEn || 'Английский'}</option>
              </select>
              
              <select value={t.exp} onChange={e => updateTrack(idx, 'exp', e.target.value)} className="bg-zinc-800/60 border border-zinc-600/30 rounded-2xl text-zinc-300 p-2 w-36 text-sm cursor-pointer focus:outline-none">
                <option value="" disabled>{lang?.trackexp || 'Explicit (18+)'}</option>
                <option value="0">{lang?.trackexpN || 'Нет (0+)'}</option>
                <option value="1">{lang?.trackexpY || 'Да (18+)'}</option>
              </select>
              
              <div className="flex-grow flex items-center justify-end gap-2">
                {t.uploading && <span className="text-xs text-purple-400 animate-pulse">Загрузка...</span>}
                {t.audioId && <span className="text-xs text-green-400">✓ Загружено</span>}
                <label htmlFor={`songupdI${t.localId}`} className="cursor-pointer text-zinc-400 hover:text-zinc-200 duration-300 p-1.5 rounded-xl border border-zinc-600/30 bg-zinc-800/60 hover:bg-zinc-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </label>
                <input type="file" id={`songupdI${t.localId}`} accept=".mp3" onChange={(e) => handleAudioUpload(idx, e)} className="hidden" />
              </div>
              
              {t.audioUrl && (
                <div className="w-full mt-2">
                  <audio controls src={t.audioUrl} className="w-full h-10" />
                </div>
              )}
            </div>
          ))}
        </div>

        {tracks.length < 15 && (
          <div className="flex items-center gap-3">
            <button onClick={addTrack} className="flex items-center gap-2 px-4 py-2 text-sm rounded-3xl border border-zinc-600/30 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 hover:text-white duration-300 active:scale-95 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {lang?.trackadd || 'Добавить ещё трек'}
            </button>
          </div>
        )}
        
        <div
          className="border border-zinc-600/30 p-3 bg-amber-500/25 text-amber-500 shadow rounded-3xl flex flex-col w-full text-sm gap-1.5"
          dangerouslySetInnerHTML={{
            __html: lang?.albumuploadWarn2 || 'Убедитесь, что все треки соответствуют правилам загрузки контента.'
          }}
        />
        
        <button onClick={handlePublish} disabled={loading} className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full w-full disabled:opacity-50">
          Опубликовать альбом / треки
        </button>
      </div>
    </div>
  );
}
