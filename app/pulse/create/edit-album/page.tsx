'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { uploadImage } from '../../../lib/upload';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { PULSE_GENRES, PULSE_TRACK_LANGUAGES } from '../../pulse-constants';
import { ActionIcon } from '../../pulse-components';

interface PulseArtist {
  id?: number | string;
  name?: string;
}

interface PulseTrack {
  id?: number | string;
  artist?: string;
  name?: string;
  lang?: string;
  explicit?: boolean | number | string;
  status?: number | string;
  genre?: string;
}

function EditAlbumContent() {
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
  const [desk, setDesk] = useState('');
  const [img, setImg] = useState('');
  const [genre, setGenre] = useState<string>('');

  const [allArtists, setAllArtists] = useState<PulseArtist[]>([]);
  const [albumTracks, setAlbumTracks] = useState<PulseTrack[]>([]);
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
        AncialAPI.pulseManagement<Array<Record<string, unknown>>>('album', 'list', {}),
        AncialAPI.pulseManagement<PulseTrack[]>('track', 'list', {}),
        AncialAPI.pulseManagement<PulseArtist[]>('artist', 'list', {}),
      ])
        .then(([albumsRes, tracksRes, artistsRes]) => {
          if (Array.isArray(artistsRes)) setAllArtists(artistsRes);

          if (Array.isArray(albumsRes)) {
            type RawAlbum = {
              id?: number | string;
              name?: string;
              artist?: string;
              desk?: string;
              img?: string;
              artists_ids?: string;
              songs?: string;
              genre?: string;
            };
            const album = albumsRes.map((a) => a as RawAlbum).find((a) => parseInt(String(a.id), 10) === id);
            if (album) {
              setName(album.name || '');
              setArtist(album.artist || '');
              setDesk(album.desk || '');
              setImg(album.img || '');
              setArtistsIds((album.artists_ids || '').split(',').filter(Boolean));

              const songIds = (album.songs || '').split('|').filter(Boolean).map((s: string) => parseInt(s, 10));
              let foundGenre = album.genre || '';
              const myTracks = (Array.isArray(tracksRes) ? tracksRes : []).filter((t) =>
                songIds.includes(parseInt(String(t.id), 10))
              );

              const sortedTracks: PulseTrack[] = [];
              for (const sid of songIds) {
                const tr = myTracks.find((t) => parseInt(String(t.id), 10) === sid);
                if (tr) {
                  if (!foundGenre && tr.genre) foundGenre = tr.genre;
                  sortedTracks.push(tr);
                }
              }

              if (foundGenre) setGenre(foundGenre);
              setAlbumTracks(sortedTracks);
            }
          }
        })
        .finally(() => setLoading(false));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

    uploadImage(file, { type: 'album_cover', targetType: 'album' })
      .then((uploadedUrl) => {
        if (uploadedUrl) {
          cleanupBlobUrl();
          setImg(uploadedUrl);
        }
      })
      .catch(console.error);
  };

  const saveAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = {
      id,
      name: name.trim(),
      artist: artist.trim(),
      artists_ids: artistsIds.length > 0 ? artistsIds.join(',') + ',' : '',
      desk: desk.trim(),
      img,
      genre,
      tracks: JSON.stringify(
        albumTracks.map((t) => ({
          id: t.id,
          artist: t.artist,
          name: t.name,
          lang: t.lang,
          explicit: t.explicit,
          status: t.status,
        }))
      ),
    };

    AncialAPI.pulseManagement('album', 'update', data)
      .then(() => {
        showNote({ content: 'Альбом обновлен!', type: 'success', time: 3 });
        router.push('/pulse/create/albums');
      })
      .catch((err: unknown) => {
        const rawMsg =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'error' in err
              ? String((err as { error?: unknown }).error)
              : null;
        showNote({
          content: getApiMessage(rawMsg, lang, lang?.somethingwrong || 'Произошла ошибка'),
          type: 'error',
          time: 5,
        });
        setSaving(false);
      });
  };

  const updateTrack = (index: number, field: keyof PulseTrack, value: string | number | boolean) => {
    setAlbumTracks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  if (!isAuthenticated) return null;
  if (!id) return <div className="p-6 text-center text-zinc-500">Альбом не найден</div>;

  const selectedArtists = allArtists.filter((a) => artistsIds.includes(String(a.id)));

  return (
    <div className="w-full flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-zinc-100">
        {lang?.edittrack || 'Редактировать альбом'}
      </h1>

      {loading ? (
        <div className="flex w-full items-center justify-center p-6">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      ) : (
        <form onSubmit={saveAlbum} className="flex flex-col gap-3 w-full">
          <div className="flex flex-col lg:flex-row items-start gap-3">
            {/* Cover Upload */}
            <div className="flex flex-col items-center shrink-0 w-full lg:w-56">
              <input type="file" id="albumcover" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <label
                htmlFor="albumcover"
                className="w-56 h-56 bg-zinc-800/70 border border-zinc-600/30 rounded-3xl flex flex-col items-center justify-center gap-3 shadow cursor-pointer duration-300 active:scale-95 hover:bg-zinc-700/70 overflow-hidden relative group"
              >
                {img ? (
                  <>
                    <img className="w-full h-full object-cover" src={img} alt="Cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300 backdrop-blur-xs">
                      <span className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-600/30">
                        {lang?.replacetrackcover || 'Заменить обложку'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-center p-3">
                    <div className="p-3 rounded-full bg-zinc-700/60 text-zinc-300">
                      <ActionIcon className="w-8 h-8 fill-current" name="IC-plus" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-200">{lang?.upload_cover_btn || 'Загрузить обложку'}</span>
                  </div>
                )}
              </label>
            </div>

            {/* Fields Grid */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Title */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.albumtitle || 'Название альбома'} *</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                  />
                </div>
              </div>

              {/* Artist */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.albumartist || 'Исполнитель'} *</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                  />
                </div>
              </div>

              {/* Artists linking */}
              {allArtists.length > 0 && (
                <div className="col-span-1 sm:col-span-2 flex w-full flex-col relative" style={{ zIndex: 40 }}>
                  <span className="z-20 pl-4 text-zinc-400">Привязка к страницам артистов</span>
                  <div className="-mt-3 z-10 flex min-h-[48px] w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                    <div
                      onClick={() => setShowArtistsDropdown(!showArtistsDropdown)}
                      className="w-full flex items-center justify-between pl-2 pr-2 cursor-pointer"
                    >
                      <div className="flex flex-wrap gap-1.5 py-1.5 items-center">
                        {selectedArtists.length === 0 ? (
                          <span className="text-zinc-500 text-sm">{lang?.creators_select_artist || 'Выберите артистов...'}</span>
                        ) : (
                          selectedArtists.map((a) => (
                            <span
                              key={a.id}
                              className="bg-zinc-700 border border-zinc-600/30 text-white text-xs px-3 py-1 rounded-full font-medium"
                            >
                              {a.name}
                            </span>
                          ))
                        )}
                      </div>
                      <ActionIcon
                        className={`w-5 h-5 fill-zinc-400 shrink-0 transition-transform duration-200 ${showArtistsDropdown ? 'rotate-180' : ''
                          }`}
                        name="IC-chevron-down"
                      />
                    </div>
                  </div>

                  {showArtistsDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowArtistsDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-600/30 rounded-3xl shadow-2xl max-h-56 overflow-y-auto z-50 p-2 flex flex-col gap-1">
                        {allArtists.map((a) => (
                          <label
                            key={a.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 rounded-full cursor-pointer text-zinc-200 text-sm duration-200"
                          >
                            <input
                              type="checkbox"
                              checked={artistsIds.includes(String(a.id))}
                              onChange={(e) => {
                                if (e.target.checked) setArtistsIds([...artistsIds, String(a.id)]);
                                else setArtistsIds(artistsIds.filter((aid) => aid !== String(a.id)));
                              }}
                              className="w-4 h-4 rounded bg-zinc-900 border-zinc-500 text-white focus:ring-0 cursor-pointer"
                            />
                            <span>{a.name}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="col-span-1 sm:col-span-2 flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.albumdesc || 'Описание'}</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <input
                    type="text"
                    autoComplete="off"
                    value={desk}
                    onChange={(e) => setDesk(e.target.value)}
                    className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                  />
                </div>
              </div>

              {/* Genre select */}
              <div className="col-span-1 sm:col-span-2 flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.pulse_genre_label || 'Жанр'}</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-transparent pl-2 pr-4 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-400">
                      {lang?.creators_not_specified || 'Не выбрано'}
                    </option>
                    {PULSE_GENRES.map((g) => (
                      <option key={g} value={g} className="bg-zinc-900 text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tracks Section */}
          <div className="w-full flex items-center justify-between gap-3 mt-3">
            <h2 className="text-lg font-bold text-zinc-100">
              {lang?.tracks_title || 'Треки альбома'} ({albumTracks.length})
            </h2>
          </div>

          <div className="flex flex-col gap-3 border border-zinc-600/30 bg-zinc-900/60 rounded-3xl p-3">
            {albumTracks.length > 0 ? (
              albumTracks.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center w-full gap-3 border-b border-zinc-700/40 pb-3 last:border-0 last:pb-0"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600/30 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>

                  <input
                    type="text"
                    value={t.name || ''}
                    onChange={(e) => updateTrack(idx, 'name', e.target.value)}
                    placeholder={lang?.trackName || 'Название трека'}
                    className="h-10 px-3 rounded-full bg-zinc-800/80 border border-zinc-600/30 text-white text-sm focus:outline-none flex-1"
                  />

                  <input
                    type="text"
                    value={t.artist || ''}
                    onChange={(e) => updateTrack(idx, 'artist', e.target.value)}
                    placeholder={lang?.albumartist || 'Исполнитель'}
                    className="h-10 px-3 rounded-full bg-zinc-800/80 border border-zinc-600/30 text-white text-sm focus:outline-none flex-1"
                  />

                  <select
                    value={t.lang || 'ru'}
                    onChange={(e) => updateTrack(idx, 'lang', e.target.value)}
                    className="h-10 px-3 rounded-full bg-zinc-800/80 border border-zinc-600/30 text-white text-xs focus:outline-none cursor-pointer"
                  >
                    {PULSE_TRACK_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-zinc-900 text-white">
                        {l.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={t.explicit === true ? '1' : String(t.explicit ?? '0')}
                    onChange={(e) => updateTrack(idx, 'explicit', parseInt(e.target.value, 10))}
                    className="h-10 px-3 rounded-full bg-zinc-800/80 border border-zinc-600/30 text-white text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="0" className="bg-zinc-900">{lang?.trackexpN || 'Нет (0+)'}</option>
                    <option value="1" className="bg-zinc-900">{lang?.trackexpY || 'Да (18+)'}</option>
                  </select>

                  <select
                    value={String(t.status ?? '1')}
                    onChange={(e) => updateTrack(idx, 'status', parseInt(e.target.value, 10))}
                    className="h-10 px-3 rounded-full bg-zinc-800/80 border border-zinc-600/30 text-white text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="1" className="bg-zinc-900">{lang?.creators_status_public || 'Публичный'}</option>
                    <option value="0" className="bg-zinc-900">{lang?.creators_status_hidden || 'Скрытый'}</option>
                  </select>
                </div>
              ))
            ) : (
              <span className="text-zinc-500 text-center py-4">Нет треков</span>
            )}
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
              <span>Сохранить изменения</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function PulseCreateEditAlbumPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <EditAlbumContent />
    </Suspense>
  );
}
