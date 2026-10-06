'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Icon from '../components/svg-icon';
import { useSanitizedHtml } from '../lib/use-sanitized-html';

type NoteType = 'success' | 'error' | 'warning' | 'info';

/** Расстояние между карточками в развёрнутом списке. */
const GAP_PX = 8;
/** Больше стольких уведомлений — собираются в стопку (как на iOS); меньше — обычный список. */
const STACK_THRESHOLD = 3;
/** Сколько карточек видно в стопке (остальные прячутся за ними) и на сколько каждая выглядывает. */
const STACK_VISIBLE = 3;
const STACK_PEEK_PX = 12;
const MAX_NOTES = 12;
const CLOSE_MS = 420;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Свайп в сторону: порог закрытия и «щелчок» по скорости. */
const SWIPE_DISMISS_PX = 80;
const SWIPE_FLING_PX_MS = 0.6;

/** Значок типа уведомления: иконка и цвет круга. */
const NOTE_TONES: Record<NoteType, { icon: string; badge: string }> = {
  success: { icon: 'IC-check-bold', badge: 'bg-emerald-500' },
  error: { icon: 'IC-error-circle', badge: 'bg-red-500' },
  warning: { icon: 'IC-warning-triangle', badge: 'bg-amber-500' },
  info: { icon: 'IC-info-outline', badge: 'bg-zinc-600' },
};

interface Note {
  id: number;
  content: React.ReactNode;
  html?: boolean;
  type: NoteType;
  time?: number; // в секундах
}

interface NotificationContextType {
  showNote: (note: Omit<Note, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

type ToastLayout = {
  /** 0 — самое новое (сверху) */
  index: number;
  /** Сдвиг по вертикали и масштаб слота */
  y: number;
  scale: number;
  opacity: number;
  /** В стопке карточки позади обрезаются по высоте передней */
  clipHeight?: number;
  clipWidth?: number;
  closing: boolean;
  /** Стопка свёрнута: тап/клик сначала раскрывает её */
  collapsed: boolean;
  paused: boolean;
};

type NotificationToastProps = {
  note: Note;
  layout: ToastLayout;
  onClose: (id: number) => void;
  onExpand: () => void;
  onHeight: (id: number, height: number, width: number) => void;
};

const NotificationToast = ({ note, layout, onClose, onExpand, onHeight }: NotificationToastProps) => {
  const [entered, setEntered] = useState(false);
  // Закрыто свайпом: карточка уже улетает в сторону жеста, слот в свою сторону не двигаем.
  const [swiped, setSwiped] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; at: number; startX: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const noteHtmlProps = useSanitizedHtml(note.html && typeof note.content === 'string' ? note.content : '', true);

  // Появление: один кадр в начальном положении, затем в своё.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Высота карточки нужна провайдеру для раскладки.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const report = () => {
      // offset*, а не getBoundingClientRect: размеры без учёта scale/translate из анимации (иначе раскладка «плывёт»).
      onHeight(note.id, el.offsetHeight, el.offsetWidth);
    };
    report();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [note.id, onHeight]);

  // Автозакрытие; пока стопка раскрыта/под курсором — на паузе, потом отсчёт заново.
  useEffect(() => {
    const lifetime = note.time ?? 0;
    if (lifetime <= 0 || layout.paused || layout.closing) return undefined;
    const timer = window.setTimeout(() => onClose(note.id), lifetime * 1000);
    return () => window.clearTimeout(timer);
  }, [layout.closing, layout.paused, note.id, note.time, onClose]);

  const tone = NOTE_TONES[note.type];
  // Карточка с собственным аватаром (rich) приходит узлом — значок типа ей не нужен.
  const showBadge = typeof note.content === 'string';

  const setSwipe = (x: number, animate: boolean) => {
    const el = swipeRef.current;
    if (!el) return;
    el.style.transition = animate ? `transform 280ms ${EASE}, opacity 280ms ${EASE}` : 'none';
    el.style.transform = `translate3d(${x}px, 0, 0)`;
    // Улетая за край экрана, карточка не тускнеет (уезжает целиком); при обычном перетаскивании чуть бледнеет.
    el.style.opacity = animate && Math.abs(x) > 300 ? '1' : String(Math.max(0.35, 1 - Math.abs(x) / 400));
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (layout.closing || (event.target as HTMLElement).closest('[data-toast-close]')) return;
    dragRef.current = { x: event.clientX, startX: event.clientX, at: performance.now(), moved: false };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    if (drag.moved) setSwipe(dx, false);
  };
  const onPointerEnd = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    const dx = event.clientX - drag.startX;
    const speed = Math.abs(dx) / Math.max(1, performance.now() - drag.at);
    if (event.type === 'pointerup' && (Math.abs(dx) > SWIPE_DISMISS_PX || speed > SWIPE_FLING_PX_MS)) {
      setSwipe(Math.sign(dx) * (window.innerWidth + 40), true);
      setSwiped(true);
      onClose(note.id);
    } else {
      setSwipe(0, true);
    }
  };

  // До появления и при закрытии — «сверху справа»; закрывающаяся карточка уходит вправо.
  const hidden = !entered;
  const slotStyle: React.CSSProperties = {
    transform: hidden
      ? `translate3d(0, ${layout.y - 18}px, 0) scale(0.94)`
      : layout.closing && !swiped
        ? `translate3d(calc(100vw + 40px), ${layout.y}px, 0) scale(${layout.scale})`
        : `translate3d(0, ${layout.y}px, 0) scale(${layout.scale})`,
    // Закрывающаяся карточка улетает за правый край целиком и не гаснет по дороге; исчезает уже вне экрана.
    opacity: hidden ? 0 : layout.closing && swiped ? 0 : layout.opacity,
    zIndex: 100 - layout.index,
    height: layout.clipHeight !== undefined ? `${layout.clipHeight}px` : undefined,
    overflow: layout.clipHeight !== undefined ? 'hidden' : undefined,
    // Карточки позади в стопке темнее — читается глубина.
    filter: layout.collapsed && layout.index > 0 ? `brightness(${1 - layout.index * 0.18})` : undefined,
    transformOrigin: '50% 0',
    transition: layout.closing
      ? `transform ${CLOSE_MS}ms cubic-bezier(0.5, 0, 0.9, 0.5), opacity 120ms ease ${swiped ? 200 : CLOSE_MS}ms`
      : `transform ${CLOSE_MS}ms ${EASE}, opacity 320ms ${EASE}, filter 320ms ${EASE}`,
    pointerEvents: layout.closing ? 'none' : 'auto',
    willChange: 'transform, opacity',
    paddingBottom: layout.clipHeight !== undefined ? undefined : `${GAP_PX}px`,
  };

  return (
    <div
      className="absolute inset-x-0 top-0 motion-reduce:!transition-none"
      style={slotStyle}
      onClickCapture={(event) => {
        // Свёрнутая стопка: сначала раскрываем (на телефоне — тапом), действие уведомления не срабатывает.
        if (suppressClickRef.current) {
          event.stopPropagation();
          event.preventDefault();
        } else if (layout.collapsed) {
          event.stopPropagation();
          event.preventDefault();
          onExpand();
        }
      }}
    >
      <div ref={swipeRef} className="touch-pan-y select-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
        <div
          ref={cardRef}
          className={`pointer-events-auto flex w-full min-w-0 items-center gap-3 rounded-3xl border border-zinc-600/30 p-3 text-zinc-100 shadow-xl duration-300 glass-panel [--glass-tint:var(--color-zinc-900)] [--glass-blur:0px] [--glass-alpha:1] ${layout.collapsed && layout.index > 0 ? '[&>*]:invisible' : ''}`}
          role="status"
        >
          {showBadge ? (
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.badge}`}>
              <Icon name={tone.icon} className="h-5 w-5 fill-white" />
            </span>
          ) : null}
          {note.html && typeof note.content === 'string' ? (
            <span
              className="min-w-0 flex-1 break-words text-sm font-medium leading-tight sm:text-base [&_a]:underline [&_a]:underline-offset-2"
              dangerouslySetInnerHTML={noteHtmlProps}
            />
          ) : (
            <span className="min-w-0 flex-1 break-words text-sm font-medium leading-tight sm:text-base">
              {note.content}
            </span>
          )}
          <button
            type="button"
            data-toast-close
            aria-label="Close"
            onClick={() => onClose(note.id)}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-60 duration-300 hover:opacity-100 active:scale-95 pointer-coarse:hidden"
          >
            <Icon name="IC-times" className="h-5 w-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [closingIds, setClosingIds] = useState<number[]>([]);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const [widths, setWidths] = useState<Record<number, number>>({});
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leaveTimerRef = useRef<number | undefined>(undefined);
  const notesRef = useRef<Note[]>([]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    // Классический client-mount флаг: SSR-рендер и первый клиентский должны отличаться, иначе гидратация ломается.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const showNote = useCallback(({ content, html = false, type = 'info', time = 5 }: Omit<Note, 'id'>) => {
    const id = Date.now() + Math.random();
    setNotes((prev) => [...prev, { id, content, html, type, time }].slice(-MAX_NOTES));
  }, []);

  const removeNote = useCallback((id: number) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    setClosingIds((prev) => prev.filter((value) => value !== id));
    setHeights((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const closeNote = useCallback((id: number) => {
    setClosingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (notesRef.current.length <= 1) setExpanded(false);
    window.setTimeout(() => removeNote(id), CLOSE_MS);
  }, [removeNote]);

  const clearAll = useCallback(() => {
    notesRef.current.forEach((note) => closeNote(note.id));
  }, [closeNote]);

  const reportHeight = useCallback((id: number, height: number, width: number) => {
    setHeights((prev) => (Math.abs((prev[id] ?? 0) - height) < 0.5 ? prev : { ...prev, [id]: height }));
    setWidths((prev) => (Math.abs((prev[id] ?? 0) - width) < 0.5 ? prev : { ...prev, [id]: width }));
  }, []);

  // Свежие сверху. Закрывающиеся остаются в раскладке до удаления (уходят анимацией на месте).
  const ordered = useMemo(() => [...notes].reverse(), [notes]);
  const liveCount = ordered.length - closingIds.length;
  const isStack = liveCount > STACK_THRESHOLD;
  const collapsed = isStack && !expanded;

  const frontHeight = heights[ordered[0]?.id ?? 0] ?? 0;
  const frontWidth = widths[ordered[0]?.id ?? 0] ?? 0;
  const layouts = useMemo(() => {
    // Верхняя граница каждой карточки в развёрнутом списке (накопленная высота предыдущих).
    const tops = ordered.map((_, index) => ordered.slice(0, index).reduce((sum, item) => (closingIds.includes(item.id) ? sum : sum + (heights[item.id] ?? 0) + GAP_PX), 0));
    return ordered.map((note, index): ToastLayout => {
      const closing = closingIds.includes(note.id);
      if (collapsed) {
        const depth = Math.min(index, STACK_VISIBLE);
        return {
          index,
          y: Math.min(index, STACK_VISIBLE - 1) * STACK_PEEK_PX,
          scale: 1 - depth * 0.05,
          opacity: index < STACK_VISIBLE ? 1 : 0,
          clipHeight: index === 0 ? undefined : frontHeight,
          clipWidth: index === 0 ? undefined : frontWidth,
          closing,
          collapsed: true,
          paused: false,
        };
      }
      return { index, y: tops[index], scale: 1, opacity: 1, closing, collapsed: false, paused: isStack };
    });
  }, [closingIds, collapsed, frontHeight, frontWidth, heights, isStack, ordered]);

  const expandedHeight = ordered.reduce((sum, note) => sum + (heights[note.id] ?? 0) + GAP_PX, 0);

  // Мышь: раскрытие по наведению, сворачивание с небольшой задержкой (чтобы не мигало на границах).
  const onPointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(leaveTimerRef.current);
    setExpanded(true);
  };
  const onPointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => setExpanded(false), 180);
  };

  // Телефон: тап вне стопки сворачивает её.
  useEffect(() => {
    if (!expanded) return undefined;
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (!containerRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [expanded]);

  const contextValue = useMemo(() => ({ showNote }), [showNote]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {mounted
        ? createPortal(
            <div
              ref={containerRef}
              className="pointer-events-none fixed left-3 right-3 top-3 z-[10010] sm:left-auto sm:w-96"
              aria-live="polite"
              aria-atomic="false"
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
            >
              {ordered.map((note, index) => (
                <NotificationToast
                  key={note.id}
                  note={note}
                  layout={layouts[index]}
                  onClose={closeNote}
                  onExpand={() => setExpanded(true)}
                  onHeight={reportHeight}
                />
              ))}
              {isStack && expanded ? (
                <button
                  type="button"
                  aria-label="Clear all"
                  data-tip="Clear all"
                  onClick={clearAll}
                  className="pointer-events-auto absolute right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 text-zinc-100 duration-300 glass-panel [--glass-tint:var(--color-zinc-900)] [--glass-alpha:0.85] active:scale-95"
                  style={{ top: `${expandedHeight}px`, transition: `top ${CLOSE_MS}ms ${EASE}` }}
                >
                  <Icon name="IC-times" className="h-5 w-5 fill-current" />
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
