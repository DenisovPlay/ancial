'use client';

import React from 'react';
import Modal from '../../components/modal';
import type { PulseTrack } from '../../context/PulsePlayerContext';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import { getTrackArtwork, cn } from './player-utils';

type PulseQueueModalProps = {
  isOpen: boolean;
  onClose: () => void;
  playlist: PulseTrack[];
  currentIndex: number;
  isRadioMode?: boolean;
  radioSeedName?: string;
  lang?: Record<string, string> | null;
  onPlayTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onMoveTrack: (fromIndex: number, toIndex: number) => void;
};

export function PulseQueueModal({
  isOpen,
  onClose,
  playlist,
  currentIndex,
  isRadioMode,
  radioSeedName,
  lang,
  onPlayTrack,
  onRemoveTrack,
  onMoveTrack,
}: PulseQueueModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang?.pulse_queue_title || 'Очередь воспроизведения'}
      width="md"
    >
      <div className="flex flex-col gap-3 pb-2">
        {/* Empty state */}
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400">
            <svg className="h-12 w-12 fill-zinc-600 mb-2" viewBox="0 0 48 48">
              <use href="#IC-list-ul" />
            </svg>
            <p className="text-sm font-medium">{lang?.pulse_queue_empty || 'Очередь воспроизведения пуста'}</p>
          </div>
        ) : null}

        {/* Track List */}
        <div className="flex flex-col gap-2">
          {playlist.map((track, i) => {
            const isCurrent = i === currentIndex;
            const title = track.title || lang?.pulse_unknown_track || 'Неизвестный трек';
            const artist = track.artist || lang?.pulse_unknown_artist || 'Неизвестный исполнитель';
            const artwork = getTrackArtwork(track);

            return (
              <div
                key={`${track.sid || i}-${i}`}
                className={cn(
                  'group flex items-center justify-between gap-3 hover:pr-1.5 rounded-3xl overflow-hidden transition-all duration-200',
                  isCurrent
                    ? 'bg-purple-500/20 ring ring-purple-500/30'
                    : 'bg-zinc-800/40 hover:bg-zinc-800/80',
                )}
              >
                {/* Track info & play trigger */}
                <div
                  onClick={() => onPlayTrack(i)}
                  className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-3xl bg-zinc-900">
                    <PulseCoverImage
                      alt={title}
                      className="h-full w-full object-cover"
                      sizes={PULSE_COVER_IMAGE_SIZES.miniPlayer}
                      src={artwork}
                    />
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        'truncate text-sm font-semibold',
                        isCurrent ? 'text-purple-300 font-bold' : 'text-white',
                      )}
                    >
                      {title}
                    </span>
                    <span className="truncate text-xs text-zinc-400">{artist}</span>
                  </div>
                </div>

                {/* Queue reorder / removal actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveTrack(i, i - 1);
                    }}
                    title={lang?.pulse_queue_move_up || 'Переместить выше'}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-3xl transition-all duration-200 active:scale-95',
                      i === 0
                        ? 'opacity-20 cursor-not-allowed'
                        : 'text-zinc-300 hover:bg-zinc-700/60 hover:text-white cursor-pointer',
                    )}
                  >
                    <svg className="h-5 w-5 fill-current rotate-180" viewBox="0 0 48 48">
                      <use href="#IC-chevron-down" />
                    </svg>
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={i === playlist.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveTrack(i, i + 1);
                    }}
                    title={lang?.pulse_queue_move_down || 'Переместить ниже'}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-3xl transition-all duration-200 active:scale-95',
                      i === playlist.length - 1
                        ? 'opacity-20 cursor-not-allowed'
                        : 'text-zinc-300 hover:bg-zinc-700/60 hover:text-white cursor-pointer',
                    )}
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 48 48">
                      <use href="#IC-chevron-down" />
                    </svg>
                  </button>

                  {/* Remove from queue */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(i);
                    }}
                    title={lang?.pulse_queue_remove || 'Удалить из очереди'}
                    className="flex h-8 w-8 items-center justify-center rounded-3xl text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400 transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 48 48">
                      <use href="#IC-trash" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
