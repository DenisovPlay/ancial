'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';

import { AncialAPI } from '../lib/api-v2';
import { type PulsePlaylistMeta } from './playlist/playlist-model';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from './pulse-image';
import { PulseModal, PulseModalField } from './pulse-modal';
import {
  ActionIcon,
  cn,
  normalizeText,
} from './pulse-components';

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload?key=595c8d872da11fdaa5225badc67cc6e6';

async function uploadPlaylistCover(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(IMGBB_UPLOAD_URL, {
    body: formData,
    method: 'POST',
  });
  const result = await response.json() as { data?: { url?: string } };
  return normalizeText(result.data?.url);
}

type PulsePlaylistEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (playlist: { id?: number | string | null; img?: string | null; name: string }) => void;
  playlist?: Pick<PulsePlaylistMeta, 'id' | 'img' | 'name'> | null;
  showNote: (content: string, type?: 'error' | 'info' | 'success', time?: number) => void;
};

export default function PulsePlaylistEditorModal({
  isOpen,
  onClose,
  onSaved,
  playlist = null,
  showNote,
}: PulsePlaylistEditorModalProps) {
  const [coverUrl, setCoverUrl] = useState('');
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');

  const playlistId = normalizeText(String(playlist?.id ?? ''));
  const isEditing = Boolean(playlistId);

  useEffect(() => {
    if (!isOpen) return;

    setCoverUrl(normalizeText(playlist?.img));
    setIsCoverUploading(false);
    setIsSaving(false);
    setName(normalizeText(playlist?.name));
  }, [isOpen, playlist?.img, playlist?.name]);

  const handleCoverChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCoverUploading(true);

    try {
      const nextCoverUrl = await uploadPlaylistCover(file);
      if (nextCoverUrl) {
        setCoverUrl(nextCoverUrl);
        showNote('Обложка загружена', 'success', 3);
      }
    } catch {
      showNote('Не удалось загрузить обложку', 'error', 5);
    } finally {
      setIsCoverUploading(false);
    }
  }, [showNote]);

  const savePlaylist = useCallback(async () => {
    const nextName = normalizeText(name);
    if (!nextName) {
      showNote('Введите название плейлиста', 'info', 3);
      return;
    }

    setIsSaving(true);

    try {
      const result = await AncialAPI.pulsePlaylistAction<{ id?: number | string | null }>(
        isEditing ? 'update' : 'create',
        {
          ...(isEditing ? { id: playlistId } : {}),
          img: coverUrl,
          name: nextName,
        }
      );

      const nextPlaylist = {
        id: playlistId || result?.id || null,
        img: coverUrl,
        name: nextName,
      };

      showNote(isEditing ? 'Плейлист обновлён!' : 'Плейлист создан!', 'success', 3);
      onSaved(nextPlaylist);
      onClose();
    } catch (error) {
      showNote(`Ошибка: ${error instanceof Error ? error.message : '?'}`, 'error', 5);
    } finally {
      setIsSaving(false);
    }
  }, [coverUrl, isEditing, name, onClose, onSaved, playlistId, showNote]);

  const isBusy = isCoverUploading || isSaving;

  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать плейлист' : 'Создать плейлист'}
    >
      <div className="flex items-center gap-3">
        <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-zinc-600/30 bg-zinc-800 duration-300 hover:bg-zinc-700/80 active:scale-95">
          <input
            accept="image/*"
            className="hidden"
            disabled={isBusy}
            onChange={handleCoverChange}
            type="file"
          />
          {coverUrl ? (
            <PulseCoverImage
              alt="Обложка плейлиста"
              className="rounded-xl"
              sizes={PULSE_COVER_IMAGE_SIZES.modal}
              src={coverUrl}
            />
          ) : (
            <ActionIcon className="h-7 w-7 fill-zinc-600" name={isCoverUploading ? 'IC-loader' : 'IC-music'} />
          )}
        </label>

        <div className="flex flex-grow flex-col gap-1">
          <span className="text-sm text-zinc-500">Обложка плейлиста</span>
          <label className="cursor-pointer text-sm text-purple-400 duration-150 hover:text-purple-300">
            Загрузить обложку
            <input
              accept="image/*"
              className="hidden"
              disabled={isBusy}
              onChange={handleCoverChange}
              type="file"
            />
          </label>
        </div>
      </div>

      <PulseModalField
        autoComplete="off"
        label="Название плейлиста"
        onChange={(event) => setName(event.target.value)}
        type="text"
        value={name}
      />

      <button
        type="button"
        onClick={() => void savePlaylist()}
        disabled={isBusy}
        className={cn(
          'flex items-center justify-center gap-2 rounded-full border border-zinc-600/30 bg-purple-700 px-4 py-2.5 font-medium text-zinc-100 duration-300',
          isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-purple-600 active:scale-95',
        )}
      >
        <ActionIcon className={cn('h-4 w-4', isBusy && 'animate-spin')} name={isBusy ? 'IC-loader' : 'IC-check'} />
        <span>{isEditing ? 'Сохранить изменения' : 'Сохранить'}</span>
      </button>
    </PulseModal>
  );
}
