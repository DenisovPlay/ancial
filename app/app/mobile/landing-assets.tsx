import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../lib/cn';

/**
 * Нарисованные для лендинга стикеры: плоские формы с белой «вырубной» обводкой, как наклейки на тёмном фоне.
 * Инлайн-SVG — шрифт страницы подхватывается сам, лишних запросов нет.
 */
const STROKE = { stroke: '#fff', strokeLinejoin: 'round', strokeLinecap: 'round', strokeWidth: 9 } as const;

interface StickerProps {
  className?: string;
  style?: CSSProperties;
}

export function CoinSticker({ className, style }: StickerProps) {
  return (
    <svg viewBox="0 0 130 124" className={className} style={style} aria-hidden="true">
      <ellipse cx="68" cy="68" rx="48" ry="44" fill="#4c1d95" {...STROKE} />
      <ellipse cx="60" cy="58" rx="48" ry="44" fill="#a855f7" {...STROKE} />
      <ellipse cx="60" cy="58" rx="35" ry="32" fill="none" stroke="#6d28d9" strokeWidth="4" />
      <text x="60" y="76" textAnchor="middle" fontSize="52" fontWeight="900" fill="#fff" stroke="#2e1065" strokeWidth="4" paintOrder="stroke" fontStyle="italic" fontFamily="inherit">Z</text>
      <path d="M22 26l5 9 9 5-9 5-5 9-5-9-9-5 9-5z" fill="#fff" />
    </svg>
  );
}

export function BubbleSticker({ className, style }: StickerProps) {
  return (
    <svg viewBox="0 0 130 112" className={className} style={style} aria-hidden="true">
      <path d="M36 14h58a26 26 0 0 1 26 26v22a26 26 0 0 1-26 26H66l-26 20 4-20h-8A26 26 0 0 1 10 62V40a26 26 0 0 1 26-26z" fill="#bef264" {...STROKE} />
      <circle cx="42" cy="51" r="7" fill="#111" />
      <circle cx="65" cy="51" r="7" fill="#111" />
      <circle cx="88" cy="51" r="7" fill="#111" />
    </svg>
  );
}

export function DiscSticker({ className, style }: StickerProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="#18181b" {...STROKE} />
      <circle cx="60" cy="60" r="40" fill="none" stroke="#3f3f46" strokeWidth="2" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="#3f3f46" strokeWidth="2" />
      <circle cx="60" cy="60" r="20" fill="#a855f7" />
      <circle cx="60" cy="60" r="5" fill="#18181b" />
      <path d="M92 36a44 44 0 0 1 8 20" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function HeartSticker({ className, style }: StickerProps) {
  return (
    <svg viewBox="0 0 120 108" className={className} style={style} aria-hidden="true">
      <path d="M60 98C22 70 10 52 10 34a24 24 0 0 1 50-6 24 24 0 0 1 50 6c0 18-12 36-50 64z" fill="#f472b6" {...STROKE} />
      <path d="M28 32c0-6 4-10 10-10" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export function BoltSticker({ className, style }: StickerProps) {
  return (
    <svg viewBox="0 0 96 124" className={className} style={style} aria-hidden="true">
      <path d="M58 8 14 70h28l-6 46 46-66H54z" fill="#fcd34d" {...STROKE} />
    </svg>
  );
}

export function PlaneSticker({ className, style }: StickerProps) {
  return (
    <svg viewBox="0 0 128 112" className={className} style={style} aria-hidden="true">
      <path d="M118 12 10 52l36 14 14 36z" fill="#fff" {...STROKE} />
      <path d="M118 12 46 66l4 30 20-26z" fill="#c4b5fd" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
      <path d="M46 66 118 12" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function SparkSticker({ className, style }: StickerProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden="true">
      <path d="M32 2c3 18 12 27 30 30-18 3-27 12-30 30-3-18-12-27-30-30 18-3 27-12 30-30z" fill="currentColor" />
    </svg>
  );
}

/** Стикер, плавающий на месте: позиция и наклон задаются снаружи. */
export function Floating({
  children,
  className,
  delay = 0,
  rotate = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  rotate?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('lp-float pointer-events-none absolute select-none drop-shadow-[0_14px_24px_rgba(0,0,0,0.55)]', className)}
      style={{ ['--lp-rot' as string]: `${rotate}deg`, animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/** Бегущая строка: контент дублируется, лента сдвигается ровно на половину. */
export function Marquee({ items, className, itemClassName }: { items: string[]; className?: string; itemClassName?: string }) {
  const row = [...items, ...items];
  return (
    <div className={cn('relative w-full overflow-hidden', className)} aria-hidden="true">
      <div className="lp-marquee flex w-max items-center whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {row.map((item, index) => (
              <span key={`${copy}-${index}`} className={cn('flex items-center', itemClassName)}>
                {item}
                <SparkSticker className="mx-[0.9em] h-[0.7em] w-[0.7em] shrink-0" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
