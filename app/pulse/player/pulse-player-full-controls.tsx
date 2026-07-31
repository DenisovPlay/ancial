'use client';

import type { ComponentType } from 'react';

import { Dropdown, DropdownItem } from '../../components/navigation';
import { cn } from './player-utils';

type PlayerIcon = ComponentType<{ className?: string; name: string }>;
type OfflineSaveStatus = 'already' | 'error' | 'idle' | 'saved' | 'saving';

type PulsePlayerFullControlsProps = {
  Icon: PlayerIcon;
  activeLike: boolean;
  canUseEqualizer: boolean;
  isAuthenticated: boolean;
  isMobileDevice: boolean;
  isPlaying: boolean;
  lang: Record<string, string> | null;
  offlineSaveStatus: OfflineSaveStatus;
  onAddToPlaylist: () => void;
  onDownload: () => void;
  onLike: () => void;
  onNext: () => void;
  onOpenEqualizer: () => void;
  onPrev: () => void;
  onSaveOffline: () => Promise<void>;
  onTogglePlay: () => void;
};

/** Full-player control row. Commands remain owned by the player provider. */
export function PulsePlayerFullControls({
  Icon,
  activeLike,
  canUseEqualizer,
  isAuthenticated,
  isMobileDevice,
  isPlaying,
  lang,
  offlineSaveStatus,
  onAddToPlaylist,
  onDownload,
  onLike,
  onNext,
  onOpenEqualizer,
  onPrev,
  onSaveOffline,
  onTogglePlay,
}: PulsePlayerFullControlsProps) {
  return (
    <div className="flex w-full max-w-sm items-center justify-center">
      <div className="mt-3 flex items-center gap-3 duration-300 lg:gap-6">
        <div className="mr-6">
          {isAuthenticated && !isMobileDevice ? (
            <Dropdown
              position="top"
              align="start"
              triggerSize="sm"
              triggerNode={<Icon name="IC-more" className="h-9 w-9 fill-white duration-300 hover:fill-zinc-300" />}
              triggerClassName="block !h-auto !w-auto !bg-transparent !p-0 hover:!bg-transparent cursor-pointer duration-300 active:scale-95"
            >
              <DropdownItem onClick={onAddToPlaylist} icon="IC-plus">
                {lang?.add_to_playlist || 'В плейлист'}
              </DropdownItem>
              <DropdownItem icon="IC-download" onClick={onDownload}>
                {lang?.pulse_download_mp3 || 'Скачать MP3'}
              </DropdownItem>
              <DropdownItem
                icon={offlineSaveStatus === 'saved' || offlineSaveStatus === 'already' ? 'IC-bookmark-filled' : 'IC-bookmark'}
                onClick={() => { void onSaveOffline(); }}
              >
                {offlineSaveStatus === 'saving'
                  ? (lang?.pulse_saving_offline || 'Сохраняется...')
                  : offlineSaveStatus === 'saved'
                    ? (lang?.pulse_saved_offline || 'Сохранено!')
                    : offlineSaveStatus === 'already'
                      ? (lang?.pulse_already_saved_offline || 'Уже сохранено')
                      : (lang?.pulse_save_offline || 'Сохранить офлайн')}
              </DropdownItem>
              {canUseEqualizer ? (
                <DropdownItem onClick={onOpenEqualizer} icon="IC-equalizer">Эквалайзер</DropdownItem>
              ) : null}
            </Dropdown>
          ) : isAuthenticated && isMobileDevice ? (
            <button title={lang?.add_to_playlist || 'В плейлист'} type="button" onClick={onAddToPlaylist} className="group block cursor-pointer duration-300 active:scale-95">
              <Icon name="IC-plus" className="h-9 w-9 fill-white duration-300 group-hover:fill-zinc-300" />
            </button>
          ) : !isAuthenticated && !isMobileDevice && canUseEqualizer ? (
            <button title="Эквалайзер" type="button" onClick={onOpenEqualizer} className="group block cursor-pointer duration-300 active:scale-95">
              <Icon name="IC-equalizer" className="h-9 w-9 fill-white duration-300 group-hover:fill-zinc-300" />
            </button>
          ) : null}
        </div>

        <button type="button" onClick={onPrev}>
          <Icon name="IC-moveback" className="h-10 w-10 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
        </button>
        <button type="button" onClick={onTogglePlay} className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95">
          <Icon name={isPlaying ? 'IC-pause' : 'IC-play'} className="h-12 w-12 fill-white" />
        </button>
        <button type="button" onClick={onNext}>
          <Icon name="IC-moveforward" className="h-10 w-10 cursor-pointer fill-white duration-300 hover:fill-zinc-300 active:scale-95" />
        </button>

        {isAuthenticated ? (
          <button id="player_likebutton" type="button" onClick={onLike} className="ml-6 cursor-pointer duration-300 active:scale-95">
            <Icon
              name={activeLike ? 'IC-heart-filled' : 'IC-heart'}
              className={cn('h-9 w-9 duration-300 hover:fill-zinc-300', activeLike ? 'fill-pink-400' : 'fill-white')}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
