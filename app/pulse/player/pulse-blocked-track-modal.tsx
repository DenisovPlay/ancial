'use client';

import React from 'react';
import Modal from '../../components/modal';
import { useAuth } from '../../context/AuthContext';

type PulseBlockedTrackModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PulseBlockedTrackModal({
  isOpen,
  onClose,
}: PulseBlockedTrackModalProps) {
  const { lang } = useAuth();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang?.pulse_track_blocked_region_title || 'Трек недоступен в вашем регионе'}
      width="sm"
    >
      <div className="flex flex-col items-center justify-center text-center gap-3">
        <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
          <img
            src="/img/stickers/nerd.avif"
            alt="Nerd sticker"
            className="w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        </div>
        <p className="text-zinc-300 leading-relaxed font-medium">
          {lang?.pulse_track_blocked_region_desc || 'Так решил правообладатель или контролирующий орган вашей страны.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 duration-300 border border-zinc-600/30 text-white font-medium cursor-pointer"
        >
          {lang?.pulse_track_blocked_region_btn || 'Окей'}
        </button>
      </div>
    </Modal>
  );
}
