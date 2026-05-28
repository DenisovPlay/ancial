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

const BUILTIN_PLAYLIST_TITLES: Record<string, string> = {
  '-1': 'Топ',
  '-2': 'Новинки',
  '-5': 'Избранное',
};

const BUILTIN_PLAYLIST_DESCRIPTIONS: Record<string, string> = {
  '-1': 'Самые популярные треки Ancial Pulse.',
  '-2': 'Новые треки Ancial Pulse.',
  '-5': 'Ваши избранные треки в Ancial Pulse.',
};

const BUILTIN_PLAYLIST_META: Record<string, PulsePlaylistMeta> = {
  '-1': {
    artist: '',
    creator: 'Pulse',
    desk: 'Лучшие песни',
    genlist: 'Top',
    id: '-1',
    img: '/includes/img/pulse/cover/top.png',
    likes: '0',
    name: 'Топ',
    type: '4',
  },
  '-2': {
    artist: '',
    creator: 'Pulse',
    desk: 'Громкие новинки',
    genlist: 'New',
    id: '-2',
    img: '/includes/img/pulse/cover/new.png',
    likes: '0',
    name: 'Новое',
    type: '4',
  },
  '-5': {
    artist: '',
    creator: 'Pulse',
    desk: 'Ваши избранные треки в Ancial Pulse.',
    genlist: 'Your',
    id: '-5',
    img: '/includes/img/pulse/cover/your.png',
    likes: '0',
    name: 'Избранное',
    type: '4',
  },
};

export function normalizePulsePlaylistId(value: string | number | null | undefined) {
  const normalizedValue = String(value ?? '').trim();
  if (!/^-?\d+$/.test(normalizedValue)) {
    return '0';
  }

  return normalizedValue;
}

export function isPulseBuiltinGeneratedPlaylist(value: string | number | null | undefined) {
  return Object.prototype.hasOwnProperty.call(GENERATED_PLAYLISTS, normalizePulsePlaylistId(value));
}

export function getPulseBuiltinPlaylistTitle(value: string | number | null | undefined) {
  return BUILTIN_PLAYLIST_TITLES[normalizePulsePlaylistId(value)] ?? '';
}

export function getPulseBuiltinPlaylistDescription(value: string | number | null | undefined) {
  return BUILTIN_PLAYLIST_DESCRIPTIONS[normalizePulsePlaylistId(value)] ?? '';
}

export function getPulseBuiltinPlaylistMeta(value: string | number | null | undefined) {
  const playlist = BUILTIN_PLAYLIST_META[normalizePulsePlaylistId(value)];
  return playlist ? { ...playlist } : null;
}

export function getPulseBuiltinPlaylistCover(value: string | number | null | undefined) {
  return BUILTIN_PLAYLIST_META[normalizePulsePlaylistId(value)]?.img ?? '';
}

export function getPulsePlaylistTrackParams(
  value: string | number,
  playlist?: Pick<PulsePlaylistMeta, 'genlist' | 'type'> | null,
) {
  const playlistId = normalizePulsePlaylistId(value);
  const genlist = String(playlist?.genlist ?? GENERATED_PLAYLISTS[playlistId] ?? '').trim();
  const type = Number.parseInt(String(playlist?.type ?? 0), 10);

  if (type === 4 || genlist) {
    return { gid: genlist };
  }

  return { pid: playlistId };
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

  payload.set('name', String(input.name ?? '').trim() || 'Неизвестный трек');
  payload.set('artist', String(input.artist ?? '').trim() || 'Неизвестный исполнитель');
  payload.set('img', String(input.image ?? '').trim());
  payload.set('lang', lang || '--');
  payload.set('explicit', explicit === '' ? '0' : explicit);
  payload.set('id', String(input.trackId ?? '').trim());
  payload.set('src', String(input.trackId ?? '').trim());
  payload.set('genre', '');
  payload.set('artists_ids', '');
  payload.set('duration', '0');

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

export type PulseUploadDropzoneVisibilityInput = {
  isAudioUploading: boolean;
  isEditingExistingTrack: boolean;
  trackId?: string | number | null;
};

export function getPulseUploadDropzoneVisible(input: PulseUploadDropzoneVisibilityInput) {
  return !input.isEditingExistingTrack
    && !input.isAudioUploading
    && !String(input.trackId ?? '').trim();
}
