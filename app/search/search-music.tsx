'use client';

import { useRouter } from 'next/navigation';

import { usePulsePlayer } from '../context/PulsePlayerContext';
import { useAuth } from '../context/AuthContext';
import { useUserCountry } from '../lib/user-geo';
import {
  PulseArtistTile,
  PulsePlaylistTile,
  PulseTrackRow,
  type PulseArtistCardData,
  type PulsePlaylistCardData,
  type PulseTrack,
} from '../pulse/pulse-components';
import { usePulseTrackActions } from '../pulse/use-pulse-track-actions';
import { SearchRail, SearchSection } from './search-parts';

export interface MusicBundle {
  artists: PulseArtistCardData[];
  playlists: PulsePlaylistCardData[];
  tracks: PulseTrack[];
}

type Lang = Record<string, string> | null | undefined;

/**
 * Музыка в выдаче. `compact` — виджет над сайтами (три трека и лента исполнителей),
 * иначе вкладка «Музыка»: все треки, исполнители и плейлисты.
 */
export default function SearchMusic({ compact, data, lang, onMore }: { compact: boolean; data: MusicBundle; lang: Lang; onMore?: () => void }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { currentSongId, playGenlist, playPlaylist, playTrack } = usePulsePlayer();
  const userCountry = useUserCountry();
  const actions = usePulseTrackActions();
  const tracks = compact ? data.tracks.slice(0, 3) : data.tracks;
  const artists = compact ? data.artists.slice(0, 12) : data.artists;
  const playlists = compact ? [] : data.playlists;

  const playCard = (card: PulsePlaylistCardData) => {
    if (String(card.type ?? '') === '4') void playGenlist(String(card.genlist ?? ''));
    else void playPlaylist(String(card.id ?? ''));
  };

  return (
    <div className="flex w-full flex-col gap-3">
      {tracks.length > 0 ? (
        <SearchSection title={lang?.search_tab_music || 'Музыка'} lang={lang} onMore={compact ? onMore : undefined}>
          {/* Тот же компонент строки, что в поиске Pulse: лайк, «в плейлист», ссылка, жалоба, следующий в очереди. */}
          <div className="flex w-full flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
            {tracks.map((track, index) => (
              <PulseTrackRow
                currentSongId={currentSongId}
                favoriteIds={actions.favoriteIds}
                isAuthenticated={isAuthenticated}
                key={`search-track-${track.sid ?? index}`}
                onAddToPlaylist={actions.openAddTrackToPlaylist}
                onCopyTrackLink={actions.copyTrackLink}
                onLikeTrack={actions.likeTrack}
                onOpenArtist={(artistId) => router.push(`/pulse/artist/${encodeURIComponent(artistId)}`)}
                onPlayTrack={(nextTrack) => void playTrack(nextTrack.sid ?? 0)}
                onQueueTrackNext={(trackId) => actions.playNextTrack(trackId)}
                onReportTrack={actions.reportTrack}
                track={track}
                trackIndex={index}
                user={user}
                userCountry={userCountry}
              />
            ))}
          </div>
        </SearchSection>
      ) : null}
      {artists.length > 0 ? (
        <SearchSection title={lang?.search_artists || 'Исполнители'} lang={lang}>
          <SearchRail>
            {artists.map((artist) => (
              <PulseArtistTile key={String(artist.id)} artist={artist} onOpen={() => router.push(`/pulse/artist/${encodeURIComponent(String(artist.id))}`)} />
            ))}
          </SearchRail>
        </SearchSection>
      ) : null}
      {playlists.length > 0 ? (
        <SearchSection title={lang?.search_playlists || 'Плейлисты'} lang={lang}>
          <SearchRail>
            {playlists.map((card) => (
              <PulsePlaylistTile key={String(card.id)} card={card} isPlaying={false} onOpen={() => router.push(`/pulse/playlist/${encodeURIComponent(String(card.id))}`)} onPlay={() => playCard(card)} />
            ))}
          </SearchRail>
        </SearchSection>
      ) : null}
      {actions.modals}
    </div>
  );
}
