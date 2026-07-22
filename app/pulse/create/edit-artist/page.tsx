'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AncialAPI } from '../../../lib/api-v2';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PulseCreateEditArtistPage() {
  const { lang, isAuthenticated } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const id = idParam ? parseInt(idParam, 10) : 0;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [socLinks, setSocLinks] = useState('');
  const [desk, setDesk] = useState('');
  const [img, setImg] = useState('');
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
    if (isAuthenticated) {
      if (id > 0) {
        AncialAPI.pulseManagement<any[]>('artist', 'list', {})
          .then((res) => {
            if (Array.isArray(res)) {
              const artist = res.find((a: any) => parseInt(a.id, 10) === id);
              if (artist) {
                setName(artist.name || '');
                setSocLinks(artist.soc_links || '');
                setDesk(artist.desk || '');
                setImg(artist.img || '');
              }
            }
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
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

  const saveArtist = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const action = id > 0 ? 'update' : 'create';
    const data = {
      id: id > 0 ? id : undefined,
      name,
      soc_links: socLinks,
      desk,
      img
    };

    AncialAPI.pulseManagement('artist', action, data)
      .then(() => {
        router.push('/pulse/create/artists');
      })
      .catch((err: any) => {
        showNote({ content: err.error || lang?.errorhappend || 'Произошла ошибка', type: 'error', time: 5 });
        setSaving(false);
      });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      <h5 className="text-2xl text-zinc-200 w-full">{id > 0 ? 'Редактировать артиста' : 'Новый артист'}</h5>
      
      {loading ? (
        <div className="p-5 text-center text-zinc-500">Загрузка...</div>
      ) : (
        <form onSubmit={saveArtist} className="flex flex-col gap-4 w-full">
          <div className="w-full flex flex-col items-center justify-center">
            <input type="file" id="artistcover" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <label htmlFor="artistcover" className="w-64 h-64 bg-zinc-800/70 border border-zinc-600/30 rounded-3xl flex flex-col items-center justify-center gap-3 shadow cursor-pointer duration-300 active:scale-95 hover:bg-zinc-700/70 overflow-hidden relative group">
              <img id="image-preview" className={`w-64 h-64 object-cover absolute top-0 left-0 ${img ? '' : 'hidden'}`} src={img} alt="Preview" />
              
              <div id="upload-placeholder" className={`${img ? 'hidden' : 'flex flex-col items-center justify-center'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-zinc-500 text-sm">Загрузить фото</span>
              </div>

              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                <span className="text-white text-sm font-medium">Нажмите, чтобы обновить фото</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">Имя артиста</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
            
            <div className="flex flex-col w-full -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">Соц. сети (через запятую)</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input type="text" placeholder="vk.com/..., t.me/..." value={socLinks} onChange={e => setSocLinks(e.target.value)} className="bg-transparent w-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
            
            <div className="flex flex-col w-full col-span-1 lg:col-span-2 -mt-1.5">
              <span className="text-zinc-400 pl-4 z-20 text-sm">Описание / Биография</span>
              <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-32 pt-4 -mt-3 z-10 border border-zinc-600/30">
                <textarea value={desk} onChange={e => setDesk(e.target.value)} className="bg-transparent w-full h-full focus:ring-0 focus:outline-none pl-2 text-zinc-200 placeholder-zinc-600 resize-none"></textarea>
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={saving} className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full w-full disabled:opacity-50">
            Сохранить
          </button>
        </form>
      )}
    </div>
  );
}
