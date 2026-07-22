'use client';

import React, { useRef, useState } from 'react';
import Modal from './modal';
import { SvgIcon } from '../feed/editor-shared';
import { uploadImageToImgbb, makeId, safeRevokeObjectUrl } from '../feed/editor-shared';

type MediaMode = 'carousel' | 'collage';

type DraftMediaImage = {
  id: string;
  previewUrl: string;
  uploadedUrl?: string;
  status: 'uploading' | 'uploaded' | 'error';
};

type PostBlockMediaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (bbcode: string) => void;
  initialUrls?: string[];
  initialMode?: MediaMode;
  strings?: Record<string, string>;
};

export default function PostBlockMediaModal({
  isOpen,
  onClose,
  onInsert,
  initialUrls,
  initialMode = 'carousel',
  strings,
}: PostBlockMediaModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<DraftMediaImage[]>([]);
  const [mode, setMode] = useState<MediaMode>(initialMode);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialUrls && initialUrls.length > 0) {
        const initialDrafts: DraftMediaImage[] = initialUrls.map((url) => ({
          id: makeId(),
          previewUrl: url,
          uploadedUrl: url,
          status: 'uploaded',
        }));
        setImages(initialDrafts);
      } else {
        setImages([]);
      }
    }
  }, [isOpen, initialUrls, initialMode]);

  const MAX_IMAGES = 6;
  const hasUploading = images.some((i) => i.status === 'uploading');
  const hasError = images.some((i) => i.status === 'error');
  const canInsert = images.filter((i) => i.status === 'uploaded').length >= 2 && !hasUploading;

  const handleClose = () => {
    images.forEach((img) => {
      if (img.previewUrl.startsWith('blob:')) {
        safeRevokeObjectUrl(img.previewUrl);
      }
    });
    setImages([]);
    setMode('carousel');
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';

    if (!files.length) return;

    const available = MAX_IMAGES - images.length;
    const filesToProcess = files.slice(0, available);

    const drafts: DraftMediaImage[] = filesToProcess.map((file) => ({
      id: makeId(),
      previewUrl: URL.createObjectURL(file),
      status: 'uploading',
    }));

    setImages((prev) => [...prev, ...drafts]);
    setIsUploading(true);

    await Promise.all(
      filesToProcess.map(async (file, i) => {
        const draft = drafts[i];
        try {
          const uploadedUrl = await uploadImageToImgbb(file);
          setImages((prev) =>
            prev.map((img) =>
              img.id === draft.id ? { ...img, status: 'uploaded', uploadedUrl } : img,
            ),
          );
        } catch {
          setImages((prev) =>
            prev.map((img) =>
              img.id === draft.id ? { ...img, status: 'error' } : img,
            ),
          );
        }
      }),
    );

    setIsUploading(false);
  };

  const moveLeft = (index: number) => {
    if (index <= 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveRight = (index: number) => {
    if (index >= images.length - 1) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleRemove = (id: string) => {
    const img = images.find((i) => i.id === id);
    if (img && img.previewUrl.startsWith('blob:')) {
      safeRevokeObjectUrl(img.previewUrl);
    }
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const handleInsert = () => {
    const urls = images
      .filter((i) => i.status === 'uploaded' && i.uploadedUrl)
      .map((i) => i.uploadedUrl as string)
      .join('||');

    if (!urls) return;

    const bbcode = mode === 'carousel'
      ? `\n[carousel]${urls}[/carousel]\n`
      : `\n[collage]${urls}[/collage]\n`;

    images.forEach((img) => {
      if (img.previewUrl.startsWith('blob:')) {
        safeRevokeObjectUrl(img.previewUrl);
      }
    });
    setImages([]);
    onInsert(bbcode);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === 'carousel'
          ? (strings?.editor_carousel || 'Карусель')
          : (strings?.editor_collage || 'Коллаж')
      }
    >
      <div className="flex flex-col gap-3">
        {/* Переключатель режима */}
        <div className="flex gap-3 p-1 bg-zinc-800/60 rounded-3xl border border-zinc-700/40">
          <button
            type="button"
            onClick={() => setMode('carousel')}
            className={`flex-1 py-1.5 rounded-3xl text-sm font-medium duration-300 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
              mode === 'carousel'
                ? 'bg-zinc-700 text-zinc-100 shadow'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <SvgIcon className="w-4 h-4 fill-current" id="IC-carousel" />
            <span>{strings?.editor_carousel || 'Карусель'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('collage')}
            className={`flex-1 py-1.5 rounded-3xl text-sm font-medium duration-300 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
              mode === 'collage'
                ? 'bg-zinc-700 text-zinc-100 shadow'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <SvgIcon className="w-4 h-4 fill-current" id="IC-collage" />
            <span>{strings?.editor_collage || 'Коллаж'}</span>
          </button>
        </div>

        {/* Описание режима */}
        <p className="text-xs text-zinc-500 px-1">
          {mode === 'carousel'
            ? 'Фотографии отображаются горизонтальной прокруткой. Минимум 2, максимум 6.'
            : 'Фотографии отображаются в виде сетки. Минимум 2, максимум 6.'}
        </p>

        {/* Сетка превью */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {images.map((img, idx) => (
              <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/40 group/item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {/* Статус загрузки */}
                {img.status === 'uploading' && (
                  <div className="absolute inset-0 bg-zinc-900/70 flex items-center justify-center">
                    <svg className="w-7 h-7 animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <use href="#IC-loader" />
                    </svg>
                  </div>
                )}
                {img.status === 'error' && (
                  <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                    <SvgIcon className="w-6 h-6 fill-red-400" id="IC-times" />
                  </div>
                )}

                {/* Навигационные кнопки смены порядка */}
                {img.status !== 'uploading' && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 flex items-center justify-between px-1 pointer-events-none">
                    {idx > 0 ? (
                      <button
                        type="button"
                        onClick={() => moveLeft(idx)}
                        className="p-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white cursor-pointer active:scale-95 duration-200 pointer-events-auto"
                        title="Сдвинуть влево"
                      >
                        <SvgIcon className="w-3.5 h-3.5 fill-current" id="IC-chevron-left" />
                      </button>
                    ) : <div />}

                    {idx < images.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => moveRight(idx)}
                        className="p-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white cursor-pointer active:scale-95 duration-200 pointer-events-auto"
                        title="Сдвинуть вправо"
                      >
                        <SvgIcon className="w-3.5 h-3.5 fill-current" id="IC-chevron-right" />
                      </button>
                    ) : <div />}
                  </div>
                )}

                {/* Кнопка удаления */}
                {img.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => handleRemove(img.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-zinc-900/80 border border-zinc-600/40 flex items-center justify-center cursor-pointer active:scale-95 duration-300 hover:bg-zinc-800"
                    title="Удалить фото"
                  >
                    <SvgIcon className="w-3.5 h-3.5 fill-zinc-300" id="IC-trash" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Кнопка добавить фото */}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-3xl border border-dashed border-zinc-600/50 text-zinc-400 hover:text-zinc-300 hover:border-zinc-500/70 duration-300 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <SvgIcon className="w-5 h-5 fill-current" id="IC-photos" />
            <span>
              {strings?.photo || 'Добавить фото'} ({images.length}/{MAX_IMAGES})
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Ошибки */}
        {hasError && (
          <p className="text-xs text-red-400 px-1">
            Некоторые фото не загрузились. Удалите их и попробуйте снова.
          </p>
        )}

        {/* Кнопка вставки */}
        <button
          type="button"
          onClick={handleInsert}
          disabled={!canInsert}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {mode === 'carousel'
            ? <><SvgIcon className="w-5 h-5 fill-current" id="IC-carousel" /><span>{strings?.editor_carousel || 'Вставить карусель'}</span></>
            : <><SvgIcon className="w-5 h-5 fill-current" id="IC-collage" /><span>{strings?.editor_collage || 'Вставить коллаж'}</span></>}
        </button>
      </div>
    </Modal>
  );
}
