'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { uploadImage } from '../../../lib/upload';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PULSE_GENRES, PULSE_MOODS, PULSE_TRACK_LANGUAGES } from '../../pulse-constants';
import { PulseArtistLinkPicker } from '../pulse-artist-link-picker';
import AppImage from '../../../components/app-image';
import Icon from '../../../components/svg-icon';

function EditTrackContent() {
  const { lang, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const id = idParam ? parseInt(idParam, 10) : 0;
  const { showNote } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    uploaded_by?: number | string;
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
              // Заглушка загрузки раньше писала в artists_ids ID пользователя — это не профиль артиста,
              // иначе у трека появляется кнопка на несуществующую страницу. Свой профиль с тем же ID не трогаем.
              const ownArtistIds = new Set((Array.isArray(artistsRes) ? artistsRes : []).map((a) => String(a.id)));
              const uploaderId = String(track.uploaded_by ?? '');
              setArtistsIds(
                (track.artists_ids || '')
                  .split(',')
                  .filter((aid) => aid && (aid !== uploaderId || ownArtistIds.has(aid))),
              );
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
        showNote({ content: lang?.changessaved || 'Изменения сохранены!', type: 'success', time: 3 });
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
  if (!id) return <div className="p-6 text-center text-zinc-500">{lang?.creators_track_not_found || 'Трек не найден'}</div>;

  return (
    <div className="w-full flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-zinc-100">
        {lang?.edittrack || 'Редактировать трек'}
      </h1>

      {loading ? (
        <div className="flex w-full items-center justify-center p-6">
          <Icon name="IC-loader" className="inline h-8 w-8 animate-spin fill-zinc-500" />
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
                    <AppImage width={224} height={224} className="w-full h-full object-cover" src={img} alt="Cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300 backdrop-blur-xs">
                      <span className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-600/30">
                        {lang?.replacetrackcover || 'Заменить обложку'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-center p-3">
                    <div className="p-3 rounded-full bg-zinc-700/60 text-zinc-300">
                      <Icon name="IC-plus" className="inline w-8 h-8 fill-current" />
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

              <Link
                href={`/pulse/create/lyrics?id=${id}`}
                className="w-full mt-3 px-4 py-2 rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-200 text-sm font-medium hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                <Icon name="IC-quote" className="inline w-4 h-4 fill-current" />
                {lang?.creators_lyrics || 'Текст песни'}
              </Link>
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

              <PulseArtistLinkPicker
                artists={allArtists}
                label={lang?.creators_link_artists || 'Привязка к профилям артистов'}
                placeholder={lang?.creators_select_artist || 'Выберите артистов...'}
                selectedIds={artistsIds}
                onChange={setArtistsIds}
              />

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
                  <span className="z-20 pl-4 text-zinc-400">{lang?.creators_status_label || 'Статус'}</span>
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
                <Icon name="IC-loader" className="inline h-5 w-5 animate-spin fill-black" />
                <span>{lang?.creators_saving || 'Сохранение...'}</span>
              </>
            ) : (
              <span>{lang?.creators_save_changes || 'Сохранить изменения'}</span>
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
