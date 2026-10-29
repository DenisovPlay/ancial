'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import Icon from '../../components/svg-icon';
import { cn } from '../../lib/cn';
import { useRowSwipe } from '../../lib/use-row-swipe';

/**
 * Иконка, перечёркнутая диагональю («без звука», «открепить»). Вокруг черты — настоящий зазор (маска), а не обводка:
 * на любом фоне, в том числе на цветных подложках свайпа, выглядит чисто.
 */
export function SlashedIcon({ className, name }: { className?: string; name: string }) {
  const maskId = useId();
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={cn('shrink-0', className)}>
      <defs>
        <mask id={maskId}>
          <rect width="48" height="48" fill="white" />
          <line x1="7" y1="7" x2="41" y2="41" stroke="black" strokeWidth="8" strokeLinecap="round" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <use href={`#${name}`} fill="currentColor" />
      </g>
      <line x1="7" y1="7" x2="41" y2="41" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/** Колокольчик с чертой — «без звука». */
export function MutedBell({ className }: { className?: string }) {
  return <SlashedIcon name="IC-notification" className={className} />;
}

/** Кнопка закрепления: обычная — «закрепить», перечёркнутая — «открепить». */
export function PinIcon({ className, off }: { className?: string; off?: boolean }) {
  return off ? <SlashedIcon name="IC-pin" className={className} /> : <Icon name="IC-pin" className={cn('fill-current', className)} />;
}

/**
 * Строка списка чатов: на телефоне свайп вправо закрепляет/открепляет, влево — включает/выключает звук
 * (тот же жест и анимация, что у треков Pulse); на ПК те же действия — в контекстном меню по правой кнопке мыши.
 */
export default function DialogSwipeRow({
  children,
  labels,
  muted,
  onMute,
  onPin,
  pinned,
}: {
  children: ReactNode;
  labels: { mute: string; pin: string; unmute: string; unpin: string };
  muted: boolean;
  onMute: () => void;
  onPin: () => void;
  pinned: boolean;
}) {
  const swipe = useRowSwipe({ enabled: true, onFavorite: onMute, onQueue: onPin });
  const pinLabel = pinned ? labels.unpin : labels.pin;
  const muteLabel = muted ? labels.unmute : labels.mute;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  // Позицию держим и при закрытии: пока меню гаснет анимацией, оно остаётся на месте.
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  // Меню закрывается по любому клику, прокрутке, Esc и смене размера окна.
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  return (
    <div
      className="relative"
      onContextMenu={(event) => {
        event.preventDefault();
        // Не даём меню уйти за край окна (ширина ~224, высота ~112).
        const position = { x: Math.min(event.clientX, window.innerWidth - 232), y: Math.min(event.clientY, window.innerHeight - 124) };
        setLastPosition(position);
        setMenu(position);
      }}
    >
      {/* Подложки под строкой (телефон): справа открывается «закрепить», слева — «звук». */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
        <div data-swipe-side="queue" className="track-swipe-side bg-purple-500/25 duration-200 data-[armed]:bg-purple-500/50">
          <span className="track-swipe-icon absolute inset-y-0 left-0 flex w-20 items-center justify-center">
            <span className="text-white"><PinIcon off={pinned} className="h-7 w-7" /></span>
          </span>
        </div>
        <div data-swipe-side="favorite" className="track-swipe-side bg-sky-500/25 duration-200 data-[armed]:bg-sky-500/50">
          <span className="track-swipe-icon absolute inset-y-0 right-0 flex w-20 items-center justify-center text-white">
            {muted ? <Icon name="IC-notification" className="h-7 w-7 fill-white" /> : <MutedBell className="h-7 w-7" />}
          </span>
        </div>
      </div>

      <div
        {...swipe.handlers}
        // Сразу после жеста нажатие по строке не должно открывать чат.
        onClickCapture={(event) => {
          if (!swipe.wasSwipe()) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        className="relative touch-pan-y"
      >
        {children}
      </div>

      {typeof document !== 'undefined'
        ? createPortal(
          <AnimatePresence>
            {menu ? (
              <motion.div
                key="dialog-context-menu"
                role="menu"
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                className="glass-menu fixed z-[10000] flex w-56 origin-top-left flex-col gap-1.5 rounded-3xl border border-zinc-600/30 p-1.5 shadow-2xl shadow-black/60"
                style={{ left: lastPosition.x, top: lastPosition.y }}
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenu(null); onPin(); }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-left text-white duration-300 hover:bg-white/10 active:scale-95"
                >
                  <PinIcon off={pinned} className="h-5 w-5" />
                  {pinLabel}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenu(null); onMute(); }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-left text-white duration-300 hover:bg-white/10 active:scale-95"
                >
                  {muted ? <Icon name="IC-notification" className="h-5 w-5 shrink-0 fill-current" /> : <MutedBell className="h-5 w-5" />}
                  {muteLabel}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
        : null}
    </div>
  );
}
