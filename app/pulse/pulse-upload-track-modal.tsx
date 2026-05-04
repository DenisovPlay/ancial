'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';

import Modal from '../components/modal';
import { authFetch } from '../lib/auth-fetch';
import {
  getPulseTrackEditInitialState,
  getPulseTrackUploadPayload,
} from './playlist/playlist-model';
import {
  ActionIcon,
  cn,
  decodeHtmlEntities,
  normalizeText,
  type PulseTrack,
} from './pulse-components';

type PulseUploadTrackModalProps = {
  isOpen: boolean;
  onClose: () => void;
  track?: PulseTrack | null;
  onUploaded: () => void;
  showNote: (content: string, type?: 'error' | 'info' | 'success', time?: number) => void;
};

type JsMediaTagsPicture = {
  data?: number[] | Uint8Array | null;
  format?: string | null;
};

type JsMediaTagsResult = {
  tags?: {
    artist?: string | null;
    picture?: JsMediaTagsPicture | null;
    title?: string | null;
  };
};

type JsMediaTags = {
  read: (
    file: File,
    options: {
      onError: (error: unknown) => void;
      onSuccess: (result: JsMediaTagsResult) => void;
    },
  ) => void;
};

declare global {
  interface Window {
    jsmediatags?: JsMediaTags;
  }
}

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload?key=595c8d872da11fdaa5225badc67cc6e6';
const MEDIA_TAGS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';

let mediaTagsPromise: Promise<JsMediaTags | null> | null = null;

function loadMediaTags() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.jsmediatags) return Promise.resolve(window.jsmediatags);
  if (mediaTagsPromise) return mediaTagsPromise;

  mediaTagsPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = MEDIA_TAGS_SRC;
    script.onload = () => resolve(window.jsmediatags ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return mediaTagsPromise;
}

async function readAudioTags(file: File) {
  const mediaTags = await loadMediaTags();
  if (!mediaTags) return null;

  return new Promise<JsMediaTagsResult | null>((resolve) => {
    mediaTags.read(file, {
      onError: () => resolve(null),
      onSuccess: (result) => resolve(result),
    });
  });
}

async function uploadImageBlob(blob: Blob) {
  const formData = new FormData();
  formData.append('image', blob, 'cover.jpg');

  const response = await fetch(IMGBB_UPLOAD_URL, {
    body: formData,
    method: 'POST',
  });
  const result = await response.json() as { data?: { url?: string } };
  return normalizeText(result.data?.url);
}

async function uploadAudioFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await authFetch('/api/pulse/awsuploadtrack.php', {
    body: formData,
    method: 'POST',
  });
  const result = normalizeText(await response.text());

  if (!result || result === 'Failure') {
    throw new Error('Upload failed');
  }

  return result;
}

function getPictureBlob(picture: JsMediaTagsPicture | null | undefined) {
  if (!picture?.data?.length) return null;

  const data = picture.data instanceof Uint8Array
    ? picture.data
    : new Uint8Array(picture.data);
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: normalizeText(picture.format) || 'image/jpeg' });
}

export default function PulseUploadTrackModal({
  isOpen,
  onClose,
  track = null,
  onUploaded,
  showNote,
}: PulseUploadTrackModalProps) {
  const coverObjectUrlRef = useRef('');
  const [artist, setArtist] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [explicit, setExplicit] = useState('0');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lang, setLang] = useState('--');
  const [name, setName] = useState('');
  const [statusText, setStatusText] = useState('');
  const [trackId, setTrackId] = useState('');
  const isEditingExistingTrack = Boolean(track);

  const setPreviewUrl = useCallback((url: string) => {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current);
      coverObjectUrlRef.current = '';
    }

    if (url.startsWith('blob:')) {
      coverObjectUrlRef.current = url;
    }

    setCoverPreview(url);
  }, []);

  const reset = useCallback(() => {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current);
      coverObjectUrlRef.current = '';
    }

    setArtist('');
    setCoverPreview('');
    setCoverUrl('');
    setExplicit('0');
    setFileInputKey((key) => key + 1);
    setIsAudioUploading(false);
    setIsCoverUploading(false);
    setIsSaved(false);
    setIsSaving(false);
    setLang('--');
    setName('');
    setStatusText('');
    setTrackId('');
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (!track) {
      reset();
      return;
    }

    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current);
      coverObjectUrlRef.current = '';
    }

    const initialState = getPulseTrackEditInitialState(track);
    setArtist(initialState.artist);
    setCoverPreview(initialState.image);
    setCoverUrl(initialState.image);
    setExplicit(initialState.explicit);
    setFileInputKey((key) => key + 1);
    setIsAudioUploading(false);
    setIsCoverUploading(false);
    setIsSaved(true);
    setIsSaving(false);
    setLang(initialState.lang);
    setName(initialState.name);
    setStatusText('Готово');
    setTrackId(initialState.trackId);
  }, [isOpen, reset, track]);

  useEffect(() => {
    return () => {
      if (coverObjectUrlRef.current) {
        URL.revokeObjectURL(coverObjectUrlRef.current);
      }
    };
  }, []);

  const saveTrack = useCallback(async (nextTrackId: string, nextName: string, nextArtist: string, nextCoverUrl: string, nextLang: string, nextExplicit: string) => {
    setIsSaving(true);
    setStatusText('Сохраняю трек...');

    try {
      const payload = getPulseTrackUploadPayload({
        artist: nextArtist,
        explicit: nextExplicit,
        image: nextCoverUrl,
        lang: nextLang,
        name: nextName,
        trackId: nextTrackId,
      });

      const response = await authFetch('/api/pulse/upload_track.php', {
        body: payload.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        method: 'POST',
      });
      const result = normalizeText(await response.text());

      if (result !== 'SUCCESS') {
        throw new Error(result || 'Unknown error');
      }

      setIsSaved(true);
      setStatusText('Трек добавлен в Избранное');
      showNote('Трек добавлен в Избранное!', 'success', 3);
      onUploaded();
    } catch (error) {
      setStatusText('');
      showNote(`Ошибка: ${error instanceof Error ? error.message : 'не удалось сохранить трек'}`, 'error', 5);
    } finally {
      setIsSaving(false);
    }
  }, [onUploaded, showNote]);

  const updateTrack = useCallback(async () => {
    if (!trackId) return;

    setIsSaving(true);
    setStatusText('Сохраняю изменения...');

    try {
      const payload = getPulseTrackUploadPayload({
        artist,
        explicit,
        image: coverUrl,
        lang,
        name,
        trackId,
      });

      const response = await authFetch('/api/pulse/update_track.php', {
        body: payload.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        method: 'POST',
      });
      const result = normalizeText(await response.text());

      if (result !== 'SUCCESS') {
        throw new Error(result || 'Unknown error');
      }

      setStatusText('Изменения сохранены');
      showNote('Изменения сохранены!', 'success', 3);
      onUploaded();
      if (isEditingExistingTrack) {
        onClose();
      }
    } catch (error) {
      showNote(`Ошибка: ${error instanceof Error ? error.message : 'не удалось сохранить изменения'}`, 'error', 5);
    } finally {
      setIsSaving(false);
    }
  }, [artist, coverUrl, explicit, isEditingExistingTrack, lang, name, onClose, onUploaded, showNote, trackId]);

  const handleAudioChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAudioUploading(true);
    setIsSaved(false);
    setStatusText('Загружаю трек...');
    setTrackId('');

    try {
      const tagsPromise = readAudioTags(file);
      const uploadPromise = uploadAudioFile(file);
      const [tagsResult, nextTrackId] = await Promise.all([tagsPromise, uploadPromise]);
      const tags = tagsResult?.tags ?? {};
      const nextName = normalizeText(tags.title) || normalizeText(file.name.replace(/\.[^.]+$/, ''));
      const nextArtist = normalizeText(tags.artist).replaceAll('/', ', ');
      let nextCoverUrl = '';

      setName(nextName);
      setArtist(nextArtist);
      setTrackId(nextTrackId);

      const pictureBlob = getPictureBlob(tags.picture);
      if (pictureBlob) {
        const objectUrl = URL.createObjectURL(pictureBlob);
        setPreviewUrl(objectUrl);
        setIsCoverUploading(true);

        try {
          nextCoverUrl = await uploadImageBlob(pictureBlob);
          if (nextCoverUrl) {
            setCoverUrl(nextCoverUrl);
            setPreviewUrl(nextCoverUrl);
          }
        } catch {
          showNote('Не удалось загрузить обложку, трек сохранится без неё', 'info', 4);
        } finally {
          setIsCoverUploading(false);
        }
      }

      setStatusText('Аудио загружено');
      showNote('Аудио загружено!', 'success', 3);
      await saveTrack(nextTrackId, nextName, nextArtist, nextCoverUrl, lang, explicit);
    } catch {
      setStatusText('');
      showNote('Ошибка загрузки аудио', 'error', 5);
    } finally {
      setIsAudioUploading(false);
    }
  }, [explicit, lang, saveTrack, setPreviewUrl, showNote]);

  const handleCoverChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCoverUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const nextCoverUrl = await uploadImageBlob(file);
      if (nextCoverUrl) {
        setCoverUrl(nextCoverUrl);
        setPreviewUrl(nextCoverUrl);
        showNote('Обложка загружена', 'success', 3);

        if (trackId && isSaved) {
          setIsSaving(true);
          setStatusText('Сохраняю изменения...');

          try {
            const payload = getPulseTrackUploadPayload({
              artist,
              explicit,
              image: nextCoverUrl,
              lang,
              name,
              trackId,
            });
            const response = await authFetch('/api/pulse/update_track.php', {
              body: payload.toString(),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              },
              method: 'POST',
            });
            const result = normalizeText(await response.text());
            if (result === 'SUCCESS') {
              setStatusText('Изменения сохранены');
              showNote('Изменения сохранены!', 'success', 3);
              onUploaded();
            } else {
              throw new Error(result || 'Unknown error');
            }
          } catch (error) {
            showNote(`Ошибка: ${error instanceof Error ? error.message : 'не удалось сохранить изменения'}`, 'error', 5);
          } finally {
            setIsSaving(false);
          }
        }
      }
    } catch {
      showNote('Не удалось загрузить обложку', 'error', 5);
    } finally {
      setIsCoverUploading(false);
    }
  }, [artist, explicit, isSaved, lang, name, onUploaded, setPreviewUrl, showNote, trackId]);

  const canUpdate = Boolean(trackId) && isSaved && !isSaving && !isAudioUploading && !isCoverUploading;
  const cover = coverPreview || coverUrl;
  const isBusy = isAudioUploading || isCoverUploading || isSaving;

  return (
    <Modal
      bodyClassName="pt-[72px]"
      isOpen={isOpen}
      onClose={onClose}
      title={isEditingExistingTrack ? 'Редактировать трек' : 'Добавить трек'}
      width="md"
    >
      <div className="flex flex-col gap-3">
        <label
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-600/50 bg-zinc-950/40 p-6 text-center duration-300 hover:bg-zinc-800/60 active:scale-[0.99]',
            trackId && 'hidden',
          )}
        >
          <input
            key={fileInputKey}
            accept="audio/*"
            className="hidden"
            disabled={isBusy}
            onChange={handleAudioChange}
            type="file"
          />
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/80">
            <ActionIcon className="h-8 w-8 fill-zinc-300" name="IC-music" />
          </span>
          <span className="text-base font-bold text-white">Выберите аудиофайл</span>
          <span className="text-sm text-zinc-400">После загрузки трек автоматически добавится в Избранное</span>
        </label>

        {isAudioUploading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-zinc-600/30 bg-zinc-950/30 p-4 text-sm text-zinc-300">
            <ActionIcon className="h-6 w-6 animate-spin fill-purple-500" name="IC-loader" />
            <span>{statusText || 'Загружаю трек...'}</span>
          </div>
        ) : null}

        {trackId ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="group relative flex h-36 w-36 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-800">
                <input accept="image/*" className="hidden" disabled={isBusy} onChange={handleCoverChange} type="file" />
                {cover ? (
                  <img src={cover} alt="Обложка трека" className="h-full w-full object-cover duration-300 group-hover:scale-105" />
                ) : (
                  <ActionIcon className="h-9 w-9 fill-zinc-600" name="IC-music" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 text-center text-xs text-zinc-200 opacity-0 duration-300 group-hover:opacity-100">
                  Обложка
                </span>
              </label>

              <div className="grid min-w-0 flex-grow grid-cols-1 gap-2">
                <input
                  className="rounded-2xl border border-zinc-600/30 bg-zinc-950/50 px-3 py-2 text-white outline-none duration-300 placeholder:text-zinc-600 focus:border-purple-500/60"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Название"
                  value={name}
                />
                <input
                  className="rounded-2xl border border-zinc-600/30 bg-zinc-950/50 px-3 py-2 text-white outline-none duration-300 placeholder:text-zinc-600 focus:border-purple-500/60"
                  onChange={(event) => setArtist(event.target.value)}
                  placeholder="Исполнитель"
                  value={artist}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-2xl border border-zinc-600/30 bg-zinc-950/50 px-3 py-2 text-white outline-none duration-300 placeholder:text-zinc-600 focus:border-purple-500/60"
                    onChange={(event) => setLang(event.target.value)}
                    placeholder="--"
                    value={lang}
                  />
                  <select
                    className="rounded-2xl border border-zinc-600/30 bg-zinc-950/50 px-3 py-2 text-white outline-none duration-300 focus:border-purple-500/60"
                    onChange={(event) => setExplicit(event.target.value)}
                    value={explicit}
                  >
                    <option value="0">Без E</option>
                    <option value="1">18+ / E</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-3xl border border-zinc-600/30 bg-zinc-950/30 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                {isBusy ? (
                  <ActionIcon className="h-5 w-5 animate-spin fill-purple-500" name="IC-loader" />
                ) : (
                  <ActionIcon className="h-5 w-5 fill-emerald-400" name={isSaved ? 'IC-check' : 'IC-music'} />
                )}
                <span>{statusText || 'Готово'}</span>
              </div>

              {isSaved ? (
                <button
                  type="button"
                  disabled={!canUpdate}
                  onClick={() => void updateTrack()}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2 font-bold text-white shadow duration-300',
                    canUpdate ? 'cursor-pointer hover:bg-purple-600 active:scale-95' : 'cursor-not-allowed opacity-60',
                  )}
                >
                  <ActionIcon className="h-5 w-5" name="IC-check" />
                  <span>Сохранить изменения</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function PulseDeleteTrackModal({
  isOpen,
  onClose,
  onDeleted,
  showNote,
  track,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  showNote: (content: string, type?: 'error' | 'info' | 'success', time?: number) => void;
  track: PulseTrack | null;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const trackId = normalizeText(String(track?.sid ?? ''));
  const title = decodeHtmlEntities(track?.title) || 'трек';

  const deleteTrack = useCallback(async () => {
    if (!trackId) return;

    setIsDeleting(true);

    try {
      const payload = new URLSearchParams();
      payload.set('trackid', trackId);

      const response = await authFetch('/api/pulse/delete_track.php', {
        body: payload.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        method: 'POST',
      });
      const result = normalizeText(await response.text());

      if (result !== 'SUCCESS') {
        throw new Error(result || 'Unknown error');
      }

      showNote('Трек удалён', 'success', 3);
      onDeleted();
      onClose();
    } catch (error) {
      showNote(`Ошибка: ${error instanceof Error ? error.message : 'не удалось удалить трек'}`, 'error', 5);
    } finally {
      setIsDeleting(false);
    }
  }, [onClose, onDeleted, showNote, trackId]);

  return (
    <Modal
      animation="fade"
      align="center"
      bodyClassName="pt-[72px]"
      isOpen={isOpen}
      onClose={onClose}
      title="Удалить трек"
      width="sm"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-3xl border border-zinc-600/30 bg-zinc-950/40 p-4 text-sm text-zinc-300">
          Вы точно хотите удалить <span className="font-bold text-white">{title}</span>? Это действие нельзя отменить.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-900/40 px-4 py-2 font-bold text-zinc-200 duration-300 hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void deleteTrack()}
            disabled={isDeleting}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-red-400/30 bg-red-500 px-4 py-2 font-bold text-white duration-300 hover:bg-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? <ActionIcon className="h-5 w-5 animate-spin" name="IC-loader" /> : <ActionIcon className="h-5 w-5" name="IC-trash" />}
            <span>Удалить</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
