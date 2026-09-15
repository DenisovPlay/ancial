'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { cn } from '../lib/cn';

/** Скорость проезда: пикселей в секунду. */
const MARQUEE_PX_PER_SECOND = 30;
/** Пауза перед каждым проездом — чтобы текст успевали прочитать. */
const MARQUEE_PAUSE_MS = 2000;
/** Левое растворение: появляется, когда строка поехала, и уходит к остановке. */
const MARQUEE_FADE_PX = 12;
const MARQUEE_FADE_MS = 300;

/**
 * Строка, которая не обрезается: если текст шире места — стоит пару секунд, проезжает один круг
 * (копия догоняет оригинал, стык незаметен), снова стоит и едет. Края растворяются. Помещается — просто стоит.
 * Анимация через Web Animations API: доля паузы зависит от длины текста, а в @keyframes её переменной не задать.
 * Замер через ResizeObserver, без React-стейта. Контейнеру нужна определённая ширина (w-full или max-w-*).
 */
export default function MarqueeText({ children, className }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const itemRef = useRef<HTMLSpanElement | null>(null);
  const cloneRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    const item = itemRef.current;
    const clone = cloneRef.current;
    if (!container || !track || !item || !clone) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation: Animation | null = null;
    let fadeAnimation: Animation | null = null;
    let animationKey = '';

    const measure = () => {
      const isOverflowing = container.dataset.overflow === 'true';
      // В режиме ленты у копии есть зазор справа — вычитаем его, чтобы флаг не залипал.
      const gap = isOverflowing ? parseFloat(getComputedStyle(item).paddingRight) || 0 : 0;
      const overflow = item.scrollWidth - gap > container.clientWidth + 1;

      container.dataset.overflow = overflow ? 'true' : 'false';
      // Копию прячем атрибутом, а не только CSS: если стили не подтянулись, текст не должен двоиться.
      clone.hidden = !overflow;

      const shouldAnimate = overflow && !reducedMotion.matches;
      const nextKey = shouldAnimate ? String(item.scrollWidth) : '';
      if (nextKey === animationKey) return;

      animationKey = nextKey;
      animation?.cancel();
      fadeAnimation?.cancel();
      animation = null;
      fadeAnimation = null;
      if (!shouldAnimate) return;

      // Один круг = ширина копии с зазором (ровно -50% трека); сначала пауза, потом проезд.
      const travelMs = (item.scrollWidth / MARQUEE_PX_PER_SECOND) * 1000;
      const totalMs = MARQUEE_PAUSE_MS + travelMs;
      const pauseOffset = MARQUEE_PAUSE_MS / totalMs;
      const timing: KeyframeAnimationOptions = { duration: totalMs, iterations: Infinity, easing: 'linear' };

      animation = track.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: pauseOffset },
          { transform: 'translateX(-50%)', offset: 1 },
        ],
        timing,
      );

      // Левый край растворяется только в движении: на паузе текст стоит ровно, без «блюра» слева.
      // Та же длительность и старт — анимации идут синхронно. Нужен @property в globals.css.
      const fadeOffset = Math.min(MARQUEE_FADE_MS / totalMs, (1 - pauseOffset) / 3);
      fadeAnimation = container.animate(
        [
          { '--marquee-fade-left': '0px', offset: 0 },
          { '--marquee-fade-left': '0px', offset: pauseOffset },
          { '--marquee-fade-left': `${MARQUEE_FADE_PX}px`, offset: pauseOffset + fadeOffset },
          { '--marquee-fade-left': `${MARQUEE_FADE_PX}px`, offset: 1 - fadeOffset },
          { '--marquee-fade-left': '0px', offset: 1 },
        ],
        timing,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(item);
    reducedMotion.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', measure);
      animation?.cancel();
      fadeAnimation?.cancel();
    };
  }, []);

  return (
    <span ref={containerRef} className={cn('marquee-text block w-full min-w-0 overflow-hidden whitespace-nowrap', className)}>
      <span ref={trackRef} className="marquee-text-track inline-flex">
        <span ref={itemRef} className="marquee-text-item">
          {children}
        </span>
        <span ref={cloneRef} aria-hidden hidden className="marquee-text-item marquee-text-clone">
          {children}
        </span>
      </span>
    </span>
  );
}
