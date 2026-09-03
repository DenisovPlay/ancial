'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { uploadImage } from '../../../lib/upload';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionIcon } from '../../pulse-components';

function EditArtistContent() {
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
      interface PulseArtistRow {
        id?: number | string;
        name?: string;
        img?: string;
        desk?: string;
        soc_links?: string;
      }

      if (id > 0) {
        AncialAPI.pulseManagement<PulseArtistRow[]>('artist', 'list', {})
          .then((res) => {
            if (Array.isArray(res)) {
              const artist = res.find((a) => parseInt(String(a.id), 10) === id);
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

    uploadImage(file, { type: 'avatar', targetType: 'artist' })
      .then((uploadedUrl) => {
        if (uploadedUrl) {
          cleanupBlobUrl();
          setImg(uploadedUrl);
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
      name: name.trim(),
      soc_links: socLinks.trim(),
      desk: desk.trim(),
      img,
    };

    AncialAPI.pulseManagement('artist', action, data)
      .then(() => {
        showNote({
          content: id > 0 ? 'Профиль артиста обновлен!' : 'Профиль артиста создан!',
          type: 'success',
          time: 3,
        });
        router.push('/pulse/create/artists');
      })
      .catch((err) => {
        showNote({
          content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.errorhappend || 'Произошла ошибка'),
          type: 'error',
          time: 5,
        });
        setSaving(false);
      });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-zinc-100">
        {id > 0 ? 'Редактировать артиста' : lang?.creators_new_artist || 'Новый артист'}
      </h1>

      {loading ? (
        <div className="flex w-full items-center justify-center p-6">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      ) : (
        <form onSubmit={saveArtist} className="flex flex-col gap-3 w-full">
          <div className="flex flex-col items-center justify-center py-3">
            <input type="file" id="artistcover" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <label
              htmlFor="artistcover"
              className="w-44 h-44 rounded-full bg-zinc-800/70 border border-zinc-600/30 flex flex-col items-center justify-center gap-2 shadow cursor-pointer duration-300 active:scale-95 hover:bg-zinc-700/70 overflow-hidden relative group"
            >
              {img ? (
                <>
                  <img className="w-full h-full object-cover" src={img} alt="Preview" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300 backdrop-blur-xs">
                    <span className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-600/30">
                      Заменить фото
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-center p-3">
                  <div className="p-3 rounded-full bg-zinc-700/60 text-zinc-300">
                    <ActionIcon className="w-8 h-8 fill-current" name="IC-user" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-300">Фото артиста</span>
                </div>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex w-full flex-col">
              <span className="z-20 pl-4 text-zinc-400">Имя артиста *</span>
              <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                <input
                  required
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Псевдоним или сценическое имя"
                  className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                />
              </div>
            </div>

            <div className="flex w-full flex-col">
              <span className="z-20 pl-4 text-zinc-400">Соц. сети (через запятую)</span>
              <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="vk.com/..., t.me/..."
                  value={socLinks}
                  onChange={(e) => setSocLinks(e.target.value)}
                  className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                />
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 flex w-full flex-col">
              <span className="z-20 pl-4 text-zinc-400">Описание / Биография</span>
              <div className="-mt-3 z-10 flex min-h-[100px] w-full rounded-3xl border border-zinc-600/30 bg-zinc-800/90 p-3 pt-4">
                <textarea
                  rows={4}
                  value={desk}
                  onChange={(e) => setDesk(e.target.value)}
                  placeholder="Расскажите слушателям о себе, стиле музыки и творческом пути..."
                  className="w-full bg-transparent text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-full bg-white text-black font-semibold text-base hover:bg-zinc-200 active:scale-95 duration-300 shadow cursor-pointer disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <ActionIcon className="h-5 w-5 animate-spin fill-black" name="IC-loader" />
                <span>Сохранение...</span>
              </>
            ) : (
              <span>{id > 0 ? 'Сохранить изменения' : 'Создать артиста'}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function PulseCreateEditArtistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <EditArtistContent />
    </Suspense>
  );
}
