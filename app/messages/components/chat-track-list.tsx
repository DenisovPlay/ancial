'use client';

import { useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { useUserCountry } from '../../lib/user-geo';
import { PulseTrackRow, TracksPanelSkeleton } from '../../pulse/pulse-components';
import { usePulseTrackActions } from '../../pulse/use-pulse-track-actions';
import { useTrackById } from '../lib/use-track-by-id';

type Actions = ReturnType<typeof usePulseTrackActions>;

function ChatTrackRow({ actions, index, trackId }: { actions: Actions; index: number; trackId: number }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { currentSongId, playTrack } = usePulsePlayer();
  const userCountry = useUserCountry();
  const { error, track } = useTrackById(trackId);

  if (error) return null;
  if (!track) return <TracksPanelSkeleton rows={1} />;
  return (
    <PulseTrackRow
      currentSongId={currentSongId}
      isAuthenticated={isAuthenticated}
      onAddToPlaylist={actions.openAddTrackToPlaylist}
      onCopyTrackLink={actions.copyTrackLink}
      onOpenArtist={(artistId) => router.push(`/pulse/artist/${encodeURIComponent(artistId)}`)}
      onPlayTrack={(nextTrack) => void playTrack(nextTrack.sid ?? 0)}
      onQueueTrackNext={(id) => actions.playNextTrack(id)}
      onReportTrack={actions.reportTrack}
      track={track}
      trackIndex={index}
      user={user}
      userCountry={userCountry}
    />
  );
}

/**
 * Треки из переписки — тем же компонентом строки, что в плейлистах Pulse (лайк/свайп, меню, «следующим», радио).
 * Без своей карточки: окно «Информация о чате» уже карточка, вложенный блок только удваивал бы рамки и отступы.
 * Хуки действий монтируются только когда экран открыт.
 */
export default function ChatTrackList({ trackIds }: { trackIds: number[] }) {
  const actions = usePulseTrackActions();
  return (
    <>
      {trackIds.map((trackId, index) => (
        <ChatTrackRow key={`${trackId}-${index}`} actions={actions} index={index} trackId={trackId} />
      ))}
      {actions.modals}
    </>
  );
}
