'use client';
/* eslint-disable @next/next/no-img-element */

import Image from 'next/image';

const DEFAULT_PULSE_COVER = '/includes/img/pulse/track.png';
const NEXT_IMAGE_REMOTE_HOSTS = new Set([
  'ancial.ru',
  'cdn.betterttv.net',
  'i.ibb.co',
  'i.imgur.com',
]);

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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function normalizePulseImageSrc(src: string | null | undefined, fallback: string) {
  const nextSrc = String(src ?? '').trim();
  if (!nextSrc) return fallback;
  if (nextSrc.startsWith('//')) return `https:${nextSrc}`;

  try {
    const url = new URL(nextSrc);
    if (url.protocol === 'http:' && NEXT_IMAGE_REMOTE_HOSTS.has(url.hostname)) {
      url.protocol = 'https:';
      return url.toString();
    }
  } catch {
    // Local paths and non-URL values are handled below.
  }

  return nextSrc;
}

function canUseNextImage(src: string) {
  if (src.startsWith('/')) return true;

  try {
    const url = new URL(src);
    return url.protocol === 'https:' && NEXT_IMAGE_REMOTE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
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
  const imageSrc = normalizePulseImageSrc(src, fallback);

  if (!canUseNextImage(imageSrc)) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        className={cn('absolute inset-0 h-full w-full object-cover', className)}
      />
    );
  }

  return (
    <Image
      alt={alt}
      className={cn('object-cover', className)}
      fill
      sizes={sizes}
      src={imageSrc}
    />
  );
}
