'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '../../components/modal';
import { useAuth } from '../../context/AuthContext';
import { usePulsePlayer, type PulseTrack } from '../../context/PulsePlayerContext';
import { useUserCountry } from '../../lib/user-geo';
import { PulseTrackRow } from '../pulse-components';
import { usePulseTrackActions } from '../use-pulse-track-actions';
import Icon from '../../components/svg-icon';

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

/** Список очереди: тот же компонент строки, что в плейлистах; свайп вправо — следующим, влево — убрать. Монтируется только при открытом окне (хуки действий не грузят лишнего в фоне). */
function QueueList({
  centerCurrentRow,
  currentIndex,
  lang,
  onMoveTrack,
  onPlayTrack,
  onRemoveTrack,
  playlist,
}: Pick<PulseQueueModalProps, 'currentIndex' | 'lang' | 'onMoveTrack' | 'onPlayTrack' | 'onRemoveTrack' | 'playlist'> & { centerCurrentRow: (row: HTMLDivElement | null) => void }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { currentSongId } = usePulsePlayer();
  const userCountry = useUserCountry();
  const actions = usePulseTrackActions();

  return (
    <div className="flex flex-col gap-3">
      {playlist.map((track, i) => {
        const isCurrent = i === currentIndex;
        // «Вверх очереди» = сразу после играющего; для уже сыгранных вставка идёт с учётом сдвига.
        const nextSlot = i > currentIndex ? currentIndex + 1 : currentIndex;
        const canMoveUp = !isCurrent && i !== currentIndex + 1;
        return (
          <div key={`${track.sid || i}-${i}`} ref={isCurrent ? centerCurrentRow : undefined}>
            <PulseTrackRow
              currentSongId={currentSongId}
              trailing={(
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={lang?.pulse_queue_move_up || 'Переместить выше'}
                    data-tip={lang?.pulse_queue_move_up || 'Переместить выше'}
                    disabled={i === 0}
                    onClick={() => onMoveTrack(i, i - 1)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 hover:border-zinc-600/30 hover:bg-zinc-700/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-transparent disabled:hover:bg-transparent"
                  >
                    <Icon name="IC-chevron-down" className="h-5 w-5 rotate-180 fill-white" />
                  </button>
                  <button
                    type="button"
                    aria-label={lang?.pulse_queue_move_down || 'Переместить ниже'}
                    data-tip={lang?.pulse_queue_move_down || 'Переместить ниже'}
                    disabled={i === playlist.length - 1}
                    onClick={() => onMoveTrack(i, i + 1)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 hover:border-zinc-600/30 hover:bg-zinc-700/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-transparent disabled:hover:bg-transparent"
                  >
                    <Icon name="IC-chevron-down" className="h-5 w-5 fill-white" />
                  </button>
                  <button
                    type="button"
                    aria-label={lang?.pulse_queue_remove || 'Удалить из очереди'}
                    data-tip={lang?.pulse_queue_remove || 'Удалить из очереди'}
                    onClick={() => onRemoveTrack(i)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 hover:border-zinc-600/30 hover:bg-rose-500/20 active:scale-95"
                  >
                    <Icon name="IC-trash" className="h-5 w-5 fill-white" />
                  </button>
                </div>
              )}
              highlighted={isCurrent}
              isAuthenticated={isAuthenticated}
              onAddToPlaylist={actions.openAddTrackToPlaylist}
              onCopyTrackLink={actions.copyTrackLink}
              onOpenArtist={(artistId) => router.push(`/pulse/artist/${encodeURIComponent(artistId)}`)}
              onPlayTrack={() => onPlayTrack(i)}
              onQueueTrackNext={(trackId) => actions.playNextTrack(trackId)}
              onReportTrack={actions.reportTrack}
              swipeLeft={{ icon: 'IC-trash', onTrigger: () => onRemoveTrack(i), tone: 'rose' }}
              swipeRight={{ icon: 'IC-chart-hor', onTrigger: () => { if (canMoveUp) onMoveTrack(i, nextSlot); }, tone: 'purple' }}
              track={track}
              trackIndex={i}
              user={user}
              userCountry={userCountry}
            />
          </div>
        );
      })}
      {actions.modals}
    </div>
  );
}

export function PulseQueueModal({
  isOpen,
  onClose,
  playlist,
  currentIndex,
  lang,
  onPlayTrack,
  onRemoveTrack,
  onMoveTrack,
}: PulseQueueModalProps) {
  // Строка играющего трека монтируется уже после открытия окна (Modal рисует содержимое на следующем кадре),
  // поэтому прокрутку делаем в ref-колбэке строки, а не в эффекте по isOpen. Крутим только список окна
  // (scrollIntoView дёргал бы ещё и страницу под ним).
  const centerCurrentRow = useCallback((row: HTMLDivElement | null) => {
    const scroller = row?.closest<HTMLElement>('.overflow-y-auto');
    if (!row || !scroller) return;
    const center = () => {
      if (!row.isConnected) return;
      const rowRect = row.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      // Играющий трек — вверху списка, сразу под шапкой окна (её высота = верхний отступ области прокрутки).
      scroller.scrollTop += rowRect.top - scrollerRect.top - (parseFloat(getComputedStyle(scroller).paddingTop) || 0);
    };
    // Строки списка — те же, что в плейлистах (content-visibility: auto): высота дальних уточняется по мере отрисовки,
    // поэтому выравниваем сразу и ещё несколько раз, пока размеры не устоялись (окно при этом ещё выезжает).
    center();
    requestAnimationFrame(center);
    window.setTimeout(center, 120);
    window.setTimeout(center, 360);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang?.pulse_queue_title || 'Очередь воспроизведения'}
      width="md"
    >
      <div className="flex flex-col gap-3 pb-2">
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400">
            <Icon name="IC-list-ul" className="mb-2 h-12 w-12 fill-zinc-600" />
            <p className="text-sm font-medium">{lang?.pulse_queue_empty || 'Очередь воспроизведения пуста'}</p>
          </div>
        ) : (
          <QueueList
            centerCurrentRow={centerCurrentRow}
            currentIndex={currentIndex}
            lang={lang}
            onMoveTrack={onMoveTrack}
            onPlayTrack={onPlayTrack}
            onRemoveTrack={onRemoveTrack}
            playlist={playlist}
          />
        )}
      </div>
    </Modal>
  );
}
