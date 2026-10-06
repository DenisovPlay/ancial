'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../context/AuthContext';
import Icon from './svg-icon';

// Тот же пикер, что в постах (без 7TV); грузится только при открытии.
const UnifiedStickerPicker = dynamic(() => import('./unified-sticker-picker'), { ssr: false });

const PICKER_WIDTH_PX = 336;
/** Нужное место под список: меньше — разворачиваем вверх. */
const PICKER_ROOM_PX = 360;
const EDGE_PX = 12;

/**
 * Кнопка стикеров в поле комментария. Список открывается отдельным слоем поверх страницы (портал в body),
 * а не внутри окна комментариев: прокрутка окна обрезала бы его. Выбранный стикер уходит кодом `:name:` (как в постах).
 */
export default function CommentStickerButton({ onSelect }: { onSelect: (shortcode: string) => void }) {
  const { lang } = useAuth();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  // top — раскрытие вниз, bottom — вверх (якорь у кнопки: реальная высота списка заранее неизвестна).
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const [shown, setShown] = useState(false);

  const close = useCallback(() => {
    setShown(false);
    setPlace(null);
  }, []);

  // Появление: один кадр в начальном положении, затем плавно в своё.
  useEffect(() => {
    if (!place) return undefined;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [place]);

  const toggle = () => {
    if (place) {
      close();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Справа от кнопки по краю, вниз — а если внизу тесно и сверху больше места, то вверх.
    const left = Math.max(EDGE_PX, Math.min(window.innerWidth - PICKER_WIDTH_PX - EDGE_PX, rect.right - PICKER_WIDTH_PX));
    const below = window.innerHeight - rect.bottom - EDGE_PX;
    const down = below >= PICKER_ROOM_PX || below >= rect.top;
    setShown(false);
    setPlace(down ? { left, top: rect.bottom + EDGE_PX / 2 } : { left, bottom: window.innerHeight - rect.top + EDGE_PX / 2 });
  };

  useEffect(() => {
    if (!place) return undefined;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (layerRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [close, place]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={lang?.stickers || 'Stickers'}
        aria-expanded={Boolean(place)}
        onClick={toggle}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-zinc-900 active:scale-95"
      >
        <Icon name="IC-emoji" className="h-7 w-7 fill-white" />
      </button>
      {place && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={layerRef}
              className="glass-menu fixed z-[10005] overflow-hidden rounded-3xl border border-zinc-600/30 shadow-2xl shadow-black/60 duration-300 motion-reduce:transition-none"
              style={{
                left: place.left,
                top: place.top,
                bottom: place.bottom,
                width: `min(${PICKER_WIDTH_PX}px, calc(100vw - ${EDGE_PX * 2}px))`,
                maxHeight: `calc(100dvh - ${EDGE_PX * 2}px)`,
                opacity: shown ? 1 : 0,
                transform: shown ? 'scale(1)' : 'scale(0.92)',
                transformOrigin: place.top !== undefined ? 'top right' : 'bottom right',
                transitionProperty: 'opacity, transform',
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <UnifiedStickerPicker scope="posts" onSelect={onSelect} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Вставляет текст на место курсора поля и возвращает фокус после него. */
export function insertAtCursor(input: HTMLInputElement | null, current: string, insert: string, apply: (next: string) => void) {
  const start = input?.selectionStart ?? current.length;
  const end = input?.selectionEnd ?? current.length;
  apply(`${current.slice(0, start)}${insert}${current.slice(end)}`);
  window.requestAnimationFrame(() => {
    input?.focus();
    input?.setSelectionRange(start + insert.length, start + insert.length);
  });
}
