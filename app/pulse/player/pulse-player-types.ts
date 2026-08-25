/** Общие типы и константы плеера Pulse (вынесены из PulsePlayerContext). */

export type PulseArtwork = {
  sizes?: string | null;
  src?: string | null;
  type?: string | null;
};

export type PulseTrack = {
  album?: string | null;
  albumid?: number | string | null;
  artist?: string | null;
  artwork?: PulseArtwork[] | null;
  blockedin?: string[] | string | null;
  explicit?: boolean | number | string | null;
  sid?: number | string | null;
  src?: string | null;
  status?: number | string | null;
  title?: string | null;
  mood?: string | null;
};

export type PulseCollectionKind = 'artist' | 'downloads' | 'genlist' | 'playlist' | 'track';

/** Идентификатор виртуальной коллекции «Сохранённые» (треки из IndexedDB) */
export const DOWNLOADS_COLLECTION_ID = 'downloads';

export type PulsePlayerMode = 'full' | 'mini';

export type PulsePlayerState = {
  currentSongId: number;
  isPlaylist: boolean;
  listenCounted: boolean;
  listenedCounted: boolean;
  playlistId: string;
};
