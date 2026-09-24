'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '../lib/cn';
import { useAppearanceMotion } from '../lib/use-appearance';

/** Первое наведение — с задержкой, чтобы подсказки не мелькали, пока курсор просто едет мимо. */
const SHOW_DELAY_MS = 300;
/** Пока подсказка видна или только что скрылась, следующая перетекает к новому элементу без задержки. */
const WARM_MS = 400;
/** Отступ от элемента. */
const GAP = 4;
/** Отступ от краёв окна. */
const EDGE = 8;
const TIP_SELECTOR = '[data-tip], [data-sticker]';
const PILL_CLASS = 'whitespace-nowrap rounded-full border border-zinc-600/30 px-2 py-0.5 text-[11px] leading-4';

/** Текст подсказки: явный data-tip; у стикеров (посты, сообщения, редактор) — их :код:. */
function getTipText(el: Element): string | null {
  const tip = el.getAttribute('data-tip');
  if (tip) return tip;
  const sticker = el.getAttribute('data-sticker');
  return sticker ? `:${sticker}:` : null;
}

type Tip = { rect: DOMRect; text: string };

/**
 * Единые подсказки для всего сайта: галочки, бейджи, стикеры — любой элемент с data-tip="…".
 * Один делегированный слушатель на document (работает и для HTML-строк постов), один узел поверх всего:
 * position: fixed, выше модалок — панели и overflow контейнеров его не обрезают.
 * Появление и скрытие — плавные; между соседними элементами одна «пилюля» переезжает и меняет ширину.
 * Только мышь и клавиатура: на тач-экранах наведения нет, а долгий тап у стикеров уже занят.
 */
export default function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  /** Была ли подсказка на экране к моменту новой позиции — тогда переезжаем, а не прыгаем. */
  const shownRef = useRef(false);
  // «Интерфейс → Анимации → Подсказки: мгновенно» — без задержки и без анимаций.
  const instant = useAppearanceMotion().tooltips === 'instant';
  const instantRef = useRef(instant);
  useEffect(() => {
    instantRef.current = instant;
  }, [instant]);

  useEffect(() => {
    let timer = 0;
    let current: Element | null = null;
    let visible = false;
    let hiddenAt = 0;

    const hide = () => {
      window.clearTimeout(timer);
      if (visible) hiddenAt = performance.now();
      visible = false;
      current = null;
      // Текст и позиция остаются — подсказка догасает на месте.
      setOpen(false);
    };

    const show = (el: Element, immediate: boolean) => {
      const text = getTipText(el);
      if (!text) return;
      window.clearTimeout(timer);
      current = el;
      const warm = visible || performance.now() - hiddenAt < WARM_MS;
      timer = window.setTimeout(() => {
        if (current !== el || !el.isConnected) return;
        visible = true;
        setTip({ rect: el.getBoundingClientRect(), text });
        setOpen(true);
      }, immediate || warm || instantRef.current ? 0 : SHOW_DELAY_MS);
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const el = event.target instanceof Element ? event.target.closest(TIP_SELECTOR) : null;
      if (el === current) return;
      if (el) show(el, false);
      else hide();
    };

    const onPointerOut = (event: PointerEvent) => {
      // Курсор ушёл за пределы окна.
      if (!event.relatedTarget) hide();
    };

    const onFocusIn = (event: FocusEvent) => {
      const el = event.target instanceof Element ? event.target.closest(TIP_SELECTOR) : null;
      if (el && el.matches(':focus-visible')) show(el, true);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', hide);
    window.addEventListener('resize', hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('scroll', hide, true);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', hide);
      window.removeEventListener('resize', hide);
    };
  }, []);

  // Позиция и ширина — до отрисовки. Над элементом, а если сверху нет места — под ним; по ширине — в пределах окна.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const pill = pillRef.current;
    const measure = measureRef.current;
    if (!tip || !box || !pill || !measure) return;

    const { width, height } = measure.getBoundingClientRect();
    const above = tip.rect.top - height - GAP;
    const top = above >= EDGE ? above : tip.rect.bottom + GAP;
    const left = Math.min(
      Math.max(EDGE, tip.rect.left + tip.rect.width / 2 - width / 2),
      window.innerWidth - width - EDGE,
    );

    // Первое появление — сразу на месте; дальше — переезд и смена ширины.
    const move = shownRef.current && !instant ? 'transform 200ms cubic-bezier(0.2, 0, 0, 1)' : 'none';
    box.style.transition = move;
    // scale-* в Tailwind 4 — отдельное CSS-свойство scale, а не transform.
    pill.style.transition = instant
      ? 'none'
      : shownRef.current
        ? 'width 200ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms ease-out, scale 150ms ease-out'
        : 'opacity 150ms ease-out, scale 150ms ease-out';
    box.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    pill.style.width = `${Math.ceil(width)}px`;
    pill.style.transformOrigin = above >= EDGE ? 'bottom center' : 'top center';

    if (!shownRef.current && !instant) {
      // Первый показ: узел только что смонтирован уже «открытым» — стартуем из скрытого состояния,
      // иначе переходу не из чего анимироваться.
      pill.style.opacity = '0';
      pill.style.scale = '0.95';
      void pill.offsetWidth;
      pill.style.opacity = '';
      pill.style.scale = '';
    }
  }, [tip, instant]);

  // «Была на экране» — с задержкой на время скрытия: пока догасает, новая подсказка переезжает, а не прыгает.
  useEffect(() => {
    if (open) {
      shownRef.current = true;
      return undefined;
    }
    const timer = window.setTimeout(() => {
      shownRef.current = false;
    }, WARM_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!tip) return null;

  return (
    <div ref={boxRef} role="tooltip" aria-hidden={!open} className="pointer-events-none fixed left-0 top-0 z-[10000]">
      {/* Невидимый двойник с тем же текстом — по нему меряем ширину новой подсказки. */}
      <span ref={measureRef} className={cn(PILL_CLASS, 'invisible absolute left-0 top-0')}>
        {tip.text}
      </span>
      <div
        ref={pillRef}
        className={cn(
          PILL_CLASS,
          'glass-tooltip overflow-hidden text-center text-zinc-100 shadow',
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
      >
        {tip.text}
      </div>
    </div>
  );
}
