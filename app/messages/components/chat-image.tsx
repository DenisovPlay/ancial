'use client';

import { useCallback, useState, type CSSProperties } from 'react';

import { cn, Icon } from '../lib/messages-shared';

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

type LoadStatus = 'error' | 'loaded' | 'loading';

/**
 * Картинка чата с прелоадером как в Telegram: переливающаяся подложка, картинка проявляется из
 * размытия. Реальные размеры (из media_files) дают подложке точную форму будущей картинки; без них
 * подложка держит минимальный размер — ленту column-reverse догрузка всё равно не сдвигает.
 */
export default function ChatImage({ alt, className, draggable, fit = 'cover', height, maxHeight, src, width }: ChatImageProps) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setStatus('loading');
  }

  // Картинка из кэша может загрузиться раньше, чем React навесит onLoad.
  const attachImage = useCallback((element: HTMLImageElement | null) => {
    if (element?.complete && element.naturalWidth > 0) setStatus('loaded');
  }, []);

  const wrapperStyle: CSSProperties | undefined = maxHeight !== undefined && width && height && width > 0 && height > 0
    ? {
      aspectRatio: `${width} / ${height}`,
      width: `min(100%, ${Math.round((maxHeight * width) / height)}px, ${width}px)`,
    }
    : undefined;
  // Одиночная картинка без известных размеров: после загрузки берёт натуральный размер.
  const naturalSingle = maxHeight !== undefined && !wrapperStyle;
  const isLoaded = status === 'loaded';

  return (
    <span
      className={cn(
        'relative block max-w-full overflow-hidden',
        !isLoaded && 'chat-image-skeleton',
        naturalSingle && !isLoaded && 'h-40 w-40',
        className,
      )}
      style={wrapperStyle}
    >
      {status === 'error' ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Icon name="IC-image" className="h-8 w-8 fill-zinc-600" />
        </span>
      ) : null}

      <img
        ref={attachImage}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={draggable}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={naturalSingle && isLoaded ? { maxHeight } : undefined}
        className={cn(
          'block transition-[opacity,filter,transform] duration-500 ease-out',
          fit === 'cover' ? 'object-cover' : 'object-contain',
          naturalSingle && isLoaded ? 'h-auto w-auto max-w-full' : 'h-full w-full',
          isLoaded ? 'scale-100 opacity-100 blur-[0px]' : 'scale-[1.03] opacity-0 blur-md',
          status === 'error' && 'invisible',
        )}
      />
    </span>
  );
}
