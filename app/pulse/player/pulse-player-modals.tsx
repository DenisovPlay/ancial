'use client';

import dynamic from 'next/dynamic';
import type { ComponentType, ReactNode } from 'react';

import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../pulse-image';
import { PulseModal } from '../pulse-modal';
import { cn } from '../pulse-components';
import type { PulsePlaylistOption } from './use-add-to-playlist';

const PulsePlaylistEditorModal = dynamic(() => import('../pulse-playlist-editor-modal'), { ssr: false });
const PulseEqualizerModal = dynamic(() => import('./pulse-equalizer-modal').then((m) => m.PulseEqualizerModal), { ssr: false });
const PulseBlockedTrackModal = dynamic(() => import('./pulse-blocked-track-modal').then((m) => m.PulseBlockedTrackModal), { ssr: false });

type PlayerIcon = ComponentType<{ className?: string; name: string }>;
type Notice = (notice: { content: ReactNode; time?: number; type?: 'error' | 'info' | 'success' }) => void;

type PulsePlayerModalsProps = {
  Icon: PlayerIcon;
  addToPlaylistSongId: number;
  canUseEqualizer: boolean;
  changeEqGain: (index: number, gain: number) => void;
  eqGains: number[];
  isAddToPlaylistOpen: boolean;
  isBlockedTrackModalOpen: boolean;
  isEqualizerOpen: boolean;
  isPlaylistEditorOpen: boolean;
  lang: Record<string, string> | null;
  notify: Notice;
  onOpenAddToPlaylist: (songId: number | string) => void;
  onResetEqualizer: () => void;
  playlistOptions: PulsePlaylistOption[];
  playlistOptionsLoading: boolean;
  setIsAddToPlaylistOpen: (isOpen: boolean) => void;
  setIsBlockedTrackModalOpen: (isOpen: boolean) => void;
  setIsEqualizerOpen: (isOpen: boolean) => void;
  setIsPlaylistEditorOpen: (isOpen: boolean) => void;
  toggleSongInPlaylist: (playlistId: string, hasSong: boolean) => Promise<void>;
};

/** Presentation-only modals owned by the Pulse player shell. */
export function PulsePlayerModals({
  Icon,
  addToPlaylistSongId,
  canUseEqualizer,
  changeEqGain,
  eqGains,
  isAddToPlaylistOpen,
  isBlockedTrackModalOpen,
  isEqualizerOpen,
  isPlaylistEditorOpen,
  lang,
  notify,
  onOpenAddToPlaylist,
  onResetEqualizer,
  playlistOptions,
  playlistOptionsLoading,
  setIsAddToPlaylistOpen,
  setIsBlockedTrackModalOpen,
  setIsEqualizerOpen,
  setIsPlaylistEditorOpen,
  toggleSongInPlaylist,
}: PulsePlayerModalsProps) {
  return (
    <>
      <PulseModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => setIsAddToPlaylistOpen(false)}
        scrollable
        title={lang?.add_to_playlist || 'В плейлист'}
      >
        <div className="flex flex-col gap-1">
          {playlistOptionsLoading ? (
            <div className="py-6 text-center text-sm text-zinc-400">
              {lang?.loading || 'Загрузка...'}
            </div>
          ) : null}

          {!playlistOptionsLoading && !playlistOptions.length ? (
            <div className="py-6 text-center text-sm text-zinc-500">
              {lang?.pulse_no_playlists || 'Нет плейлистов. Создайте новый!'}
            </div>
          ) : null}

          {!playlistOptionsLoading
            ? playlistOptions.map((playlistOption) => (
              <button
                key={playlistOption.id}
                type="button"
                onClick={() => { void toggleSongInPlaylist(playlistOption.id, playlistOption.hasSong); }}
                className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left duration-300 hover:bg-zinc-800/60 hover:pr-3 active:scale-95"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                  {playlistOption.image ? (
                    <PulseCoverImage
                      alt={playlistOption.name}
                      className="rounded-xl"
                      sizes={PULSE_COVER_IMAGE_SIZES.modal}
                      src={playlistOption.image}
                    />
                  ) : (
                    <Icon name="IC-music" className="h-7 w-7 fill-zinc-600" />
                  )}
                </div>

                <span className="flex-grow text-sm font-medium text-zinc-100">{playlistOption.name}</span>

                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 duration-300',
                    playlistOption.hasSong ? 'border-purple-500 bg-purple-500' : 'border-zinc-600',
                  )}
                >
                  {playlistOption.hasSong ? <Icon name="IC-check" className="h-3 w-3 fill-white" /> : null}
                </span>
              </button>
            ))
            : null}

          <button
            type="button"
            onClick={() => {
              setIsAddToPlaylistOpen(false);
              setIsPlaylistEditorOpen(true);
            }}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-zinc-300 duration-300 hover:bg-zinc-700 hover:text-white active:scale-95"
          >
            <Icon name="IC-plus" className="h-4 w-4 fill-current" />
            <span>{lang?.pulse_create_playlist || 'Создать новый плейлист'}</span>
          </button>
        </div>
      </PulseModal>

      <PulsePlaylistEditorModal
        isOpen={isPlaylistEditorOpen}
        onClose={() => {
          setIsPlaylistEditorOpen(false);
          if (addToPlaylistSongId) setIsAddToPlaylistOpen(true);
        }}
        onSaved={() => {
          if (addToPlaylistSongId) onOpenAddToPlaylist(addToPlaylistSongId);
        }}
        showNote={(content, type = 'info', time = 4) => notify({ content, type, time })}
      />

      {canUseEqualizer ? (
        <PulseEqualizerModal
          isOpen={isEqualizerOpen}
          onClose={() => setIsEqualizerOpen(false)}
          eqGains={eqGains}
          onGainChange={changeEqGain}
          onReset={onResetEqualizer}
        />
      ) : null}

      <PulseBlockedTrackModal
        isOpen={isBlockedTrackModalOpen}
        onClose={() => setIsBlockedTrackModalOpen(false)}
      />
    </>
  );
}
