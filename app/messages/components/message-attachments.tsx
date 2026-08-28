import React from 'react';
import { MessageAttachment, normalizeAssetUrl, getDialogImageKey, cn } from '../lib/messages-shared';

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
  messageId: number;
  onOpenImage?: (imageKey: string) => void;
}

export default function MessageAttachments({
  attachments,
  messageId,
  onOpenImage,
}: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  // Ограничиваем до 9 изображений
  const displayAttachments = attachments.slice(0, 9);
  const count = displayAttachments.length;

  // Одиночное изображение: сохраняем реальное соотношение сторон (без принудительного квадрата)
  if (count === 1) {
    const att = displayAttachments[0];
    const isBlob = att.url.startsWith('blob:');
    const imgSrc = isBlob ? att.url : normalizeAssetUrl(att.url, '');
    const imageKey = getDialogImageKey(messageId, 0);

    return (
      <div className="flex max-w-full">
        <button
          type="button"
          onClick={() => onOpenImage?.(imageKey)}
          className="group relative block overflow-hidden rounded-3xl cursor-pointer duration-300 active:scale-95 text-left max-w-full focus:outline-none"
        >
          <img
            src={imgSrc}
            alt="Вложение"
            className="max-h-96 w-auto max-w-full rounded-3xl object-contain shadow"
            loading="lazy"
          />
        </button>
      </div>
    );
  }

  // Определяем сетку для нескольких изображений
  const getGridClass = (total: number) => {
    if (total === 2) return 'grid-cols-2 max-w-sm sm:max-w-md';
    if (total === 3) return 'grid-cols-2 max-w-sm sm:max-w-md';
    if (total === 4) return 'grid-cols-2 max-w-sm sm:max-w-md';
    return 'grid-cols-3 max-w-md sm:max-w-lg';
  };

  return (
    <div className={cn('grid gap-3 max-w-full', getGridClass(count))}>
      {displayAttachments.map((att, index) => {
        const isBlob = att.url.startsWith('blob:');
        const imgSrc = isBlob ? att.url : normalizeAssetUrl(att.url, '');
        const imageKey = getDialogImageKey(messageId, index);
        const isFeatured = count === 3 && index === 0;

        return (
          <button
            key={`att_${att.media_id || index}_${index}`}
            type="button"
            onClick={() => onOpenImage?.(imageKey)}
            className={cn(
              'group relative overflow-hidden rounded-3xl cursor-pointer duration-300 active:scale-95 focus:outline-none',
              isFeatured ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
            )}
          >
            <img
              src={imgSrc}
              alt={`Вложение ${index + 1}`}
              className="w-full h-full object-cover rounded-3xl shadow"
              loading="lazy"
            />
          </button>
        );
      })}
    </div>
  );
}
