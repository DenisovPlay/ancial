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
    <div className="absolute top-3 z-[20] flex w-full items-center px-3">
      <button type="button" onClick={onClose} className="cursor-pointer duration-300 active:scale-95">
        <Icon name="IC-times" className="h-10 w-10 fill-white" />
      </button>

      <div className="flex flex-grow flex-col items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={onOpenAlbum}
          className={cn(
            'text-center text-sm text-white duration-300 lg:text-base',
            canOpenAlbum && 'cursor-pointer active:scale-95 hover:text-zinc-300',
          )}
        >
          {albumLabel}
        </button>
        <Image
          alt="Pulse Logo"
          className="w-24 shrink-0 backdrop-shadow-lg"
          height={96}
          src="/img/branding/pulse.svg"
          width={96}
        />
      </div>

      <button type="button" onClick={onMinimize} className="cursor-pointer duration-300 hover:fill-zinc-300 active:scale-95">
        <Icon name="IC-chevron-down" className="h-10 w-10 fill-white" />
      </button>
    </div>
  );
}
