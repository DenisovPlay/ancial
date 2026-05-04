export type PulsePlaylistMeta = {
  artist?: string | null;
  creator?: string | null;
  desk?: string | null;
  genlist?: string | null;
  id?: number | string | null;
  img?: string | null;
  is_liked?: boolean | number | string | null;
  likes?: number | string | null;
  name?: string | null;
  type?: number | string | null;
  who_liked?: string | null;
};

export type PulsePlaylistTrackMeta = {
  listens?: number | string | null;
};

export type PulsePlaylistActionTarget = {
  forceReload: boolean;
  id: string;
  kind: 'genlist' | 'playlist';
  shuffle: 0 | 1;
};

const GENERATED_PLAYLISTS: Record<string, string> = {
  '-1': 'Top',
  '-2': 'New',
  '-5': 'Your',
};

export function normalizePulsePlaylistId(value: string | number | null | undefined) {
  const normalizedValue = String(value ?? '').trim();
  if (!/^-?\d+$/.test(normalizedValue)) {
    return '0';
  }

  return normalizedValue;
}

export function getPulsePlaylistTrackEndpoint(
  value: string | number,
  playlist?: Pick<PulsePlaylistMeta, 'genlist' | 'type'> | null,
) {
  const playlistId = normalizePulsePlaylistId(value);
  const genlist = String(playlist?.genlist ?? GENERATED_PLAYLISTS[playlistId] ?? '').trim();
  const type = Number.parseInt(String(playlist?.type ?? 0), 10);

  if (type === 4 || genlist) {
    return `/api/pulse/getPlaylist.php?gid=${encodeURIComponent(genlist)}`;
  }

  return `/api/pulse/getPlaylist.php?pid=${encodeURIComponent(playlistId)}`;
}

export function canViewPulsePlaylist(
  playlist: Pick<PulsePlaylistMeta, 'genlist' | 'type'> | null | undefined,
  isAuthenticated: boolean,
) {
  if (!playlist) return false;

  const type = Number.parseInt(String(playlist.type ?? 0), 10);
  const genlist = String(playlist.genlist ?? '').trim();
  const isPrivatePlaylist = type === 3 || genlist === 'Your';

  return !isPrivatePlaylist || isAuthenticated;
}

export function canUploadToPulseFavoritesPlaylist(
  value: string | number,
  playlist: Pick<PulsePlaylistMeta, 'genlist' | 'type'> | null | undefined,
) {
  const playlistId = normalizePulsePlaylistId(value);
  const type = Number.parseInt(String(playlist?.type ?? 0), 10);
  const genlist = String(playlist?.genlist ?? GENERATED_PLAYLISTS[playlistId] ?? '').trim();

  return playlistId === '-5' || type === 3 || genlist === 'Your';
}

export function getPulsePlaylistMetaEndpoint(value: string | number) {
  return `/api/pulse/pages/playlist.php?id=${encodeURIComponent(normalizePulsePlaylistId(value))}`;
}

export function getPulsePlaylistCacheKey(value: string | number) {
  return `playlist_${normalizePulsePlaylistId(value)}`;
}

export function getPulsePlaylistTracksCacheKey(
  value: string | number,
  playlist: Pick<PulsePlaylistMeta, 'genlist' | 'type'> | null | undefined,
  artistId?: string | number | null,
) {
  const playlistId = normalizePulsePlaylistId(value);
  const genlist = String(playlist?.genlist ?? GENERATED_PLAYLISTS[playlistId] ?? '').trim();
  const type = Number.parseInt(String(playlist?.type ?? 0), 10);

  if (type === 4 || genlist) {
    return `playlist_tracks_gid_${genlist}`;
  }

  if (type === 5 && artistId != null) {
    return `playlist_tracks_aid_${String(artistId).trim()}`;
  }

  return `playlist_tracks_${playlistId}`;
}

export function getPulsePlaylistActionTarget(
  value: string | number,
  playlist: Pick<PulsePlaylistMeta, 'genlist' | 'type'> | null | undefined,
  options: { shuffle?: boolean } = {},
): PulsePlaylistActionTarget {
  const playlistId = normalizePulsePlaylistId(value);
  const genlist = String(playlist?.genlist ?? GENERATED_PLAYLISTS[playlistId] ?? '').trim();
  const type = Number.parseInt(String(playlist?.type ?? 0), 10);
  const isGenlist = type === 4 || Boolean(genlist);
  const shuffle = options.shuffle ? 1 : 0;

  return {
    forceReload: options.shuffle === true,
    id: isGenlist ? genlist : playlistId,
    kind: isGenlist ? 'genlist' : 'playlist',
    shuffle,
  };
}

export function getPulsePlaylistListenTotal(tracks: PulsePlaylistTrackMeta[]) {
  return tracks.reduce((sum, track) => {
    const listens = Number.parseInt(String(track.listens ?? 0), 10);
    return sum + (Number.isFinite(listens) ? listens : 0);
  }, 0);
}

export type PulseTrackUploadPayloadInput = {
  artist?: string | null;
  explicit?: boolean | number | string | null;
  image?: string | null;
  lang?: string | null;
  name?: string | null;
  trackId: string | number;
};

export function getPulseTrackUploadPayload(input: PulseTrackUploadPayloadInput) {
  const payload = new URLSearchParams();
  const explicit = String(input.explicit ?? '').trim();
  const lang = String(input.lang ?? '').trim();

  payload.set('trackname', String(input.name ?? '').trim() || 'Неизвестный трек');
  payload.set('trackartist', String(input.artist ?? '').trim() || 'Неизвестный исполнитель');
  payload.set('trackimg', String(input.image ?? '').trim());
  payload.set('tracklang', lang || '--');
  payload.set('trackexp', explicit === '' ? '0' : explicit);
  payload.set('trackid', String(input.trackId ?? '').trim());

  return payload;
}
