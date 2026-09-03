'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { uploadImage } from '../../../lib/upload';
import { PULSE_GENRES, PULSE_MOODS, PULSE_TRACK_LANGUAGES } from '../../pulse-constants';
import { ActionIcon } from '../../pulse-components';

const MEDIA_TAGS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';

type JsMediaTags = NonNullable<Window['jsmediatags']>;

function loadMediaTags(): Promise<JsMediaTags | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.jsmediatags) return Promise.resolve(window.jsmediatags);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = MEDIA_TAGS_SRC;
    script.onload = () => resolve(window.jsmediatags ?? null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

interface UserArtist {
  id: number;
  name: string;
  img?: string;
  verify?: number;
}

interface AlbumTrackItem {
  localId: string;
  id: string;
  artist: string;
  name: string;
  lang: string;
  exp: string;
  mood: string;
  audioId: string;
  audioUrl: string;
  uploading: boolean;
}

function UploadContent() {
  const { lang, isAuthenticated } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'single' | 'album'
  const initialMode = searchParams.get('mode') === 'album' ? 'album' : 'single';
  const [mode, setMode] = useState<'single' | 'album'>(initialMode);

  // User artist profiles for smart auto-linking
  const [userArtists, setUserArtists] = useState<UserArtist[]>([]);

  // Common Loading & Status
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  // ----------------------------------------------------
  // SINGLE TRACK STATE
  // ----------------------------------------------------
  const [singleCover, setSingleCover] = useState('');
  const [singleTitle, setSingleTitle] = useState('');
  const [singleArtistMode, setSingleArtistMode] = useState<string>('');
  const [singleArtistName, setSingleArtistName] = useState('');
  const [singleArtistId, setSingleArtistId] = useState('');
  const [singleGenre, setSingleGenre] = useState<string>('');
  const [singleMood, setSingleMood] = useState<string>('');
  const [singleLang, setSingleLang] = useState('');
  const [singleExplicit, setSingleExplicit] = useState('');
  const [singleStatus, setSingleStatus] = useState('');

  const [singleAudioFile, setSingleAudioFile] = useState<File | null>(null);
  const [singleAudioUrl, setSingleAudioUrl] = useState('');
  const [singleUploadedId, setSingleUploadedId] = useState<number | null>(null);
  const [singleUploadingAudio, setSingleUploadingAudio] = useState(false);

  // ----------------------------------------------------
  // ALBUM / EP STATE
  // ----------------------------------------------------
  const [albumCover, setAlbumCover] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumArtistMode, setAlbumArtistMode] = useState<string>('');
  const [albumArtistName, setAlbumArtistName] = useState('');
  const [albumArtistId, setAlbumArtistId] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumGenre, setAlbumGenre] = useState<string>('');
  const [albumLang, setAlbumLang] = useState('');

  const [albumTracks, setAlbumTracks] = useState<AlbumTrackItem[]>([
    {
      localId: 'track_1',
      id: '',
      artist: '',
      name: '',
      lang: '',
      exp: '',
      mood: '',
      audioId: '',
      audioUrl: '',
      uploading: false,
    },
  ]);

  // Load user artists
  useEffect(() => {
    if (isAuthenticated) {
      AncialAPI.pulseManagement<UserArtist[]>('artist', 'list', {})
        .then((res) => {
          if (Array.isArray(res)) {
            setUserArtists(res);
          }
        })
        .catch(console.error);
    }
  }, [isAuthenticated]);

  // Handle Cover Upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'single' | 'album') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const previewUrl = URL.createObjectURL(file);

    if (target === 'single') {
      setSingleCover(previewUrl);
    } else {
      setAlbumCover(previewUrl);
    }

    uploadImage(file, { type: 'track_cover', targetType: 'track' })
      .then((uploadedUrl) => {
        if (uploadedUrl) {
          if (target === 'single') setSingleCover(uploadedUrl);
          else setAlbumCover(uploadedUrl);
        }
      })
      .catch((err) => {
        console.error(err);
        showNote({
          content: lang?.errorhappend || 'Ошибка загрузки обложки',
          type: 'error',
          time: 5,
        });
      });
  };

  // ----------------------------------------------------
  // Single: Audio file upload & ID3 tag extraction
  // ----------------------------------------------------
  const handleSingleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setSingleAudioFile(file);
    const audioUrl = URL.createObjectURL(file);
    setSingleAudioUrl(audioUrl);

    // Extract ID3 metadata
    try {
      const mediaTags = await loadMediaTags();
      if (mediaTags) {
        mediaTags.read(file, {
          onSuccess: (tag) => {
            const title = tag.tags?.title;
            const artist = tag.tags?.artist;
            if (title && !singleTitle) setSingleTitle(title);
            if (artist && !singleArtistName && singleArtistMode === 'custom') {
              setSingleArtistName(artist);
            }
          },
          onError: () => {},
        });
      }
    } catch {
      // Best-effort tag reading
    }

    // Upload audio immediately to get track ID
    setSingleUploadingAudio(true);
    setStatusText(lang?.uploadingtrack || 'Загрузка аудио...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await AncialAPI.pulseManagement<{ id?: string | number; src?: string }>('file', 'upload', formData);
      if (res && res.id) {
        setSingleUploadedId(Number(res.id));
        setStatusText(lang?.albumUploadStatus3 || 'Аудио загружено');
        showNote({ content: 'Аудиофайл успешно загружен', type: 'success', time: 3 });
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.errorhappend || 'Ошибка при загрузке аудио'),
        type: 'error',
        time: 5,
      });
      setStatusText('Ошибка');
    } finally {
      setSingleUploadingAudio(false);
    }
  };

  // Publish Single
  const handlePublishSingle = async () => {
    if (!singleUploadedId) {
      showNote({ content: 'Пожалуйста, выберите и дождитесь загрузки аудиофайла!', type: 'error', time: 5 });
      return;
    }
    if (!singleTitle.trim()) {
      showNote({ content: 'Введите название трека!', type: 'error', time: 5 });
      return;
    }
    if (!singleArtistName.trim()) {
      showNote({ content: 'Укажите исполнителя!', type: 'error', time: 5 });
      return;
    }

    setLoading(true);
    setStatusText('Публикация сингла...');

    try {
      await AncialAPI.pulseManagement('track', 'create', {
        id: singleUploadedId,
        name: singleTitle.trim(),
        artist: singleArtistName.trim(),
        artists_ids: singleArtistId,
        img: singleCover,
        genre: singleGenre,
        mood: singleMood,
        lang: singleLang,
        explicit: singleExplicit,
        status: singleStatus,
      });

      showNote({ content: 'Сингл успешно опубликован!', type: 'success', time: 4 });
      router.push('/pulse/create/tracks');
    } catch (err) {
      console.error(err);
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.errorhappend || 'Ошибка сохранения сингла'),
        type: 'error',
        time: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // Album: Track list handling & publishing
  // ----------------------------------------------------
  const addAlbumTrack = () => {
    if (albumTracks.length < 20) {
      setAlbumTracks((prev) => [
        ...prev,
        {
          localId: `track_${Date.now()}_${Math.random()}`,
          id: '',
          artist: albumArtistName || '',
          name: '',
          lang: albumLang || '',
          exp: '',
          mood: '',
          audioId: '',
          audioUrl: '',
          uploading: false,
        },
      ]);
    }
  };

  const removeAlbumTrack = (index: number) => {
    if (albumTracks.length > 1) {
      setAlbumTracks((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateAlbumTrack = (index: number, field: keyof AlbumTrackItem, value: string | boolean) => {
    setAlbumTracks((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const handleAlbumAudioUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const audioUrl = URL.createObjectURL(file);
    updateAlbumTrack(index, 'audioUrl', audioUrl);

    try {
      const mediaTags = await loadMediaTags();
      if (mediaTags) {
        mediaTags.read(file, {
          onSuccess: (tag) => {
            const title = tag.tags?.title;
            const artist = tag.tags?.artist;
            setAlbumTracks((prev) => {
              const copy = [...prev];
              if (copy[index]) {
                copy[index] = {
                  ...copy[index],
                  name: title && !copy[index].name ? title : copy[index].name,
                  artist: artist && !copy[index].artist ? artist : copy[index].artist || albumArtistName,
                };
              }
              return copy;
            });
          },
          onError: () => {},
        });
      }
    } catch {
      // Best-effort
    }

    updateAlbumTrack(index, 'uploading', true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await AncialAPI.pulseManagement<{ id?: string | number; src?: string }>('file', 'upload', formData);
      if (res && res.id) {
        setAlbumTracks((prev) => {
          const copy = [...prev];
          if (copy[index]) {
            copy[index] = {
              ...copy[index],
              id: String(res.id),
              audioId: res.src || '',
            };
          }
          return copy;
        });
      } else {
        showNote({ content: lang?.errorhappend || 'Ошибка при загрузке аудио', type: 'error', time: 5 });
      }
    } catch (err) {
      console.error(err);
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.somethingwrong || 'Ошибка загрузки'),
        type: 'error',
        time: 5,
      });
    } finally {
      updateAlbumTrack(index, 'uploading', false);
    }
  };

  const handlePublishAlbum = async () => {
    if (!albumCover) {
      showNote({ content: lang?.albumcoverupload || 'Загрузите обложку альбома!', type: 'error', time: 5 });
      return;
    }
    if (!albumTitle.trim()) {
      showNote({ content: 'Введите название альбома!', type: 'error', time: 5 });
      return;
    }
    if (!albumArtistName.trim()) {
      showNote({ content: 'Укажите исполнителя альбома!', type: 'error', time: 5 });
      return;
    }

    const missingAudio = albumTracks.some((t) => !t.audioId);
    if (missingAudio) {
      showNote({ content: lang?.albumUploadNT || 'Не все аудиофайлы треков загружены', type: 'error', time: 5 });
      return;
    }

    const tracksData = albumTracks.map((t) => ({
      id: t.id,
      name: t.name.trim() || 'Без названия',
      artist: t.artist.trim() || albumArtistName.trim(),
      lang: t.lang,
      explicit: t.exp,
      mood: t.mood,
    }));

    setLoading(true);
    setStatusText('Публикация альбома...');

    try {
      await AncialAPI.pulseManagement('album', 'create', {
        name: albumTitle.trim(),
        artist: albumArtistName.trim(),
        img: albumCover,
        desk: albumDesc.trim(),
        genre: albumGenre,
        lang: albumLang,
        artists_ids: albumArtistId,
        tracks_data: JSON.stringify(tracksData),
      });

      showNote({ content: lang?.albumUploadS || 'Альбом успешно опубликован!', type: 'success', time: 4 });
      router.push('/pulse/create/albums');
    } catch (err) {
      console.error(err);
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.errorhappend || 'Ошибка сохранения альбома'),
        type: 'error',
        time: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1. Header & Mode Switcher */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-100">
          {lang?.creators_upload_release || 'Новый релиз'}
        </h1>

        <div className="flex items-center gap-2 p-1 rounded-full bg-zinc-800/80 border border-zinc-600/30 shrink-0">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-full text-sm font-semibold duration-300 active:scale-95 cursor-pointer ${
              mode === 'single'
                ? 'bg-white text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {lang?.creators_single_mode || 'Сингл (1 трек)'}
          </button>
          <button
            type="button"
            onClick={() => setMode('album')}
            className={`px-4 py-2 rounded-full text-sm font-semibold duration-300 active:scale-95 cursor-pointer ${
              mode === 'album'
                ? 'bg-white text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {lang?.creators_album_mode || 'Альбом / EP'}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MODE: SINGLE TRACK                                   */}
      {/* ======================================================== */}
      {mode === 'single' && (
        <div className="w-full flex flex-col gap-3 border border-zinc-600/30 bg-zinc-800/40 p-3 rounded-3xl">
          <div className="flex flex-col lg:flex-row items-start gap-3">
            {/* Cover Upload Dropzone */}
            <div className="flex flex-col items-center shrink-0 w-full lg:w-56">
              <input
                type="file"
                id="single-cover-file"
                accept="image/*"
                onChange={(e) => handleCoverUpload(e, 'single')}
                className="hidden"
              />
              <label
                htmlFor="single-cover-file"
                className="w-56 h-56 rounded-3xl border border-zinc-600/30 bg-zinc-800/70 hover:bg-zinc-700/70 relative flex flex-col items-center justify-center cursor-pointer overflow-hidden group duration-300 active:scale-95 shadow"
              >
                {singleCover ? (
                  <>
                    <img src={singleCover} alt="Cover" className="w-full h-full object-cover" />
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
                    <span className="text-sm font-semibold text-zinc-200">
                      {lang?.creators_cover_drop_title || 'Загрузить обложку'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {lang?.creators_cover_drop_subtitle || 'Квадрат 1:1, JPG / PNG'}
                    </span>
                  </div>
                )}
              </label>
            </div>

            {/* Fields Grid */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Track Audio Dropzone */}
              <div className="col-span-1 sm:col-span-2">
                <input
                  type="file"
                  id="single-audio-file"
                  accept=".mp3"
                  onChange={handleSingleAudioSelect}
                  className="hidden"
                />
                <label
                  htmlFor="single-audio-file"
                  className="w-full p-3 rounded-3xl border border-dashed border-zinc-600/40 bg-zinc-800/60 hover:bg-zinc-700/60 flex items-center justify-between gap-3 cursor-pointer duration-300 active:scale-95"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                      <ActionIcon className="w-6 h-6 fill-current" name="IC-music" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-white truncate">
                        {singleAudioFile ? singleAudioFile.name : lang?.creators_audio_drop_title || 'Выберите или перетащите аудиофайл (.mp3)'}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {singleUploadingAudio
                          ? 'Идёт загрузка аудио...'
                          : singleUploadedId
                            ? '✓ Аудиофайл успешно загружен'
                            : lang?.creators_audio_drop_subtitle || 'До 25 MB, битрейт до 320 kbps'}
                      </span>
                    </div>
                  </div>

                  <span className="px-4 py-2 rounded-full bg-zinc-700 text-white text-xs font-semibold shrink-0 hover:bg-zinc-600 duration-300 border border-zinc-600/30">
                    {singleUploadedId ? 'Заменить' : 'Выбрать файл'}
                  </span>
                </label>

                {singleAudioUrl && (
                  <div className="mt-2 w-full">
                    <audio controls src={singleAudioUrl} className="w-full h-10 rounded-full" />
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.trackName || 'Название трека'} *</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={singleTitle}
                    onChange={(e) => setSingleTitle(e.target.value)}
                    placeholder="Например: Ночной город"
                    className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                  />
                </div>
              </div>

              {/* Artist Selector */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.albumartist || 'Исполнитель'} *</span>
                {userArtists.length > 0 ? (
                  <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1 gap-1">
                    <select
                      value={singleArtistMode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSingleArtistMode(val);
                        if (val === 'custom') {
                          setSingleArtistId('');
                          setSingleArtistName('');
                        } else if (!val) {
                          setSingleArtistId('');
                          setSingleArtistName('');
                        } else {
                          const art = userArtists.find((a) => String(a.id) === val);
                          if (art) {
                            setSingleArtistName(art.name);
                            setSingleArtistId(String(art.id));
                          }
                        }
                      }}
                      className="w-full bg-transparent pl-2 pr-4 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer flex-1"
                    >
                      <option value="" className="bg-zinc-900 text-zinc-400">
                        {lang?.creators_not_specified || 'Не выбрано'}
                      </option>
                      {userArtists.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.name} {a.verify ? '✓' : ''}
                        </option>
                      ))}
                      <option value="custom">{lang?.creators_custom_artist || 'Другой исполнитель'}</option>
                    </select>

                    {singleArtistMode === 'custom' && (
                      <input
                        type="text"
                        autoComplete="off"
                        value={singleArtistName}
                        onChange={(e) => setSingleArtistName(e.target.value)}
                        placeholder="Имя артиста"
                        className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 flex-1 border-l border-zinc-600/30"
                      />
                    )}
                  </div>
                ) : (
                  <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={singleArtistName}
                      onChange={(e) => setSingleArtistName(e.target.value)}
                      placeholder="Имя артиста"
                      className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                    />
                  </div>
                )}
              </div>

              {/* Genre (Canonical select) */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.pulse_genre_label || 'Жанр'}</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <select
                    value={singleGenre}
                    onChange={(e) => setSingleGenre(e.target.value)}
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
                    value={singleMood}
                    onChange={(e) => setSingleMood(e.target.value)}
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
                    value={singleLang}
                    onChange={(e) => setSingleLang(e.target.value)}
                    className="w-full bg-transparent pl-2 pr-4 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-400">
                      {lang?.creators_not_specified || 'Не выбрано'}
                    </option>
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
                      value={singleExplicit}
                      onChange={(e) => setSingleExplicit(e.target.value)}
                      className="w-full bg-transparent pl-2 pr-4 text-zinc-100 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900 text-zinc-400">
                        {lang?.creators_not_specified || 'Не выбрано'}
                      </option>
                      <option value="0" className="bg-zinc-900">{lang?.trackexpN || 'Нет (0+)'}</option>
                      <option value="1" className="bg-zinc-900">{lang?.trackexpY || 'Да (18+)'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex w-full flex-col">
                  <span className="z-20 pl-4 text-zinc-400">Статус</span>
                  <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                    <select
                      value={singleStatus}
                      onChange={(e) => setSingleStatus(e.target.value)}
                      className="w-full bg-transparent pl-2 pr-4 text-zinc-100 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900 text-zinc-400">
                        {lang?.creators_not_specified || 'Не выбрано'}
                      </option>
                      <option value="1" className="bg-zinc-900">{lang?.creators_status_public || 'Публичный'}</option>
                      <option value="0" className="bg-zinc-900">{lang?.creators_status_hidden || 'Скрытый'}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guidelines Warning */}
          <div
            className="border border-zinc-600/30 p-3 bg-zinc-900/60 rounded-3xl text-xs text-zinc-400 flex flex-col gap-1"
            dangerouslySetInnerHTML={{
              __html: lang?.albumuploadWarn2 || 'Убедитесь, что аудиоматериал соответствует авторским правам.',
            }}
          />

          {/* Submit Single Button */}
          <button
            type="button"
            onClick={handlePublishSingle}
            disabled={loading || singleUploadingAudio}
            className="w-full px-4 py-2.5 rounded-full bg-white text-black font-semibold text-base hover:bg-zinc-200 active:scale-95 duration-300 shadow cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <ActionIcon className="h-5 w-5 animate-spin fill-black" name="IC-loader" />
                <span>{statusText || 'Публикация...'}</span>
              </>
            ) : (
              <span>{lang?.creators_publish_single || 'Опубликовать сингл'}</span>
            )}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODE: ALBUM / EP                                      */}
      {/* ======================================================== */}
      {mode === 'album' && (
        <div className="w-full flex flex-col gap-3 border border-zinc-600/30 bg-zinc-800/40 p-3 rounded-3xl">
          <div className="flex flex-col lg:flex-row items-start gap-3">
            {/* Album Cover Upload */}
            <div className="flex flex-col items-center shrink-0 w-full lg:w-56">
              <input
                type="file"
                id="album-cover-file"
                accept="image/*"
                onChange={(e) => handleCoverUpload(e, 'album')}
                className="hidden"
              />
              <label
                htmlFor="album-cover-file"
                className="w-56 h-56 rounded-3xl border border-zinc-600/30 bg-zinc-800/70 hover:bg-zinc-700/70 relative flex flex-col items-center justify-center cursor-pointer overflow-hidden group duration-300 active:scale-95 shadow"
              >
                {albumCover ? (
                  <>
                    <img src={albumCover} alt="Cover" className="w-full h-full object-cover" />
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
                    <span className="text-sm font-semibold text-zinc-200">
                      {lang?.creators_cover_drop_title || 'Обложка альбома'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {lang?.creators_cover_drop_subtitle || 'Квадрат 1:1, JPG / PNG'}
                    </span>
                  </div>
                )}
              </label>
            </div>

            {/* Album Metadata Fields */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Album Title */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.albumtitle || 'Название альбома'} *</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    placeholder="Например: Лучшие хиты"
                    className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                  />
                </div>
              </div>

              {/* Artist Selector */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.albumartist || 'Исполнитель альбома'} *</span>
                {userArtists.length > 0 ? (
                  <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1 gap-1">
                    <select
                      value={albumArtistMode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAlbumArtistMode(val);
                        if (val === 'custom') {
                          setAlbumArtistId('');
                          setAlbumArtistName('');
                        } else if (!val) {
                          setAlbumArtistId('');
                          setAlbumArtistName('');
                        } else {
                          const art = userArtists.find((a) => String(a.id) === val);
                          if (art) {
                            setAlbumArtistName(art.name);
                            setAlbumArtistId(String(art.id));
                          }
                        }
                      }}
                      className="w-full bg-transparent pl-2 pr-4 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer flex-1"
                    >
                      <option value="" className="bg-zinc-900 text-zinc-400">
                        {lang?.creators_not_specified || 'Не выбрано'}
                      </option>
                      {userArtists.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.name} {a.verify ? '✓' : ''}
                        </option>
                      ))}
                      <option value="custom">{lang?.creators_custom_artist || 'Другой исполнитель'}</option>
                    </select>

                    {albumArtistMode === 'custom' && (
                      <input
                        type="text"
                        autoComplete="off"
                        value={albumArtistName}
                        onChange={(e) => setAlbumArtistName(e.target.value)}
                        placeholder="Имя артиста"
                        className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 flex-1 border-l border-zinc-600/30"
                      />
                    )}
                  </div>
                ) : (
                  <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={albumArtistName}
                      onChange={(e) => setAlbumArtistName(e.target.value)}
                      placeholder="Имя артиста"
                      className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                    />
                  </div>
                )}
              </div>

              {/* Album Genre */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.pulse_genre_label || 'Жанр релиза'}</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <select
                    value={albumGenre}
                    onChange={(e) => setAlbumGenre(e.target.value)}
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

              {/* Album Language */}
              <div className="flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.albumlang || 'Язык альбома'}</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <select
                    value={albumLang}
                    onChange={(e) => setAlbumLang(e.target.value)}
                    className="w-full bg-transparent pl-2 pr-4 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 cursor-pointer"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-400">
                      {lang?.creators_not_specified || 'Не выбрано'}
                    </option>
                    {PULSE_TRACK_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-zinc-900 text-white">
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="col-span-1 sm:col-span-2 flex w-full flex-col">
                <span className="z-20 pl-4 text-zinc-400">{lang?.albumdesc || 'Описание альбома'}</span>
                <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                  <input
                    type="text"
                    autoComplete="off"
                    value={albumDesc}
                    onChange={(e) => setAlbumDesc(e.target.value)}
                    placeholder="Пара слов о концепции релиза..."
                    className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tracks Section Header */}
          <div className="w-full flex items-center justify-between gap-3 mt-3">
            <h2 className="text-lg font-bold text-zinc-100">
              {lang?.tracks_title || 'Список треков'} ({albumTracks.length})
            </h2>

            <button
              type="button"
              onClick={addAlbumTrack}
              disabled={albumTracks.length >= 20}
              className="px-4 py-2 rounded-full border border-zinc-600/30 bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700 active:scale-95 duration-300 cursor-pointer flex items-center gap-1.5"
            >
              <ActionIcon className="w-4 h-4 fill-current" name="IC-plus" />
              <span>{lang?.trackadd || 'Добавить трек'}</span>
            </button>
          </div>

          {/* Tracks List Container */}
          <div className="flex flex-col gap-3 w-full">
            {albumTracks.map((t, idx) => (
              <div
                key={t.localId}
                className="w-full p-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/60 flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                  <span className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600/30 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>

                  <div className="flex h-10 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1 flex-1">
                    <input
                      type="text"
                      autoComplete="off"
                      value={t.name}
                      onChange={(e) => updateAlbumTrack(idx, 'name', e.target.value)}
                      placeholder={lang?.trackName || 'Название трека'}
                      className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 text-sm"
                    />
                  </div>

                  <div className="flex h-10 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1 flex-1">
                    <input
                      type="text"
                      autoComplete="off"
                      value={t.artist}
                      onChange={(e) => updateAlbumTrack(idx, 'artist', e.target.value)}
                      placeholder={lang?.albumartist || 'Исполнитель'}
                      className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 text-sm"
                    />
                  </div>

                  {/* Mood Select */}
                  <div className="flex h-10 rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                    <select
                      value={t.mood}
                      onChange={(e) => updateAlbumTrack(idx, 'mood', e.target.value)}
                      className="w-full bg-transparent pl-2 pr-4 text-zinc-100 focus:border-0 focus:outline-0 focus:ring-0 text-xs cursor-pointer"
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

                  {/* Audio Upload File Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="file"
                      id={`album-audio-${t.localId}`}
                      accept=".mp3"
                      onChange={(e) => handleAlbumAudioUpload(idx, e)}
                      className="hidden"
                    />
                    <label
                      htmlFor={`album-audio-${t.localId}`}
                      className={`px-3 py-2 rounded-full text-xs font-medium border border-zinc-600/30 cursor-pointer duration-300 active:scale-95 flex items-center gap-1.5 ${
                        t.audioId
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <ActionIcon className="w-3.5 h-3.5 fill-current" name="IC-music" />
                      <span>
                        {t.uploading
                          ? 'Загрузка...'
                          : t.audioId
                            ? '✓ Загружено'
                            : 'Выбрать MP3'}
                      </span>
                    </label>

                    {albumTracks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAlbumTrack(idx)}
                        aria-label="Удалить трек"
                        className="w-8 h-8 rounded-full border border-zinc-600/30 bg-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-500/20 duration-300 active:scale-95 cursor-pointer flex items-center justify-center shrink-0 aspect-square"
                      >
                        <ActionIcon className="w-4 h-4 fill-current" name="IC-trash" />
                      </button>
                    )}
                  </div>
                </div>

                {t.audioUrl && (
                  <div className="w-full">
                    <audio controls src={t.audioUrl} className="w-full h-8 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Guidelines Warning */}
          <div
            className="border border-zinc-600/30 p-3 bg-zinc-900/60 rounded-3xl text-xs text-zinc-400 flex flex-col gap-1"
            dangerouslySetInnerHTML={{
              __html: lang?.albumuploadWarn2 || 'Убедитесь, что все треки соответствуют правилам загрузки контента.',
            }}
          />

          {/* Submit Album Button */}
          <button
            type="button"
            onClick={handlePublishAlbum}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-full bg-white text-black font-semibold text-base hover:bg-zinc-200 active:scale-95 duration-300 shadow cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <ActionIcon className="h-5 w-5 animate-spin fill-black" name="IC-loader" />
                <span>{statusText || 'Публикация...'}</span>
              </>
            ) : (
              <span>{lang?.creators_publish_album || 'Опубликовать альбом'}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PulseCreateUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
