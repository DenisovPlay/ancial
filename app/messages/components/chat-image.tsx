'use client';

import type { CSSProperties } from 'react';

import AppImage from '../../components/app-image';
import { cn } from '../lib/messages-shared';

type ChatImageProps = {
  alt: string;
  className?: string;
  draggable?: boolean;
  fit?: 'contain' | 'cover';
  height?: number;
  /** Задан — одиночная картинка: не выше maxHeight, по ширине не больше родителя и оригинала. */
  maxHeight?: number;
  src: string;
  width?: number;
};

/** Пока одиночная картинка без известных размеров грузится, держим под неё квадрат. */
const NATURAL_PENDING_STYLE: CSSProperties = { width: '10rem', height: '10rem' };

/**
 * Раскладка картинок чата поверх общего AppImage (прелоадер, кэш, ошибка — там).
 * Реальные размеры (из media_files) дают картинке точную форму ещё до загрузки; без них
 * держится минимальный квадрат — ленту column-reverse догрузка всё равно не сдвигает.
 */
export default function ChatImage({ alt, className, draggable, fit = 'cover', height, maxHeight, src, width }: ChatImageProps) {
  const sized = maxHeight !== undefined && width && height && width > 0 && height > 0;
  // Одиночная картинка без известных размеров: после загрузки берёт натуральный размер.
  const naturalSingle = maxHeight !== undefined && !sized;

  const sizedWidth = sized ? Math.min(Math.round((maxHeight * width) / height), width) : 0;
  const style: CSSProperties | undefined = sized
    ? {
      aspectRatio: `${width} / ${height}`,
      // Только px: процент в ширине ломает shrink-to-fit родителя (он меряет картинку по оригиналу),
      // а по родителю ограничивает max-w-full.
      width: `${sizedWidth}px`,
    }
    : naturalSingle
      ? { maxHeight }
      : undefined;

  // Натуральный размер (оба измерения auto) — только без оптимизатора: вариант 2x из srcset
  // отрисовался бы вдвое меньше. Иначе размеры — база srcset: точные px или ячейка сетки.
  const sizeProps = sized
    ? { width: sizedWidth, height: Math.max(1, Math.round((sizedWidth * height) / width)) }
    : naturalSingle
      ? { width: 160, height: 160, unoptimized: true }
      : { width: 320, height: 320 };

  return (
    <AppImage
      {...sizeProps}
      src={src}
      alt={alt}
      draggable={draggable}
      style={style}
      pendingStyle={naturalSingle ? NATURAL_PENDING_STYLE : undefined}
      className={cn(
        'block max-w-full',
        fit === 'cover' ? 'object-cover' : 'object-contain',
        sized ? 'h-auto' : naturalSingle ? 'h-auto w-auto' : 'h-full w-full',
        className,
      )}
    />
  );
}
