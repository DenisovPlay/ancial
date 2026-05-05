'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { authFetch } from '../lib/auth-fetch';
import {
  getPulseTrackEditInitialState,
  getPulseTrackUploadPayload,
  getPulseUploadDropzoneVisible,
} from './playlist/playlist-model';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from './pulse-image';
import { PulseModal, PulseModalField, PulseModalSelectField } from './pulse-modal';
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

        if (trackId && isSaved && !isEditingExistingTrack) {
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
  }, [artist, explicit, isEditingExistingTrack, isSaved, lang, name, onUploaded, setPreviewUrl, showNote, trackId]);

  const canUpdate = Boolean(trackId) && isSaved && !isSaving && !isAudioUploading && !isCoverUploading;
  const cover = coverPreview || coverUrl;
  const isBusy = isAudioUploading || isCoverUploading || isSaving;
  const showUploadDropzone = getPulseUploadDropzoneVisible({
    isAudioUploading,
    isEditingExistingTrack,
    trackId,
  });

  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditingExistingTrack ? 'Редактирование трека' : 'Загрузка трека'}
    >
      {showUploadDropzone ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-600 p-4 duration-300 hover:bg-zinc-800/60 active:scale-95">
          <input
            key={fileInputKey}
            accept=".mp3"
            className="hidden"
            disabled={isBusy}
            onChange={handleAudioChange}
            type="file"
          />
          <ActionIcon className="h-8 w-8 fill-zinc-400" name="IC-download" />
          <span className="text-sm text-zinc-400">Выбрать .mp3 файл (до 10 МБ)</span>
        </label>
      ) : null}

      {isAudioUploading ? (
        <div className="flex flex-col items-center gap-2 py-4 text-sm text-zinc-400">
          <ActionIcon className="h-10 w-10 animate-spin fill-purple-400" name="IC-loader" />
          <span>{statusText || 'Загружаю трек...'}</span>
        </div>
      ) : null}

      {trackId ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-zinc-600/30 bg-zinc-800 duration-300 hover:bg-zinc-700/80 active:scale-95">
              <input accept="image/*" className="hidden" disabled={isBusy} onChange={handleCoverChange} type="file" />
              {cover ? (
                <PulseCoverImage
                  alt="Обложка трека"
                  className="rounded-xl"
                  sizes={PULSE_COVER_IMAGE_SIZES.modal}
                  src={cover}
                />
              ) : (
                <ActionIcon className="h-7 w-7 fill-zinc-600" name="IC-music" />
              )}
            </label>

            <div className="flex flex-grow flex-col gap-1">
              <span className={cn('text-zinc-500', isEditingExistingTrack ? 'text-sm' : 'text-xs')}>
                {isEditingExistingTrack ? 'Обложка трека' : 'Обложка извлечена из тега. Можно заменить:'}
              </span>
              <label className={cn('cursor-pointer text-purple-400 duration-300 hover:text-purple-300', isEditingExistingTrack ? 'text-sm' : 'text-xs')}>
                {isEditingExistingTrack ? 'Заменить обложку' : 'Загрузить свою обложку'}
                <input accept="image/*" className="hidden" disabled={isBusy} onChange={handleCoverChange} type="file" />
              </label>
            </div>
          </div>

          <PulseModalField
            autoComplete="off"
            label="Исполнитель"
            onChange={(event) => setArtist(event.target.value)}
            type="text"
            value={artist}
          />
          <PulseModalField
            autoComplete="off"
            label="Название трека"
            onChange={(event) => setName(event.target.value)}
            type="text"
            value={name}
          />

          <div className="grid grid-cols-2 gap-3">
            <PulseModalSelectField
              label="Язык трека"
              onChange={(event) => setLang(event.target.value)}
              value={lang}
            >
              <option value="" disabled>Выберите язык</option>
              <option value="--">Не указан</option>
              <option value="RU">Русский</option>
              <option value="EN">Английский</option>
              <option value="" disabled>Другой язык пока недоступен</option>
            </PulseModalSelectField>
            <PulseModalSelectField
              label="Контент"
              onChange={(event) => setExplicit(event.target.value)}
              value={explicit}
            >
              <option value="" disabled>Возрастное ограничение</option>
              <option value="0">Без 18+</option>
              <option value="1">18+ / E</option>
              <option value="" disabled>Выберите отметку</option>
            </PulseModalSelectField>
          </div>

          {isSaving && !isEditingExistingTrack ? (
            <div className="flex items-center justify-center gap-2 py-1 text-sm text-zinc-400">
              <ActionIcon className="h-4 w-4 animate-spin fill-purple-400" name="IC-loader" />
              <span>{statusText || 'Сохраняю в Избранное...'}</span>
            </div>
          ) : null}

          {isSaved && !isEditingExistingTrack ? (
            <div className="flex items-center gap-2 py-1 text-sm text-green-400">
              <ActionIcon className="h-4 w-4 shrink-0 fill-green-400" name="IC-check" />
              <span>Сохранено в Избранное</span>
            </div>
          ) : null}

          {isEditingExistingTrack || isSaved ? (
            <button
              type="button"
              disabled={!canUpdate}
              onClick={() => void updateTrack()}
              className={cn(
                'flex items-center justify-center gap-2 rounded-full border border-zinc-600/30 bg-purple-700 px-4 py-2.5 font-medium text-zinc-100 duration-300',
                canUpdate ? 'cursor-pointer hover:bg-purple-600 active:scale-95' : 'cursor-not-allowed opacity-60',
              )}
            >
              <ActionIcon className={cn('h-4 w-4', isBusy && 'animate-spin')} name={isBusy ? 'IC-loader' : 'IC-check'} />
              <span>Сохранить изменения</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </PulseModal>
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
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Удалить трек"
    >
      <div className="flex flex-col items-center gap-4 py-4">
        <ActionIcon className="h-12 w-12 fill-red-500" name="IC-trash" />
        <div className="text-center">
          <p className="text-sm text-zinc-300">Вы уверены, что хотите удалить трек?</p>
          <p className="mt-1 font-medium text-white">{title}</p>
        </div>
        <p className="text-center text-xs text-zinc-500">Это действие необратимо. Файл будет удалён с сервера.</p>
        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-700 px-4 py-2.5 font-medium text-zinc-100 duration-300 hover:bg-zinc-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void deleteTrack()}
            disabled={isDeleting}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-600/30 bg-red-700 px-4 py-2.5 font-medium text-zinc-100 duration-300 hover:bg-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? <ActionIcon className="h-4 w-4 animate-spin" name="IC-loader" /> : <ActionIcon className="h-4 w-4" name="IC-trash" />}
            <span>Удалить</span>
          </button>
        </div>
      </div>
    </PulseModal>
  );
}
