'use client';

import type { ComponentType } from 'react';
import Image from 'next/image';

import { cn } from './player-utils';

type PlayerIcon = ComponentType<{ className?: string; name: string }>;

type PulsePlayerFullHeaderProps = {
  Icon: PlayerIcon;
  albumLabel: string;
  canOpenAlbum: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onOpenAlbum: () => void;
};

/** Full-player header presentation. Navigation and player lifecycle remain provider-owned. */
export function PulsePlayerFullHeader({
  Icon,
  albumLabel,
  canOpenAlbum,
  onClose,
  onMinimize,
  onOpenAlbum,
}: PulsePlayerFullHeaderProps) {
  return (
    <div className="absolute top-3 z-[20] flex w-full items-center gap-3 px-3">
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 active:scale-95 hover:border-zinc-600/30 hover:bg-white/10"
      >
        <Icon name="IC-times" className="h-6 w-6 fill-white" />
      </button>

      <div className="flex min-w-0 flex-grow flex-col items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={onOpenAlbum}
          className={cn(
            'max-w-full truncate text-center text-xs text-zinc-400 duration-300 lg:text-sm',
            canOpenAlbum && 'cursor-pointer active:scale-95 hover:text-white',
          )}
        >
          {albumLabel}
        </button>
        <Image
          alt="Pulse Logo"
          className="w-20 shrink-0 backdrop-shadow-lg lg:w-24"
          height={96}
          src="/img/branding/pulse.svg"
          width={96}
        />
      </div>

      <button
        type="button"
        onClick={onMinimize}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 active:scale-95 hover:border-zinc-600/30 hover:bg-white/10"
      >
        <Icon name="IC-chevron-down" className="h-6 w-6 fill-white" />
      </button>
    </div>
  );
}
