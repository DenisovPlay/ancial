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

export type PulseTrackOwnerMeta = {
  uploaded_by?: number | string | null;
};

export type PulseTrackEditMeta = {
  artist?: string | null;
  artwork?: Array<{ src?: string | null }> | null;
  explicit?: boolean | number | string | null;
  lang?: string | null;
  sid?: number | string | null;
  title?: string | null;
};

export type PulseTrackOwnerUserMeta = {
  id?: number | string | null;
};

export type PulseTrackEditInitialState = {
  artist: string;
  explicit: string;
  image: string;
  lang: string;
  name: string;
  trackId: string;
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

export function getPulseTrackDropdownZIndex(trackIndex: number, isOpen: boolean) {
  if (isOpen) {
    return 1200;
  }

  const normalizedIndex = Number.isFinite(trackIndex) ? Math.max(0, Math.floor(trackIndex)) : 0;

  return Math.max(1, 999 - (normalizedIndex + 1));
}

export function canManagePulseTrack(
  track: PulseTrackOwnerMeta | null | undefined,
  user: PulseTrackOwnerUserMeta | null | undefined,
) {
  const uploadedBy = Number.parseInt(String(track?.uploaded_by ?? ''), 10);
  const userId = Number.parseInt(String(user?.id ?? ''), 10);

  return Number.isFinite(uploadedBy) && uploadedBy > 0 && uploadedBy === userId;
}

export function getPulseTrackEditInitialState(track: PulseTrackEditMeta): PulseTrackEditInitialState {
  const artwork = Array.isArray(track.artwork) ? track.artwork : [];
  const cover = artwork.find((item) => String(item?.src ?? '').trim());
  const explicit = track.explicit === true || String(track.explicit ?? '') === '1';

  return {
    artist: String(track.artist ?? '').trim(),
    explicit: explicit ? '1' : '0',
    image: String(cover?.src ?? '').trim(),
    lang: String(track.lang ?? '').trim() || '--',
    name: String(track.title ?? '').trim(),
    trackId: String(track.sid ?? '').trim(),
  };
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

export type PulsePlaylistManagePayloadInput = {
  id?: number | string | null;
  image?: string | null;
  name?: string | null;
};

export function getPulsePlaylistManagePayload(input: PulsePlaylistManagePayloadInput) {
  const payload = new URLSearchParams();
  const id = String(input.id ?? '').trim();
  const image = String(input.image ?? '').trim();

  payload.set('action', id ? 'update' : 'create');
  payload.set('name', String(input.name ?? '').trim());

  if (id) {
    payload.set('id', id);
  }

  if (image) {
    payload.set('img', image);
  }

  return payload;
}
