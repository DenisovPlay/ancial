import type React from 'react';

export type DraftImage = {
  id: string;
  previewUrl: string;
  status: 'error' | 'uploaded' | 'uploading';
  uploadedUrl?: string;
};

import { uploadImage } from '../lib/upload';

export { uploadImage };
export const MAX_IMAGES = 3;

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function SvgIcon({
  className,
  id,
  viewBox = '0 0 48 48',
}: {
  className?: string;
  id: string;
  viewBox?: string;
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox}>
      <use href={`#${id}`}></use>
    </svg>
  );
}

export function PollIcon({ className }: { className?: string }) {
  return <SvgIcon className={className} id="IC-poll" viewBox="0 0 48 48" />;
}

export function StickersIcon({ className }: { className?: string }) {
  return <SvgIcon className={className} id="IC-humor" viewBox="0 0 48 48" />;
}

export function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function decodeHtmlToTextareaValue(value: string | null | undefined) {
  if (!value) return '';

  if (typeof document === 'undefined') {
    return decodeHtmlEntities(value).replace(/<br\s*\/?>(\r\n|\n|\r)?/gi, '\n');
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value.replace(/<br\s*\/?>(\r\n|\n|\r)?/gi, '\n');
}

export function safeRevokeObjectUrl(url: string | null | undefined) {
  if (!url || !url.startsWith('blob:')) return;
  URL.revokeObjectURL(url);
}

export function insertStickerIntoEditor(
  stickerCode: string,
  parseHtmlFn: (code: string, isPreview: boolean) => string,
  onFallback: (code: string) => void,
) {
  if (typeof document === 'undefined') {
    onFallback(stickerCode);
    return;
  }

  const editor = document.querySelector('.rich-editor') as HTMLElement | null;
  if (!editor) {
    onFallback(stickerCode);
    return;
  }

  const stickerHtml = parseHtmlFn(stickerCode, true);
  if (!stickerHtml) {
    onFallback(stickerCode);
    return;
  }

  editor.focus();
  const sel = window.getSelection();
  let range: Range | null = null;

  if (sel && sel.rangeCount > 0) {
    const currentRange = sel.getRangeAt(0);
    if (editor.contains(currentRange.startContainer)) {
      range = currentRange;
    }
  }

  if (!range) {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  const temp = document.createElement('div');
  temp.innerHTML = stickerHtml;
  const stickerNode = temp.firstElementChild;

  if (!stickerNode) {
    onFallback(stickerCode);
    return;
  }

  range.deleteContents();
  range.insertNode(stickerNode);

  // Перемещаем каретку вплотную сразу после вставленного стикера ([стикер]|)
  const newRange = document.createRange();
  newRange.setStartAfter(stickerNode);
  newRange.collapse(true);

  if (sel) {
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  // Триггерим input событие, чтобы rich-text-editor мгновенно синхронизировал стейт
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function uploadPostImageFiles({
  files,
  imagesRef,
  setImages,
  showNote,
  strings,
}: {
  files: File[];
  imagesRef: { current: DraftImage[] };
  setImages: React.Dispatch<React.SetStateAction<DraftImage[]>>;
  showNote: (params: { content: string; type: 'info' | 'success' | 'error'; time?: number }) => void;
  strings: Record<string, string>;
}): Promise<void> {
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;

    if (imagesRef.current.length >= MAX_IMAGES) {
      showNote({
        content: strings.max3photos,
        type: 'info',
        time: 8,
      });
      break;
    }

    const draftId = makeId();
    const previewUrl = URL.createObjectURL(file);

    const draftImage: DraftImage = {
      id: draftId,
      previewUrl,
      status: 'uploading',
    };

    imagesRef.current = [...imagesRef.current, draftImage];
    setImages((currentImages) => [...currentImages, draftImage]);

    showNote({
      content: strings.loading,
      type: 'info',
      time: 5,
    });

    try {
      const uploadedUrl = await uploadImage(file, { type: 'post', targetType: 'post' });

      safeRevokeObjectUrl(previewUrl);

      imagesRef.current = imagesRef.current.map((currentImage) =>
        currentImage.id === draftId
          ? { ...currentImage, status: 'uploaded', uploadedUrl }
          : currentImage,
      );
      setImages((currentImages) =>
        currentImages.map((currentImage) =>
          currentImage.id === draftId
            ? { ...currentImage, status: 'uploaded', uploadedUrl }
            : currentImage,
        ),
      );

      showNote({
        content: strings.uploadedcompl,
        type: 'success',
        time: 5,
      });
    } catch (error) {
      console.error('Image upload failed', error);

      safeRevokeObjectUrl(previewUrl);

      imagesRef.current = imagesRef.current.filter((currentImage) => currentImage.id !== draftId);
      setImages((currentImages) =>
        currentImages.filter((currentImage) => currentImage.id !== draftId),
      );

      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  }
}
