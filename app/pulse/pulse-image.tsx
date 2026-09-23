'use client';

import { cn } from '../lib/cn';
import AppImage from '../components/app-image';

const DEFAULT_PULSE_COVER = '/img/pulse/track.png';

export const PULSE_COVER_IMAGE_SIZES = {
  hero: '(max-width: 1023px) 18rem, 24rem',
  miniPlayer: '(max-width: 1023px) 3.5rem, 4rem',
  modal: '4rem',
  playerFull: '(max-width: 1023px) 20rem, 24rem',
  playlistPill: '(max-width: 1279px) 3.5rem, (max-width: 1535px) 4rem, 5rem',
  playlistTile: '(max-width: 1023px) 8rem, 12rem',
  playlistTileBig: '(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw',
  trackRow: '4rem',
} as const;

function normalizePulseImageSrc(src: string | null | undefined, fallback: string) {
  const nextSrc = String(src ?? '').trim();
  if (!nextSrc) return fallback;
  if (nextSrc.startsWith('//')) return `https:${nextSrc}`;
  return nextSrc;
}

export function PulseCoverImage({
  alt,
  className,
  fallback = DEFAULT_PULSE_COVER,
  sizes,
  src,
}: {
  alt: string;
  className?: string;
  fallback?: string;
  sizes: string;
  src: string | null | undefined;
}) {
  return (
    <AppImage
      fill
      sizes={sizes}
      src={normalizePulseImageSrc(src, fallback)}
      fallbackSrc={fallback}
      alt={alt}
      draggable={false}
      className={cn('object-cover select-none pointer-events-none', className)}
    />
  );
}
