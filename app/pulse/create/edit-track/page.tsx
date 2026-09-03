'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { uploadImage } from '../../../lib/upload';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { PULSE_GENRES, PULSE_MOODS, PULSE_TRACK_LANGUAGES } from '../../pulse-constants';
import { ActionIcon } from '../../pulse-components';

function EditTrackContent() {
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
  const [genre, setGenre] = useState<string>('');
  const [mood, setMood] = useState<string>('');
  const [trackLang, setTrackLang] = useState('ru');
  const [explicit, setExplicit] = useState('0');
  const [status, setStatus] = useState('1');
  const [src, setSrc] = useState('');

  interface PulseArtist {
    id?: number | string;
    name?: string;
    img?: string;
  }

  interface PulseTrack {
    id?: number | string;
    name?: string;
    artist?: string;
    img?: string;
    genre?: string;
    mood?: string;
    lang?: string;
    explicit?: boolean | number | string;
    status?: number | string;
    artists_ids?: string;
    src?: string;
  }

  const [allArtists, setAllArtists] = useState<PulseArtist[]>([]);
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
        AncialAPI.pulseManagement<PulseTrack[]>('track', 'list', {}),
        AncialAPI.pulseManagement<PulseArtist[]>('artist', 'list', {}),
      ])
        .then(([tracksRes, artistsRes]) => {
          if (Array.isArray(artistsRes)) setAllArtists(artistsRes);

          if (Array.isArray(tracksRes)) {
            const track = tracksRes.find((t) => parseInt(String(t.id), 10) === id);
            if (track) {
              setName(track.name || '');
              setArtist(track.artist || '');
              setImg(track.img || '');
              setGenre(track.genre || '');
              setMood(track.mood || '');
              setTrackLang(track.lang || 'ru');
              setExplicit(track.explicit ? String(track.explicit) : '0');
              setStatus(track.status !== undefined ? String(track.status) : '1');
              setArtistsIds((track.artists_ids || '').split(',').filter(Boolean));
              setSrc(track.src || '');
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

    uploadImage(file, { type: 'track_cover', targetType: 'track' })
      .then((uploadedUrl) => {
        if (uploadedUrl) {
          cleanupBlobUrl();
          setImg(uploadedUrl);
        }
      })
      .catch(console.error);
  };

  const saveTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = {
      id,
      name: name.trim(),
      artist: artist.trim(),
      artists_ids: artistsIds.length > 0 ? artistsIds.join(',') + ',' : '',
      img,
      genre,
      mood,
      lang: trackLang,
      explicit,
      status,
    };

    AncialAPI.pulseManagement('track', 'update', data)
      .then(() => {
        showNote({ content: 'Изменения сохранены!', type: 'success', time: 3 });
        router.push('/pulse/create/tracks');
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
  if (!id) return <div className="p-6 text-center text-zinc-500">Трек не найден</div>;

  const selectedArtists = allArtists.filter((a) => artistsIds.includes(String(a.id)));

  return (
    <div className="w-full flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-zinc-100">
        {lang?.edittrack || 'Редактировать трек'}
      </h1>

      {loading ? (
        <div className="flex w-full items-center justify-center p-6">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      ) : (
        <form onSubmit={saveTrack} className="flex flex-col gap-3 w-full">
          <div className="flex flex-col lg:flex-row items-start gap-3">
            {/* Cover Upload */}
            <div className="flex flex-col items-center shrink-0 w-full lg:w-56">
              <input type="file" id="trackcover" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <label
                htmlFor="trackcover"
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
                    <span className="text-sm font-semibold text-zinc-200">{lang?.trackcover || 'Обложка трека'}</span>
                  </div>
                )}
              </label>

              {src && (
                <div className="w-full mt-3">
                  <audio controls src={src} className="w-full h-10 rounded-full" />
                </div>
              )}
            </div>

            {/* Inputs Grid */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.trackName || 'Название трека'} *</span>
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

              {/* Linking to Artists Profiles */}
              {allArtists.length > 0 && (
                <div className="col-span-1 sm:col-span-2 flex w-full flex-col relative" style={{ zIndex: 40 }}>
                  <span className="z-20 pl-4 text-zinc-400">Привязка к профилям артистов</span>
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

              {/* Genre (Canonical select) */}
              <div className="flex w-full flex-col">
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

              {/* Mood (Canonical 12 moods select) */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.pulse_mood_label || 'Настроение'}</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full bg-transparent pl-2 pr-4 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-400">
                      {lang?.creators_not_specified || 'Не выбрано'}
                    </option>
                    {PULSE_MOODS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                        {lang?.[m.labelKey] || m.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.tracklang || 'Язык трека'}</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <select
                    value={trackLang}
                    onChange={(e) => setTrackLang(e.target.value)}
                    className="w-full bg-transparent pl-2 pr-4 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                  >
                    {PULSE_TRACK_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-zinc-900 text-white">
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Explicit & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex w-full flex-col">
                  <span className="z-20 pl-4 text-zinc-400">{lang?.trackexp || '18+'}</span>
                  <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                    <select
                      value={explicit}
                      onChange={(e) => setExplicit(e.target.value)}
                      className="w-full bg-transparent pl-2 pr-4 text-zinc-100 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                    >
                      <option value="0" className="bg-zinc-900">{lang?.trackexpN || 'Нет (0+)'}</option>
                      <option value="1" className="bg-zinc-900">{lang?.trackexpY || 'Да (18+)'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex w-full flex-col">
                  <span className="z-20 pl-4 text-zinc-400">Статус</span>
                  <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-transparent pl-2 pr-4 text-zinc-100 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                    >
                      <option value="1" className="bg-zinc-900">{lang?.creators_status_public || 'Публичный'}</option>
                      <option value="0" className="bg-zinc-900">{lang?.creators_status_hidden || 'Скрытый'}</option>
                    </select>
                  </div>
                </div>
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
              <span>Сохранить изменения</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function PulseCreateEditTrackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <EditTrackContent />
    </Suspense>
  );
}
